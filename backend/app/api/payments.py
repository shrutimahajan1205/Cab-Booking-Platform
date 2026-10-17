from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import User, Ride, Payment, Driver
from app.schemas.all_schemas import PaymentIntentRequest, PaymentOut
from app.services.payment_service import create_stripe_payment_intent, verify_webhook_event
from app.services.receipt_service import generate_pdf_receipt

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/create-intent")
async def create_payment_intent(
    req: PaymentIntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Ride).where(Ride.id == req.ride_id))
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    amount = ride.fare_actual or ride.fare_estimate
    intent_data = create_stripe_payment_intent(
        amount=amount,
        currency="inr",
        metadata={"ride_id": str(ride.id), "rider_id": str(current_user.id)}
    )

    # Check if payment row exists
    pay_res = await db.execute(select(Payment).where(Payment.ride_id == ride.id))
    payment = pay_res.scalars().first()
    if not payment:
        payment = Payment(
            ride_id=ride.id,
            stripe_payment_intent_id=intent_data.get("id"),
            amount=amount,
            status="pending",
            payment_method="stripe"
        )
        db.add(payment)
    else:
        payment.stripe_payment_intent_id = intent_data.get("id")
        payment.amount = amount

    await db.commit()
    return intent_data

@router.post("/pay-with-wallet")
async def pay_with_wallet(
    req: PaymentIntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Ride).where(Ride.id == req.ride_id))
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    fare = ride.fare_actual or ride.fare_estimate
    if current_user.wallet_balance < fare:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance.")

    current_user.wallet_balance -= fare
    ride.status = "completed"
    ride.fare_actual = fare

    pay_res = await db.execute(select(Payment).where(Payment.ride_id == ride.id))
    payment = pay_res.scalars().first()
    if not payment:
        payment = Payment(
            ride_id=ride.id,
            amount=fare,
            status="succeeded",
            payment_method="wallet"
        )
        db.add(payment)
    else:
        payment.status = "succeeded"
        payment.payment_method = "wallet"

    await db.commit()
    return {"message": "Payment successful via wallet", "remaining_balance": current_user.wallet_balance}

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db)
):
    payload = await request.body()
    try:
        event = verify_webhook_event(payload, stripe_signature)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    if event_type in ["payment_intent.succeeded", "checkout.session.completed"]:
        intent_id = data_object.get("id")
        metadata = data_object.get("metadata", {})
        ride_id = metadata.get("ride_id")

        if ride_id:
            res = await db.execute(select(Payment).where(Payment.ride_id == int(ride_id)))
            payment = res.scalars().first()
            if payment:
                payment.status = "succeeded"
                ride_res = await db.execute(select(Ride).where(Ride.id == int(ride_id)))
                ride = ride_res.scalars().first()
                if ride:
                    ride.status = "completed"
            await db.commit()

    return {"status": "success"}

@router.get("/receipt/{ride_id}")
async def download_receipt(
    ride_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Ride)
        .where(Ride.id == ride_id)
        .options(selectinload(Ride.rider), selectinload(Ride.driver).selectinload(Driver.user))
    )
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    ride_dict = {
        "id": ride.id,
        "completed_at": ride.completed_at.strftime('%b %d, %Y - %I:%M %p') if ride.completed_at else None,
        "rider_name": ride.rider.name if ride.rider else "Passenger",
        "driver_name": ride.driver.user.name if ride.driver and ride.driver.user else "Cab Driver",
        "vehicle_info": ride.driver.vehicle_info if ride.driver else "Sedan",
        "vehicle_type": ride.vehicle_type,
        "distance_km": ride.distance_km,
        "duration_mins": ride.duration_mins,
        "pickup_name": ride.pickup_name,
        "drop_name": ride.drop_name,
        "fare_actual": ride.fare_actual or ride.fare_estimate,
        "discount_amount": ride.discount_amount or 0.0,
        "promo_code": ride.promo_code
    }

    pdf_bytes = generate_pdf_receipt(ride_dict)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Ride_Receipt_{ride_id}.pdf"
        }
    )

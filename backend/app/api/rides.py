from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import User, Driver, Ride, PromoCode, Payment
from app.schemas.all_schemas import (
    RideEstimateRequest, RideEstimateResponse, RideTier,
    RideCreate, RideOut, RideStatusUpdate, DriverOut
)
from app.services.maps_service import estimate_trip
from app.services.matching_service import find_nearby_drivers
from app.services.simulation_service import start_simulation_task
from app.sockets.manager import ws_manager

router = APIRouter(prefix="/rides", tags=["Rides"])

@router.post("/estimate", response_model=RideEstimateResponse)
async def estimate_ride_post(req: RideEstimateRequest, db: AsyncSession = Depends(get_db)):
    estimate = estimate_trip(req.pickup_lat, req.pickup_lng, req.drop_lat, req.drop_lng)

    discount_amount = 0.0
    applied_promo = None
    if req.promo_code:
        promo_res = await db.execute(select(PromoCode).where(PromoCode.code == req.promo_code.upper(), PromoCode.active == True))
        promo = promo_res.scalars().first()
        if promo:
            applied_promo = promo.code
            for tier in estimate["tiers"]:
                calc_discount = min(tier["price"] * (promo.discount_percent / 100.0), promo.max_discount)
                tier["discount"] = round(calc_discount, 2)
                tier["price"] = round(max(10.0, tier["price"] - calc_discount), 2)
                discount_amount = tier["discount"]

    return RideEstimateResponse(
        distance_km=estimate["distance_km"],
        duration_mins=estimate["duration_mins"],
        tiers=estimate["tiers"],
        applied_promo=applied_promo,
        discount_amount=discount_amount
    )

@router.get("/estimate", response_model=RideEstimateResponse)
async def estimate_ride_get(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    promo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    req = RideEstimateRequest(
        pickup_lat=origin_lat,
        pickup_lng=origin_lng,
        drop_lat=dest_lat,
        drop_lng=dest_lng,
        promo_code=promo
    )
    return await estimate_ride_post(req, db)

@router.post("/request", response_model=RideOut)
async def create_ride_request(
    ride_in: RideCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Calculate estimate for the selected tier
    est = estimate_trip(ride_in.pickup_lat, ride_in.pickup_lng, ride_in.drop_lat, ride_in.drop_lng)
    selected_tier = next((t for t in est["tiers"] if t["tier_name"].lower() == ride_in.vehicle_type.lower()), est["tiers"][0])

    fare = selected_tier["price"]
    discount = 0.0
    promo_code = None

    if ride_in.promo_code:
        promo_res = await db.execute(select(PromoCode).where(PromoCode.code == ride_in.promo_code.upper(), PromoCode.active == True))
        p = promo_res.scalars().first()
        if p:
            promo_code = p.code
            discount = min(fare * (p.discount_percent / 100.0), p.max_discount)
            fare = max(10.0, fare - discount)

    new_ride = Ride(
        rider_id=current_user.id,
        pickup_name=ride_in.pickup_name,
        pickup_lat=ride_in.pickup_lat,
        pickup_lng=ride_in.pickup_lng,
        drop_name=ride_in.drop_name,
        drop_lat=ride_in.drop_lat,
        drop_lng=ride_in.drop_lng,
        vehicle_type=ride_in.vehicle_type,
        fare_estimate=round(fare, 2),
        distance_km=est["distance_km"],
        duration_mins=est["duration_mins"],
        promo_code=promo_code,
        discount_amount=round(discount, 2),
        status="requested"
    )
    db.add(new_ride)
    await db.commit()
    await db.refresh(new_ride)

    # Broadcast to nearby active drivers
    nearby_drivers = await find_nearby_drivers(db, ride_in.pickup_lat, ride_in.pickup_lng)
    request_payload = {
        "ride_id": new_ride.id,
        "pickup_name": new_ride.pickup_name,
        "drop_name": new_ride.drop_name,
        "fare": new_ride.fare_estimate,
        "distance_km": new_ride.distance_km,
        "duration_mins": new_ride.duration_mins,
        "vehicle_type": new_ride.vehicle_type,
        "rider_name": current_user.name
    }

    for d in nearby_drivers:
        await ws_manager.send_to_driver(d["id"], "new_ride_request", request_payload)

    # Also broadcast globally to active drivers
    await ws_manager.broadcast_to_all_drivers("new_ride_request", request_payload)

    ride_out = RideOut.model_validate(new_ride)
    ride_out.rider_name = current_user.name
    return ride_out

@router.get("/history", response_model=List[RideOut])
async def get_ride_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == "driver":
        d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
        d = d_res.scalars().first()
        driver_id = d.id if d else -1
        query = select(Ride).where(Ride.driver_id == driver_id).order_by(Ride.created_at.desc())
    else:
        query = select(Ride).where(Ride.rider_id == current_user.id).order_by(Ride.created_at.desc())

    result = await db.execute(query.options(selectinload(Ride.rider), selectinload(Ride.driver).selectinload(Driver.user)))
    rides = result.scalars().all()

    outs = []
    for r in rides:
        o = RideOut.model_validate(r)
        if r.rider:
            o.rider_name = r.rider.name
        if r.driver and r.driver.user:
            o.driver_info = DriverOut(
                id=r.driver.id,
                user_id=r.driver.user_id,
                name=r.driver.user.name,
                phone=r.driver.user.phone,
                vehicle_info=r.driver.vehicle_info,
                vehicle_type=r.driver.vehicle_type,
                verified=r.driver.verified,
                current_lat=r.driver.current_lat,
                current_lng=r.driver.current_lng,
                status=r.driver.status,
                rating_avg=r.driver.user.rating_avg or 5.0
            )
        outs.append(o)
    return outs

@router.get("/{ride_id}", response_model=RideOut)
async def get_ride_by_id(ride_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Ride)
        .where(Ride.id == ride_id)
        .options(selectinload(Ride.rider), selectinload(Ride.driver).selectinload(Driver.user))
    )
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    o = RideOut.model_validate(ride)
    if ride.rider:
        o.rider_name = ride.rider.name
    if ride.driver and ride.driver.user:
        o.driver_info = DriverOut(
            id=ride.driver.id,
            user_id=ride.driver.user_id,
            name=ride.driver.user.name,
            phone=ride.driver.user.phone,
            vehicle_info=ride.driver.vehicle_info,
            vehicle_type=ride.driver.vehicle_type,
            verified=ride.driver.verified,
            current_lat=ride.driver.current_lat,
            current_lng=ride.driver.current_lng,
            status=ride.driver.status,
            rating_avg=ride.driver.user.rating_avg or 5.0
        )
    return o

@router.get("/{ride_id}/status")
async def get_ride_status(ride_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")
    return {"ride_id": ride.id, "status": ride.status, "driver_id": ride.driver_id}

@router.post("/{ride_id}/accept")
async def accept_ride(
    ride_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalars().first()
    if not driver:
        raise HTTPException(status_code=400, detail="Only registered drivers can accept rides.")

    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    if ride.status != "requested":
        raise HTTPException(status_code=400, detail=f"Ride is already in status '{ride.status}'.")

    ride.driver_id = driver.id
    ride.status = "accepted"
    driver.status = "on_ride"
    await db.commit()

    # Notify rider via WebSocket
    driver_data = {
        "id": driver.id,
        "name": current_user.name,
        "phone": current_user.phone,
        "vehicle_info": driver.vehicle_info,
        "rating_avg": current_user.rating_avg,
        "current_lat": driver.current_lat,
        "current_lng": driver.current_lng
    }
    await ws_manager.send_to_rider(ride.rider_id, "ride_accepted", {
        "ride_id": ride.id,
        "driver": driver_data
    })

    return {"message": "Ride accepted successfully", "ride_id": ride.id, "status": "accepted"}

@router.post("/{ride_id}/status")
async def update_ride_status(
    ride_id: int,
    status_update: RideStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    ride.status = status_update.status
    if status_update.status == "completed":
        ride.fare_actual = ride.fare_estimate
        ride.completed_at = datetime.utcnow()
        if ride.driver_id:
            d_res = await db.execute(select(Driver).where(Driver.id == ride.driver_id))
            d = d_res.scalars().first()
            if d:
                d.status = "active"

    await db.commit()

    # Broadcast status change
    await ws_manager.send_to_rider(ride.rider_id, "ride_status", {
        "ride_id": ride.id,
        "status": ride.status,
        "fare": ride.fare_actual
    })
    if ride.driver_id:
        await ws_manager.send_to_driver(ride.driver_id, "ride_status", {
            "ride_id": ride.id,
            "status": ride.status
        })

    return {"ride_id": ride.id, "status": ride.status}

@router.post("/{ride_id}/simulate")
async def simulate_ride(ride_id: int):
    """Triggers realistic background movement from driver -> pickup -> drop for the demo."""
    start_simulation_task(ride_id)
    return {"message": f"Simulation initiated for ride #{ride_id}", "status": "simulating"}

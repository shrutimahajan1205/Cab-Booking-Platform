from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.entities import PromoCode
from app.schemas.all_schemas import PromoValidate

router = APIRouter(prefix="/promo", tags=["Promotions"])

@router.get("/list")
async def list_active_promos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PromoCode).where(PromoCode.active == True))
    promos = result.scalars().all()
    return [
        {
            "code": p.code,
            "discount_percent": p.discount_percent,
            "max_discount": p.max_discount,
            "min_fare": p.min_fare
        }
        for p in promos
    ]

@router.post("/validate")
async def validate_promo(val: PromoValidate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PromoCode).where(PromoCode.code == val.code.upper(), PromoCode.active == True))
    promo = result.scalars().first()
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid or expired promo code.")

    if val.fare < promo.min_fare:
        raise HTTPException(status_code=400, detail=f"Minimum fare of ₹{promo.min_fare} required to apply this code.")

    discount = min(val.fare * (promo.discount_percent / 100.0), promo.max_discount)
    final_fare = max(10.0, val.fare - discount)

    return {
        "valid": True,
        "code": promo.code,
        "discount_percent": promo.discount_percent,
        "discount_amount": round(discount, 2),
        "final_fare": round(final_fare, 2)
    }

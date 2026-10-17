from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.entities import User, Driver
from app.schemas.all_schemas import DriverOut, DriverLocationUpdate, DriverStatusUpdate
from app.services.matching_service import find_nearby_drivers
from app.core.redis_client import redis_manager

router = APIRouter(prefix="/drivers", tags=["Drivers"])

@router.get("/nearby", response_model=List[DriverOut])
async def get_nearby(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(15.0),
    vehicle_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    drivers = await find_nearby_drivers(db, lat, lng, radius_km, vehicle_type)
    return drivers

@router.get("/me", response_model=DriverOut)
async def get_my_driver_profile(
    current_user: User = Depends(require_role("driver")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found.")

    return DriverOut(
        id=driver.id,
        user_id=driver.user_id,
        name=current_user.name,
        phone=current_user.phone,
        vehicle_info=driver.vehicle_info,
        vehicle_type=driver.vehicle_type,
        verified=driver.verified,
        current_lat=driver.current_lat,
        current_lng=driver.current_lng,
        status=driver.status,
        rating_avg=current_user.rating_avg or 5.0
    )

@router.post("/location")
async def update_location(
    loc: DriverLocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    driver.current_lat = loc.lat
    driver.current_lng = loc.lng
    await db.commit()

    # Store ephemeral location in Redis/cache
    await redis_manager.set_location(driver.id, loc.lat, loc.lng)

    return {"message": "Location updated", "lat": loc.lat, "lng": loc.lng}

@router.post("/status")
async def update_status(
    status_in: DriverStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    driver.status = status_in.status
    await db.commit()
    return {"message": "Status updated", "status": driver.status}

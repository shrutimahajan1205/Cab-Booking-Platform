from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.entities import Driver, User
from app.services.maps_service import haversine_distance

async def find_nearby_drivers(
    db: AsyncSession,
    pickup_lat: float,
    pickup_lng: float,
    max_radius_km: float = 15.0,
    vehicle_type: Optional[str] = None
) -> List[dict]:
    query = (
        select(Driver)
        .where(Driver.status == "active")
        .options(selectinload(Driver.user))
    )
    if vehicle_type:
        query = query.where(Driver.vehicle_type == vehicle_type)

    result = await db.execute(query)
    drivers = result.scalars().all()

    nearby = []
    for d in drivers:
        dist = haversine_distance(pickup_lat, pickup_lng, d.current_lat, d.current_lng)
        if dist <= max_radius_km:
            nearby.append({
                "id": d.id,
                "user_id": d.user_id,
                "name": d.user.name if d.user else "Driver",
                "phone": d.user.phone if d.user else None,
                "vehicle_info": d.vehicle_info,
                "vehicle_type": d.vehicle_type,
                "verified": d.verified,
                "current_lat": d.current_lat,
                "current_lng": d.current_lng,
                "status": d.status,
                "rating_avg": d.user.rating_avg if d.user else 5.0,
                "distance_km": dist
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return nearby

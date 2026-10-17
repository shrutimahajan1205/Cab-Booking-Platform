from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.entities import User, Ride, Review, Driver
from app.schemas.all_schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["Reviews & Ratings"])

@router.post("", response_model=ReviewOut)
async def submit_review(
    rev_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ride_res = await db.execute(select(Ride).where(Ride.id == rev_in.ride_id))
    ride = ride_res.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found.")

    # Determine who is being rated
    if current_user.id == ride.rider_id:
        if not ride.driver_id:
            raise HTTPException(status_code=400, detail="Cannot review a ride with no assigned driver.")
        d_res = await db.execute(select(Driver).where(Driver.id == ride.driver_id))
        driver = d_res.scalars().first()
        rated_id = driver.user_id
    else:
        rated_id = ride.rider_id

    review = Review(
        ride_id=ride.id,
        rater_id=current_user.id,
        rated_id=rated_id,
        rating=rev_in.rating,
        comment=rev_in.comment
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)

    # Recalculate average rating for the rated user
    avg_query = select(func.avg(Review.rating)).where(Review.rated_id == rated_id)
    avg_res = await db.execute(avg_query)
    new_avg = avg_res.scalar() or 5.0

    user_res = await db.execute(select(User).where(User.id == rated_id))
    rated_user = user_res.scalars().first()
    if rated_user:
        rated_user.rating_avg = round(float(new_avg), 1)
        await db.commit()

    out = ReviewOut.model_validate(review)
    out.rater_name = current_user.name
    return out

@router.get("/user/{user_id}", response_model=List[ReviewOut])
async def get_user_reviews(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Review)
        .where(Review.rated_id == user_id)
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()

    outs = []
    for r in reviews:
        u_res = await db.execute(select(User).where(User.id == r.rater_id))
        u = u_res.scalars().first()
        o = ReviewOut.model_validate(r)
        if u:
            o.rater_name = u.name
        outs.append(o)
    return outs

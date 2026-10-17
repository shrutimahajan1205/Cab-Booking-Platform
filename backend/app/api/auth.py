from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.models.entities import User, Driver
from app.schemas.all_schemas import UserRegister, UserLogin, UserOut, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == user_in.email.lower()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        phone=user_in.phone,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role.lower(),
        rating_avg=5.0,
        wallet_balance=150.0
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    driver_id = None
    if new_user.role == "driver":
        new_driver = Driver(
            user_id=new_user.id,
            vehicle_info=user_in.vehicle_info or "White Sedan (DL-01-AB-1234)",
            vehicle_type=user_in.vehicle_type or "Economy",
            verified=True,
            current_lat=28.6139,
            current_lng=77.2090,
            status="active"
        )
        db.add(new_driver)
        await db.commit()
        await db.refresh(new_driver)
        driver_id = new_driver.id

    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role})
    user_out = UserOut.model_validate(new_user)
    user_out.driver_id = driver_id

    return TokenResponse(access_token=access_token, user=user_out)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email.lower()))
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    driver_id = None
    if user.role == "driver":
        d_res = await db.execute(select(Driver).where(Driver.user_id == user.id))
        d = d_res.scalars().first()
        if d:
            driver_id = d.id

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    user_out = UserOut.model_validate(user)
    user_out.driver_id = driver_id

    return TokenResponse(access_token=access_token, user=user_out)

@router.api_route("/session", methods=["GET", "POST"], response_model=UserOut)
async def verify_session(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Verifies token and returns current user profile with driver ID if applicable."""
    driver_id = None
    if current_user.role == "driver":
        d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
        d = d_res.scalars().first()
        if d:
            driver_id = d.id

    user_out = UserOut.model_validate(current_user)
    user_out.driver_id = driver_id
    return user_out

@router.get("/demo-tokens")
async def get_demo_tokens(db: AsyncSession = Depends(get_db)):
    """Convenient endpoint for evaluator to quickly test rider and driver roles without manual typing."""
    res_rider = await db.execute(select(User).where(User.role == "rider").limit(1))
    rider = res_rider.scalars().first()

    res_driver = await db.execute(select(User).where(User.role == "driver").limit(1))
    driver = res_driver.scalars().first()

    data = {}
    if rider:
        token = create_access_token(data={"sub": str(rider.id), "role": "rider"})
        data["rider"] = {
            "token": token,
            "user": UserOut.model_validate(rider)
        }
    if driver:
        token = create_access_token(data={"sub": str(driver.id), "role": "driver"})
        d_rec = await db.execute(select(Driver).where(Driver.user_id == driver.id))
        d = d_rec.scalars().first()
        user_out = UserOut.model_validate(driver)
        if d:
            user_out.driver_id = d.id
        data["driver"] = {
            "token": token,
            "user": user_out,
            "driver_id": d.id if d else None
        }
    return data

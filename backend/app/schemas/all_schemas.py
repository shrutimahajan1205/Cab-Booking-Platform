from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- User & Auth ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    role: str = "rider"  # 'rider' or 'driver'
    vehicle_info: Optional[str] = None
    vehicle_type: Optional[str] = "Economy"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    profile_pic: Optional[str] = None
    rating_avg: float
    wallet_balance: float
    created_at: datetime
    driver_id: Optional[int] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Driver ---
class DriverLocationUpdate(BaseModel):
    lat: float
    lng: float

class DriverStatusUpdate(BaseModel):
    status: str  # 'active', 'offline', 'on_ride'

class DriverOut(BaseModel):
    id: int
    user_id: int
    name: str
    phone: Optional[str]
    vehicle_info: str
    vehicle_type: str
    verified: bool
    current_lat: float
    current_lng: float
    status: str
    rating_avg: float
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True

# --- Ride & Estimation ---
class RideEstimateRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    promo_code: Optional[str] = None

class RideTier(BaseModel):
    tier_name: str
    price: float
    original_price: float
    discount: float
    eta_mins: int
    vehicle_icon: str
    description: str

class RideEstimateResponse(BaseModel):
    distance_km: float
    duration_mins: int
    tiers: List[RideTier]
    applied_promo: Optional[str] = None
    discount_amount: float = 0.0

class RideCreate(BaseModel):
    pickup_name: str
    pickup_lat: float
    pickup_lng: float
    drop_name: str
    drop_lat: float
    drop_lng: float
    vehicle_type: str = "Economy"
    promo_code: Optional[str] = None

class RideStatusUpdate(BaseModel):
    status: str  # 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'

class RideOut(BaseModel):
    id: int
    rider_id: int
    driver_id: Optional[int] = None
    pickup_name: str
    pickup_lat: float
    pickup_lng: float
    drop_name: str
    drop_lat: float
    drop_lng: float
    status: str
    vehicle_type: str
    fare_estimate: float
    fare_actual: Optional[float] = None
    distance_km: float
    duration_mins: int
    promo_code: Optional[str] = None
    discount_amount: float = 0.0
    created_at: datetime
    completed_at: Optional[datetime] = None
    driver_info: Optional[DriverOut] = None
    rider_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Payment ---
class PaymentIntentRequest(BaseModel):
    ride_id: int

class WalletTopUp(BaseModel):
    amount: float = Field(..., gt=0)

class PaymentOut(BaseModel):
    id: int
    ride_id: int
    stripe_payment_intent_id: Optional[str]
    amount: float
    status: str
    payment_method: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Review ---
class ReviewCreate(BaseModel):
    ride_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    ride_id: int
    rater_id: int
    rated_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    rater_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Promo ---
class PromoValidate(BaseModel):
    code: str
    fare: float

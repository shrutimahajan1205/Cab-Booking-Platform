from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="rider")  # 'rider' or 'driver'
    profile_pic = Column(String(255), nullable=True)
    rating_avg = Column(Float, default=5.0)
    wallet_balance = Column(Float, default=100.0)  # Starting balance for testing
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    driver_profile = relationship("Driver", back_populates="user", uselist=False)
    rides_as_rider = relationship("Ride", foreign_keys="Ride.rider_id", back_populates="rider")
    reviews_given = relationship("Review", foreign_keys="Review.rater_id", back_populates="rater")
    reviews_received = relationship("Review", foreign_keys="Review.rated_id", back_populates="rated")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_info = Column(String(100), nullable=False, default="Toyota Prius - White (ABC-1234)")
    vehicle_type = Column(String(30), default="Economy")  # Economy, Comfort, XL
    verified = Column(Boolean, default=True)
    current_lat = Column(Float, default=28.6139)  # Default Delhi / or customizable
    current_lng = Column(Float, default=77.2090)
    status = Column(String(20), default="active")  # 'active', 'offline', 'on_ride'
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="driver_profile")
    rides = relationship("Ride", foreign_keys="Ride.driver_id", back_populates="driver")

class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    rider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)

    pickup_name = Column(String(255), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)

    drop_name = Column(String(255), nullable=False)
    drop_lat = Column(Float, nullable=False)
    drop_lng = Column(Float, nullable=False)

    status = Column(String(30), default="requested")
    # 'requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'

    vehicle_type = Column(String(30), default="Economy")
    fare_estimate = Column(Float, nullable=False)
    fare_actual = Column(Float, nullable=True)
    distance_km = Column(Float, default=5.0)
    duration_mins = Column(Integer, default=15)

    promo_code = Column(String(50), nullable=True)
    discount_amount = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    rider = relationship("User", foreign_keys=[rider_id], back_populates="rides_as_rider")
    driver = relationship("Driver", foreign_keys=[driver_id], back_populates="rides")
    payment = relationship("Payment", back_populates="ride", uselist=False)
    reviews = relationship("Review", back_populates="ride")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), unique=True, nullable=False)
    stripe_payment_intent_id = Column(String(150), nullable=True)
    amount = Column(Float, nullable=False)
    status = Column(String(30), default="pending")  # 'pending', 'succeeded', 'failed'
    payment_method = Column(String(50), default="card")  # 'card', 'wallet', 'cash'
    created_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="payment")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=False)
    rater_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rated_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="reviews")
    rater = relationship("User", foreign_keys=[rater_id], back_populates="reviews_given")
    rated = relationship("User", foreign_keys=[rated_id], back_populates="reviews_received")

class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_percent = Column(Float, nullable=False)  # e.g. 20.0 for 20%
    max_discount = Column(Float, default=50.0)
    min_fare = Column(Float, default=10.0)
    active = Column(Boolean, default=True)

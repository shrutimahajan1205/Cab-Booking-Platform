import asyncio
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.entities import User, Driver, PromoCode

async def seed_all():
    # Create all tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if users already seeded
        res = await db.execute(select(User).limit(1))
        if res.scalars().first():
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding initial users, drivers, and promo codes...")

        # 1. Riders
        rider1 = User(
            name="Rahul Sharma",
            email="rahul@example.com",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("password123"),
            role="rider",
            wallet_balance=500.0,
            rating_avg=4.9
        )
        rider2 = User(
            name="Priya Patel",
            email="priya@example.com",
            phone="+91 98765 12345",
            hashed_password=get_password_hash("password123"),
            role="rider",
            wallet_balance=350.0,
            rating_avg=5.0
        )
        db.add_all([rider1, rider2])
        await db.commit()
        await db.refresh(rider1)
        await db.refresh(rider2)

        # 2. Drivers
        driver_user1 = User(
            name="Amit Kumar",
            email="amit@example.com",
            phone="+91 91234 56789",
            hashed_password=get_password_hash("password123"),
            role="driver",
            rating_avg=4.9,
            wallet_balance=250.0
        )
        driver_user2 = User(
            name="Rajesh Singh",
            email="rajesh@example.com",
            phone="+91 91234 98765",
            hashed_password=get_password_hash("password123"),
            role="driver",
            rating_avg=4.8,
            wallet_balance=180.0
        )
        driver_user3 = User(
            name="Vikram Verma",
            email="vikram@example.com",
            phone="+91 92345 67890",
            hashed_password=get_password_hash("password123"),
            role="driver",
            rating_avg=5.0,
            wallet_balance=320.0
        )
        db.add_all([driver_user1, driver_user2, driver_user3])
        await db.commit()
        await db.refresh(driver_user1)
        await db.refresh(driver_user2)
        await db.refresh(driver_user3)

        d1 = Driver(
            user_id=driver_user1.id,
            vehicle_info="White Toyota Etios (DL 01 AB 4321)",
            vehicle_type="Economy",
            verified=True,
            current_lat=28.6180,
            current_lng=77.2150,
            status="active"
        )
        d2 = Driver(
            user_id=driver_user2.id,
            vehicle_info="Silver Honda City (DL 03 CD 9876)",
            vehicle_type="Comfort",
            verified=True,
            current_lat=28.6250,
            current_lng=77.2050,
            status="active"
        )
        d3 = Driver(
            user_id=driver_user3.id,
            vehicle_info="Black Toyota Innova Crysta (DL 04 EF 5566)",
            vehicle_type="XL",
            verified=True,
            current_lat=28.6100,
            current_lng=77.2250,
            status="active"
        )
        db.add_all([d1, d2, d3])

        # 3. Promo Codes
        p1 = PromoCode(code="WELCOME50", discount_percent=50.0, max_discount=100.0, min_fare=50.0)
        p2 = PromoCode(code="RIDE20", discount_percent=20.0, max_discount=50.0, min_fare=30.0)
        p3 = PromoCode(code="FREERIDE", discount_percent=100.0, max_discount=150.0, min_fare=50.0)
        db.add_all([p1, p2, p3])

        await db.commit()
        print("Database seeded successfully with Demo Riders, Drivers, and Promos!")

if __name__ == "__main__":
    asyncio.run(seed_all())

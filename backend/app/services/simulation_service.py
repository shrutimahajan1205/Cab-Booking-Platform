import asyncio
import logging
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.entities import Ride, Driver, Payment
from app.services.maps_service import interpolate_waypoints
from app.sockets.manager import ws_manager

logger = logging.getLogger(__name__)

# Active background simulation tasks: ride_id -> asyncio.Task
active_simulations = {}

async def run_ride_simulation(ride_id: int):
    """Simulates realistic driver movement and trip progression in the background."""
    logger.info(f"Starting trip simulation for ride #{ride_id}")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ride).where(Ride.id == ride_id))
        ride = result.scalars().first()
        if not ride or not ride.driver_id:
            return

        driver_res = await db.execute(select(Driver).where(Driver.id == ride.driver_id))
        driver = driver_res.scalars().first()
        if not driver:
            return

        driver_user_id = driver.user_id
        rider_user_id = ride.rider_id

        # Phase 1: Driver moves from current location to pickup
        to_pickup_waypoints = interpolate_waypoints(
            driver.current_lat, driver.current_lng,
            ride.pickup_lat, ride.pickup_lng,
            steps=8
        )

        # Notify: Driver Arriving
        ride.status = "arriving"
        await db.commit()
        await ws_manager.send_to_rider(rider_user_id, "ride_status", {"ride_id": ride_id, "status": "arriving"})
        await ws_manager.send_to_driver(driver.id, "ride_status", {"ride_id": ride_id, "status": "arriving"})

        for lat, lng in to_pickup_waypoints:
            await asyncio.sleep(1.2)
            driver.current_lat = lat
            driver.current_lng = lng
            await db.commit()
            loc_data = {"ride_id": ride_id, "lat": lat, "lng": lng, "driver_id": driver.id}
            await ws_manager.send_to_rider(rider_user_id, "driver_location", loc_data)
            await ws_manager.send_to_driver(driver.id, "driver_location", loc_data)

        # Arrived at pickup
        await asyncio.sleep(1.5)
        ride.status = "in_progress"
        await db.commit()
        await ws_manager.send_to_rider(rider_user_id, "ride_status", {"ride_id": ride_id, "status": "in_progress"})
        await ws_manager.send_to_driver(driver.id, "ride_status", {"ride_id": ride_id, "status": "in_progress"})

        # Phase 2: From pickup to drop-off
        to_drop_waypoints = interpolate_waypoints(
            ride.pickup_lat, ride.pickup_lng,
            ride.drop_lat, ride.drop_lng,
            steps=12
        )

        for lat, lng in to_drop_waypoints:
            await asyncio.sleep(1.2)
            driver.current_lat = lat
            driver.current_lng = lng
            await db.commit()
            loc_data = {"ride_id": ride_id, "lat": lat, "lng": lng, "driver_id": driver.id}
            await ws_manager.send_to_rider(rider_user_id, "driver_location", loc_data)
            await ws_manager.send_to_driver(driver.id, "driver_location", loc_data)

        # Trip completed!
        from datetime import datetime
        ride.status = "completed"
        ride.fare_actual = ride.fare_estimate
        ride.completed_at = datetime.utcnow()
        driver.status = "active"

        # Check or create payment record
        pay_res = await db.execute(select(Payment).where(Payment.ride_id == ride_id))
        payment = pay_res.scalars().first()
        if not payment:
            payment = Payment(
                ride_id=ride_id,
                amount=ride.fare_actual,
                status="succeeded",
                payment_method="card"
            )
            db.add(payment)
        else:
            payment.status = "succeeded"

        await db.commit()
        complete_data = {
            "ride_id": ride_id,
            "status": "completed",
            "fare": ride.fare_actual,
            "distance_km": ride.distance_km,
            "duration_mins": ride.duration_mins
        }
        await ws_manager.send_to_rider(rider_user_id, "ride_status", complete_data)
        await ws_manager.send_to_driver(driver.id, "ride_status", complete_data)
        logger.info(f"Ride #{ride_id} simulation completed successfully.")

def start_simulation_task(ride_id: int):
    task = asyncio.create_task(run_ride_simulation(ride_id))
    active_simulations[ride_id] = task
    return task

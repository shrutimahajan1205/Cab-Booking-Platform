import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.core.redis_client import redis_manager
from app.seed_data import seed_all
from app.sockets.manager import ws_manager

# API Routers
from app.api.auth import router as auth_router
from app.api.rides import router as rides_router
from app.api.drivers import router as drivers_router
from app.api.payments import router as payments_router
from app.api.wallet import router as wallet_router
from app.api.promo import router as promo_router
from app.api.reviews import router as reviews_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Cab Booking Platform Backend...")
    # Initialize DB tables & seed data
    try:
        await seed_all()
    except Exception as e:
        logger.error(f"Error seeding database: {e}")

    # Connect Redis
    try:
        await redis_manager.connect(settings.REDIS_URL)
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}")

    yield

    logger.info("Shutting down Cab Booking Platform Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack Cab Booking Platform API built with FastAPI, WebSockets, PostGIS/Geospatial queries, and Stripe.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(rides_router, prefix=settings.API_V1_STR)
app.include_router(drivers_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(wallet_router, prefix=settings.API_V1_STR)
app.include_router(promo_router, prefix=settings.API_V1_STR)
app.include_router(reviews_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "endpoints": {
            "auth": f"{settings.API_V1_STR}/auth",
            "rides": f"{settings.API_V1_STR}/rides",
            "drivers": f"{settings.API_V1_STR}/drivers",
            "payments": f"{settings.API_V1_STR}/payments",
            "wallet": f"{settings.API_V1_STR}/wallet",
            "promo": f"{settings.API_V1_STR}/promo",
            "reviews": f"{settings.API_V1_STR}/reviews"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Real-Time WebSockets
@app.websocket("/ws/rider/{rider_id}")
async def rider_websocket(websocket: WebSocket, rider_id: int):
    await ws_manager.connect_rider(rider_id, websocket)
    try:
        while True:
            # Keep socket alive and receive client messages (e.g. heartbeat or ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect_rider(rider_id, websocket)
    except Exception as e:
        logger.error(f"Error on rider websocket: {e}")
        await ws_manager.disconnect_rider(rider_id, websocket)

@app.websocket("/ws/driver/{driver_id}")
async def driver_websocket(websocket: WebSocket, driver_id: int):
    await ws_manager.connect_driver(driver_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect_driver(driver_id, websocket)
    except Exception as e:
        logger.error(f"Error on driver websocket: {e}")
        await ws_manager.disconnect_driver(driver_id, websocket)

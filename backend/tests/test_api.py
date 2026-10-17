import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base
from app.seed_data import seed_all
from app.services.maps_service import haversine_distance, estimate_trip
from app.services.receipt_service import generate_pdf_receipt

@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_all()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert "version" in response.json()

@pytest.mark.asyncio
async def test_auth_and_demo_tokens():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/auth/demo-tokens")
    assert response.status_code == 200
    data = response.json()
    assert "rider" in data
    assert "token" in data["rider"]

@pytest.mark.asyncio
async def test_ride_estimate():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/rides/estimate", json={
            "pickup_lat": 28.6139,
            "pickup_lng": 77.2090,
            "drop_lat": 28.5562,
            "drop_lng": 77.1000,
            "promo_code": "WELCOME50"
        })
    assert response.status_code == 200
    data = response.json()
    assert "distance_km" in data
    assert len(data["tiers"]) == 3
    assert data["applied_promo"] == "WELCOME50"
    assert data["discount_amount"] > 0

@pytest.mark.asyncio
async def test_promo_validation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/promo/validate", json={
            "code": "WELCOME50",
            "fare": 200.0
        })
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["discount_amount"] == 100.0  # Max discount is 100
    assert data["final_fare"] == 100.0

def test_haversine():
    # Delhi to Gurgaon approx 30 km
    dist = haversine_distance(28.6139, 77.2090, 28.4595, 77.0266)
    assert 20.0 < dist < 35.0

def test_pdf_generation():
    receipt = generate_pdf_receipt({
        "id": 999,
        "rider_name": "Test Passenger",
        "driver_name": "Test Driver",
        "fare_actual": 199.0,
        "pickup_name": "Connaught Place",
        "drop_name": "Cyber City"
    })
    assert isinstance(receipt, bytes)
    assert receipt.startswith(b"%PDF")

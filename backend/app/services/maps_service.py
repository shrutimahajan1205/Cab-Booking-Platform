import math
from typing import List, Dict, Any, Tuple

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on the earth in km."""
    R = 6371.0  # Earth's radius in kilometers
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def estimate_trip(pickup_lat: float, pickup_lng: float, drop_lat: float, drop_lng: float) -> Dict[str, Any]:
    distance_km = haversine_distance(pickup_lat, pickup_lng, drop_lat, drop_lng)
    # If same point or very close, default to at least 2.5 km for realistic simulation
    if distance_km < 1.0:
        distance_km = 3.2

    # Estimated travel speed in city ~ 25 km/h -> mins
    duration_mins = max(5, int(round((distance_km / 25.0) * 60)))

    # Tier calculations
    tiers = [
        {
            "tier_name": "Economy",
            "base_fare": 50.0,
            "per_km": 12.0,
            "per_min": 2.0,
            "icon": "🚗",
            "description": "Affordable, everyday reliable rides"
        },
        {
            "tier_name": "Comfort",
            "base_fare": 80.0,
            "per_km": 18.0,
            "per_min": 3.0,
            "icon": "🚙",
            "description": "Spacious sedans with top-rated drivers"
        },
        {
            "tier_name": "XL",
            "base_fare": 120.0,
            "per_km": 24.0,
            "per_min": 4.0,
            "icon": "🚐",
            "description": "Comfortable 6-seater SUVs for groups"
        }
    ]

    tier_results = []
    for t in tiers:
        raw_price = t["base_fare"] + (distance_km * t["per_km"]) + (duration_mins * t["per_min"])
        price = round(raw_price, 2)
        tier_results.append({
            "tier_name": t["tier_name"],
            "price": price,
            "original_price": price,
            "discount": 0.0,
            "eta_mins": max(3, int(duration_mins / 3)),
            "vehicle_icon": t["icon"],
            "description": t["description"]
        })

    return {
        "distance_km": distance_km,
        "duration_mins": duration_mins,
        "tiers": tier_results
    }

def interpolate_waypoints(start_lat: float, start_lng: float, end_lat: float, end_lng: float, steps: int = 15) -> List[Tuple[float, float]]:
    """Generate intermediate GPS points for live smooth route simulation."""
    waypoints = []
    for i in range(steps + 1):
        fraction = i / float(steps)
        # Add slight natural jitter/curve for realistic road feeling
        curve = math.sin(fraction * math.pi) * 0.002
        lat = start_lat + (end_lat - start_lat) * fraction + curve
        lng = start_lng + (end_lng - start_lng) * fraction
        waypoints.append((round(lat, 6), round(lng, 6)))
    return waypoints

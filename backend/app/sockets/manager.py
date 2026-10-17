import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

from app.core.redis_client import redis_manager

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> Set[WebSocket]
        self.rider_connections: Dict[int, Set[WebSocket]] = {}
        self.driver_connections: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect_rider(self, rider_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if rider_id not in self.rider_connections:
                self.rider_connections[rider_id] = set()
            self.rider_connections[rider_id].add(websocket)
        logger.info(f"Rider {rider_id} connected to WebSocket.")

    async def disconnect_rider(self, rider_id: int, websocket: WebSocket):
        async with self._lock:
            if rider_id in self.rider_connections:
                self.rider_connections[rider_id].discard(websocket)
                if not self.rider_connections[rider_id]:
                    del self.rider_connections[rider_id]
        logger.info(f"Rider {rider_id} disconnected.")

    async def connect_driver(self, driver_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if driver_id not in self.driver_connections:
                self.driver_connections[driver_id] = set()
            self.driver_connections[driver_id].add(websocket)
        logger.info(f"Driver {driver_id} connected to WebSocket.")

    async def disconnect_driver(self, driver_id: int, websocket: WebSocket):
        async with self._lock:
            if driver_id in self.driver_connections:
                self.driver_connections[driver_id].discard(websocket)
                if not self.driver_connections[driver_id]:
                    del self.driver_connections[driver_id]
        logger.info(f"Driver {driver_id} disconnected.")

    async def send_to_rider(self, rider_id: int, event: str, data: dict):
        payload = json.dumps({"event": event, "data": data})
        # Local sockets
        async with self._lock:
            sockets = self.rider_connections.get(rider_id, set()).copy()
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                pass
        # Also publish to Redis channel for multi-node scalability
        await redis_manager.publish(f"rider:{rider_id}", {"event": event, "data": data})

    async def send_to_driver(self, driver_id: int, event: str, data: dict):
        payload = json.dumps({"event": event, "data": data})
        async with self._lock:
            sockets = self.driver_connections.get(driver_id, set()).copy()
        for ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                pass
        await redis_manager.publish(f"driver:{driver_id}", {"event": event, "data": data})

    async def broadcast_to_all_drivers(self, event: str, data: dict):
        payload = json.dumps({"event": event, "data": data})
        async with self._lock:
            all_sockets = [ws for s in self.driver_connections.values() for ws in s]
        for ws in all_sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                pass
        await redis_manager.publish("drivers_all", {"event": event, "data": data})

ws_manager = ConnectionManager()

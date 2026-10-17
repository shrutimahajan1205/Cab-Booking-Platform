import asyncio
import json
import logging
from typing import Dict, Set, Optional

logger = logging.getLogger(__name__)

class MemoryPubSub:
    """In-memory pub/sub broker fallback when Redis is not running."""
    def __init__(self):
        self._channels: Dict[str, Set[asyncio.Queue]] = {}
        self._cache: Dict[str, str] = {}
        self._lock = asyncio.Lock()

    async def publish(self, channel: str, message: str):
        async with self._lock:
            queues = self._channels.get(channel, set()).copy()
        for q in queues:
            await q.put(message)

    async def subscribe(self, channel: str) -> asyncio.Queue:
        q = asyncio.Queue()
        async with self._lock:
            if channel not in self._channels:
                self._channels[channel] = set()
            self._channels[channel].add(q)
        return q

    async def unsubscribe(self, channel: str, q: asyncio.Queue):
        async with self._lock:
            if channel in self._channels:
                self._channels[channel].discard(q)
                if not self._channels[channel]:
                    del self._channels[channel]

    async def set(self, key: str, value: str, ex: Optional[int] = None):
        self._cache[key] = value

    async def get(self, key: str) -> Optional[str]:
        return self._cache.get(key)

    async def delete(self, key: str):
        self._cache.pop(key, None)

class RedisManager:
    def __init__(self):
        self._redis = None
        self._fallback = MemoryPubSub()
        self._use_redis = False

    async def connect(self, redis_url: str):
        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1.5)
            await client.ping()
            self._redis = client
            self._use_redis = True
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}). Using in-memory PubSub fallback.")
            self._use_redis = False

    async def publish(self, channel: str, message_dict: dict):
        payload = json.dumps(message_dict)
        if self._use_redis and self._redis:
            try:
                await self._redis.publish(channel, payload)
                return
            except Exception:
                pass
        await self._fallback.publish(channel, payload)

    async def get_subscriber(self, channel: str):
        return await self._fallback.subscribe(channel)

    async def remove_subscriber(self, channel: str, queue: asyncio.Queue):
        await self._fallback.unsubscribe(channel, queue)

    async def set_location(self, driver_id: int, lat: float, lng: float):
        data = json.dumps({"lat": lat, "lng": lng})
        if self._use_redis and self._redis:
            try:
                await self._redis.set(f"driver_loc:{driver_id}", data, ex=300)
                return
            except Exception:
                pass
        await self._fallback.set(f"driver_loc:{driver_id}", data)

    async def get_location(self, driver_id: int) -> Optional[dict]:
        raw = None
        if self._use_redis and self._redis:
            try:
                raw = await self._redis.get(f"driver_loc:{driver_id}")
            except Exception:
                pass
        if not raw:
            raw = await self._fallback.get(f"driver_loc:{driver_id}")
        if raw:
            return json.loads(raw)
        return None

redis_manager = RedisManager()

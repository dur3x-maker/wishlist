import json
import uuid
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, list[WebSocket]] = defaultdict(list)

    async def connect(self, wishlist_id: uuid.UUID, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[wishlist_id].append(ws)

    def disconnect(self, wishlist_id: uuid.UUID, ws: WebSocket) -> None:
        self._connections[wishlist_id].remove(ws)
        if not self._connections[wishlist_id]:
            del self._connections[wishlist_id]

    async def broadcast(self, wishlist_id: uuid.UUID, event: str, item_id: str, data: dict) -> None:
        message = json.dumps({"event": event, "item_id": item_id, "data": data})
        dead: list[WebSocket] = []
        for ws in self._connections.get(wishlist_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections[wishlist_id].remove(ws)
            except ValueError:
                pass


manager = ConnectionManager()

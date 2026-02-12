import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/wishlists/{wishlist_id}")
async def wishlist_ws(websocket: WebSocket, wishlist_id: uuid.UUID):
    await manager.connect(wishlist_id, websocket)
    try:
        while True:
            # Keep connection alive, we only broadcast from server
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(wishlist_id, websocket)
    except Exception:
        manager.disconnect(wishlist_id, websocket)

import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.database import async_session_factory
from app.repositories.user import UserRepository

settings = get_settings()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_admins(self, message: dict, admin_user_ids: list[int]):
        for admin_id in admin_user_ids:
            await self.send_personal_message(message, admin_id)


manager = ConnectionManager()


async def _authenticate_ws_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        external_user_id = payload.get("sub")
        if not external_user_id:
            return None
        async with async_session_factory() as db:
            user_repo = UserRepository(db)
            user = await user_repo.get_by_external_id(external_user_id)
            if user:
                return user.id
    except JWTError:
        pass
    return None


async def websocket_endpoint(websocket: WebSocket, user_id: int, token: str | None = Query(default=None)):
    if token:
        authenticated_user_id = await _authenticate_ws_token(token)
        if authenticated_user_id is None or authenticated_user_id != user_id:
            await websocket.close(code=4001, reason="Unauthorized")
            return
    else:
        await websocket.close(code=4001, reason="Token required")
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

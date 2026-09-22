import json
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from app.core.config import get_settings
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
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def send_to_users(self, message: dict, user_ids: list[int]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)


manager = ConnectionManager()


async def _authenticate_ws_token(token: str) -> Optional[int]:
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


async def _handle_message(websocket: WebSocket, user_id: int, payload: dict):
    from app.services.message import MessageService

    conversation_id = payload.get("conversation_id")
    content = payload.get("content")
    if not conversation_id or not content or not str(content).strip():
        await websocket.send_json(
            {"type": "error", "event": "message", "message": "conversation_id and content are required"}
        )
        return

    async with async_session_factory() as db:
        try:
            message_service = MessageService(db)
            await message_service.send(
                conversation_id=int(conversation_id),
                sender_id=user_id,
                content=str(content).strip(),
            )
        except Exception as exc:
            await websocket.send_json(
                {"type": "error", "event": "message", "message": str(exc)}
            )


async def websocket_endpoint(websocket: WebSocket, user_id: int, token: Optional[str] = None):
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
                msg_type = parsed.get("type")
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
                elif msg_type == "message":
                    await _handle_message(websocket, user_id, parsed)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
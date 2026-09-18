from fastapi import APIRouter, WebSocket, Query
from app.api.routes import (
    auth,
    equipment,
    categories,
    bookings,
    payments,
    rentals,
    inspections,
    maintenance,
    penalties,
    admin,
)
from app.utils.websocket import websocket_endpoint

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(equipment.router)
api_router.include_router(categories.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(rentals.router)
api_router.include_router(inspections.router)
api_router.include_router(maintenance.router)
api_router.include_router(penalties.router)
api_router.include_router(admin.router)


@api_router.websocket("/ws/{user_id}")
async def websocket_route(websocket: WebSocket, user_id: int):
    await websocket_endpoint(websocket, user_id)

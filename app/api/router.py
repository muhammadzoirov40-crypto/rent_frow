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
    posts,
    dashboard,
    reviews,
    comments,
    listings,
    favorites,
    rental_requests,
    messages,
    notifications,
    cities,
    upload,
    statistics,
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
api_router.include_router(posts.router)
api_router.include_router(dashboard.router)
api_router.include_router(reviews.router)
api_router.include_router(comments.router)
api_router.include_router(listings.router)
api_router.include_router(favorites.router)
api_router.include_router(rental_requests.router)
api_router.include_router(messages.router)
api_router.include_router(notifications.router)
api_router.include_router(cities.router)
api_router.include_router(upload.router)
api_router.include_router(statistics.router)


@api_router.websocket("/ws/{user_id}")
async def websocket_route(websocket: WebSocket, user_id: int, token: str = Query(default=None)):
    await websocket_endpoint(websocket, user_id, token=token)

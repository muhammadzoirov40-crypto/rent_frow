"""In-app AI assistant endpoint.

Design notes:
  * Auth is OPTIONAL — anyone can search, but tools that touch the account
    (favorites / rental request / profile) report "login_required" and the
    model asks the user to sign in instead of failing the whole request.
  * The Gemini key never leaves the server.
  * A small per-user/IP sliding-window limit keeps one visitor from burning
    the whole quota.
"""
import asyncio
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes.listings import _listing_to_list_response
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.ai import AIChatRequest, AIChatResponse, AIListingCard
from app.services.ai_agent import AIAgentError, run_agent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

_rate_buckets: dict[str, list[float]] = {}
_rate_lock = asyncio.Lock()
_BUCKET_TTL = 60.0


def _bucket_key(request: Request, user: CurrentUser | None) -> str:
    if user is not None:
        return f"u:{user.user_id}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


async def _enforce_rate_limit(key: str) -> None:
    limit = get_settings().AI_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return
    now = time.monotonic()
    async with _rate_lock:
        recent = [t for t in _rate_buckets.get(key, []) if now - t < _BUCKET_TTL]
        if len(recent) >= limit:
            raise HTTPException(
                status_code=429,
                detail="Too many AI requests. Please wait a minute and try again.",
            )
        recent.append(now)
        _rate_buckets[key] = recent
        # Drop idle buckets so the dict cannot grow without bound.
        if len(_rate_buckets) > 500:
            for k in list(_rate_buckets):
                if not any(now - t < _BUCKET_TTL for t in _rate_buckets[k]):
                    _rate_buckets.pop(k, None)


def _to_card(listing) -> AIListingCard:
    resp = _listing_to_list_response(listing)
    return AIListingCard(
        id=resp.id,
        title=resp.title,
        price=resp.price,
        price_unit=str(resp.price_unit),
        rooms=resp.rooms,
        city_name=resp.city_name,
        district_name=resp.district_name,
        primary_image=resp.primary_image,
        average_rating=resp.average_rating,
        rating_count=resp.rating_count or 0,
        available=resp.available,
    )


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    payload: AIChatRequest,
    request: Request,
    user: CurrentUser | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is not configured (GEMINI_API_KEY missing).",
        )

    await _enforce_rate_limit(_bucket_key(request, user))

    try:
        reply, listings, tools_used = await run_agent(
            db,
            user,
            payload.message,
            payload.history[: settings.AI_MAX_HISTORY],
        )
    except AIAgentError as exc:
        # Never leak the key or upstream body to the client.
        logger.warning("AI agent error: %s", exc)
        raise HTTPException(status_code=502, detail="AI provider is unavailable right now.")

    return AIChatResponse(
        reply=reply,
        listings=[_to_card(l) for l in listings[:10]],
        tools_used=tools_used,
    )

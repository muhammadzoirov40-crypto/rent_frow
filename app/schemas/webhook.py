"""Shapes the general event webhook accepts.

The body is deliberately tiny: an event name, an optional provider-side id,
and whatever payload the event carries. Everything the handler needs to know
about *what happened* is in the name (`payment.succeeded`, `rental.completed`),
so the same endpoint can absorb a new event later without a new route.
"""

from typing import Any

from pydantic import BaseModel, Field


class WebhookEventIn(BaseModel):
    """One event delivered to /webhooks/events (or a category alias).

    ``event`` is ``<category>.<action>`` - the two halves the dispatcher in
    ``app/services/webhook_events.py`` splits on. ``id`` is the provider's own
    unique id for the event; it is logged for tracing and is safe to retry on,
    because every handler is written to be idempotent.
    """

    event: str = Field(..., min_length=3, examples=["payment.succeeded"])
    id: str | None = Field(default=None, description="Provider-side event id, for tracing")
    data: dict[str, Any] = Field(default_factory=dict)

    @property
    def category(self) -> str:
        return self.event.split(".", 1)[0].strip().lower()

    @property
    def action(self) -> str:
        parts = self.event.split(".", 1)
        return parts[1].strip().lower() if len(parts) > 1 else ""

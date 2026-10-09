"""seed the TOP plan catalogue (the guard that never fired)

Revision ID: e2c4f7a91b3d
Revises: c7d2e5a9f3b1
Create Date: 2026-10-09

``c7d2e5a9f3b1`` created the tables and *meant* to seed four inactive
plans, but its seed block sat behind ``inspector.has_table("top_plans")``
- and SQLAlchemy 2.0's inspector caches that answer per connection. The
same revision had just created the table, so the cached answer was still
"no table" and the insert loop never ran: every database that took the
migration cleanly (the server's included) carries an empty ``top_plans``.

This revision seeds the catalogue whenever it is empty, with no
inspector anywhere near it - the count query is live, so a re-run on a
database that already has plans (or rows an admin created by hand) is a
no-op, exactly like the original guard intended.
"""

from datetime import datetime

from alembic import op
import sqlalchemy as sa

from app.models.promotion import TopPlan

revision = "e2c4f7a91b3d"
down_revision = "c7d2e5a9f3b1"
branch_labels = None
depends_on = None

# Same catalogue as c7d2e5a9f3b1: inactive at price 0 until the admin
# sets a real price and switches a plan on.
SEED_PLANS = (
    ("3 hours", "3h"),
    ("1 day", "1d"),
    ("1 week", "1w"),
    ("1 month", "1m"),
)


def upgrade() -> None:
    bind = op.get_bind()
    count = bind.execute(
        sa.select(sa.func.count()).select_from(TopPlan.__table__)
    ).scalar_one()
    if count:
        return
    now = datetime.utcnow()
    for name, key in SEED_PLANS:
        bind.execute(
            TopPlan.__table__.insert().values(
                name=name,
                duration_key=key,
                price=0,
                is_active=False,
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    """Nothing is dropped - the catalogue is configuration, not history."""
    return None

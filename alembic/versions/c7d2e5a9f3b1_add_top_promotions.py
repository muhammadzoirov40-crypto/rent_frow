"""paid TOP promotion system: plan catalogue + promotion records

Revision ID: c7d2e5a9f3b1
Revises: b4e9d2c7f1a8
Create Date: 2026-10-09

Two brand-new tables, so nothing existing is altered:

* ``top_plans``      - what the admin sells. Seeded with the four durations
                       the product defines (3h / 1d / 1w / 1m) at price 0
                       and **inactive** - this project had no price list
                       anywhere and inventing one would be a business
                       decision the code has no right to make. The admin
                       sets a price and switches the plan on.
* ``top_promotions`` - one row per request/purchase, carrying its own copy
                       of the price and plan name so later plan edits never
                       rewrite what somebody paid. A partial unique index
                       allows at most one open (PENDING/ACTIVE) promotion
                       per listing: the database-level guarantee behind
                       "a double click cannot charge twice".

PostgreSQL additionally needs the new ``PROMO`` value in the existing
``wallettransactiontype`` enum (the ledger entry of a TOP purchase); SQLite
stores enums as text and has nothing to add.

Both guards - table-exists, plan-table-empty - make this a no-op when
re-run, matching the project's "look first, write second" convention.
"""

from datetime import datetime

from alembic import op
import sqlalchemy as sa

# Imported by name, not through `app.models` - same reasoning as the
# catch-up revision: fail loudly at import time, not halfway through.
from app.models.promotion import TopPlan, TopPromotion

revision = "c7d2e5a9f3b1"
down_revision = "b4e9d2c7f1a8"
branch_labels = None
depends_on = None

# The durations the product defines. Deliberately inactive at price 0:
# the admin must configure a real price before anything is sellable.
SEED_PLANS = (
    ("3 hours", "3h"),
    ("1 day", "1d"),
    ("1 week", "1w"),
    ("1 month", "1m"),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- tables (guarded: an old database may already carry them) ---------
    for name, table in (
        ("top_plans", TopPlan.__table__),
        ("top_promotions", TopPromotion.__table__),
    ):
        if inspector.has_table(name):
            continue
        table.create(bind)

    # --- seed the catalogue exactly once, only while it is empty ----------
    if inspector.has_table("top_plans"):
        count = bind.execute(
            sa.select(sa.func.count()).select_from(TopPlan.__table__)
        ).scalar_one()
        if not count:
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

    # --- PostgreSQL: the ledger gains a PROMO transaction type ------------
    if bind.dialect.name == "postgresql":
        type_exists = bind.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = 'wallettransactiontype'")
        ).first()
        if type_exists is not None:
            # ALTER TYPE ... ADD VALUE cannot join an open transaction on
            # older PostgreSQL versions - run it in autocommit.
            with op.get_context().autocommit_block():
                bind.execute(
                    sa.text(
                        "ALTER TYPE wallettransactiontype ADD VALUE IF NOT EXISTS 'PROMO'"
                    )
                )


def downgrade() -> None:
    """Nothing is dropped.

    The promotion history is business history - requests, payments and
    approvals stay answerable forever, and taking the tables away would
    break rows the application may be reading. A database that wants to go
    back sits at b4e9d2c7f1a8, exactly where it was before this ran.
    """
    return None

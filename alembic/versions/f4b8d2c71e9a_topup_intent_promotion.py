"""a top-up reference that settles a TOP promotion instead of the wallet

Revision ID: f4b8d2c71e9a
Revises: e2c4f7a91b3d
Create Date: 2026-10-09

Buying a TOP plan through DC Wallet (Dushanbe City) reuses the exact
machinery a balance top-up already has - one waiting row, one reference in
the link's ``f3``, one idempotent settle behind the webhook - and needs one
thing more: a pointer to the promotion the money is for. This column is
that pointer. NULL keeps every existing row what it always was: a plain
balance top-up.
"""

from alembic import op
import sqlalchemy as sa

revision = "f4b8d2c71e9a"
down_revision = "e2c4f7a91b3d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Look first, write second (the rule the catch-up revision lives by).
    # On a fresh database that revision creates ``topup_intents`` *from the
    # model*, column and index included - so an unconditional ALTER here
    # would hit "duplicate column name". On every existing database (the
    # server's included) the column is genuinely missing and this is the
    # only thing that can add it. Raw queries, not an inspector: SQLAlchemy
    # caches inspection per connection, and the table may have been created
    # earlier in this very run.
    if bind.dialect.name == "sqlite":
        columns = {
            row[1]
            for row in bind.execute(sa.text("PRAGMA table_info(topup_intents)"))
        }
        indexes = {
            row[1]
            for row in bind.execute(sa.text("PRAGMA index_list(topup_intents)"))
        }
    else:
        columns = {
            row[0]
            for row in bind.execute(
                sa.text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'topup_intents'"
                )
            )
        }
        indexes = {
            row[0]
            for row in bind.execute(
                sa.text(
                    "SELECT indexname FROM pg_indexes "
                    "WHERE tablename = 'topup_intents'"
                )
            )
        }

    if "promotion_id" not in columns:
        op.add_column(
            "topup_intents",
            sa.Column(
                "promotion_id",
                sa.Integer(),
                sa.ForeignKey("top_promotions.id"),
                nullable=True,
            ),
        )
    if "ix_topup_intents_promotion_id" not in indexes:
        op.create_index(
            "ix_topup_intents_promotion_id", "topup_intents", ["promotion_id"]
        )


def downgrade() -> None:
    op.drop_index("ix_topup_intents_promotion_id", table_name="topup_intents")
    # batch rebuild: SQLite on older hosts cannot drop a column in place
    with op.batch_alter_table("topup_intents") as batch:
        batch.drop_column("promotion_id")

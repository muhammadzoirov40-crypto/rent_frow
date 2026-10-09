"""the payment a DC checkout reference settles

Revision ID: c7a1e93d5426
Revises: d3f7a1c95e28
Create Date: 2026-10-10

Paying for an accepted rental request now goes out through DC Wallet, and
the reference the provider echoes back has to find that exact payment -
otherwise the callback would have nowhere to put the money but the balance
this project does not use. One plain nullable INTEGER column with an
index-less foreign key intent, added the same guarded way the catch-up
revisions add columns: plain ADD COLUMN works on both dialects, a
constraint inside an ALTER is refused outright on SQLite.
"""

from alembic import op
import sqlalchemy as sa

revision = "c7a1e93d5426"
down_revision = "d3f7a1c95e28"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Look first, write second: a fresh database already has the column from
    # the models, a fixture may have no topup_intents table at all, and every
    # production database needs the ALTER - detected, not guessed. Raw
    # queries, not an inspector: SQLAlchemy caches inspection per connection.
    if bind.dialect.name == "sqlite":
        tables = {
            row[0]
            for row in bind.execute(
                sa.text("SELECT name FROM sqlite_master WHERE type = 'table'")
            )
        }
        columns = (
            {
                row[1]
                for row in bind.execute(sa.text("PRAGMA table_info(topup_intents)"))
            }
            if "topup_intents" in tables
            else set()
        )
    else:
        tables = {
            row[0]
            for row in bind.execute(
                sa.text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                )
            )
        }
        columns = (
            {
                row[0]
                for row in bind.execute(
                    sa.text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = 'topup_intents'"
                    )
                )
            }
            if "topup_intents" in tables
            else set()
        )

    if "topup_intents" in tables and "payment_id" not in columns:
        op.execute(
            sa.text("ALTER TABLE topup_intents ADD COLUMN payment_id INTEGER")
        )


def downgrade() -> None:
    # batch rebuild: SQLite on older hosts cannot drop a column in place
    with op.batch_alter_table("topup_intents") as batch:
        batch.drop_column("payment_id")

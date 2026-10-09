"""the payment receipt a customer attaches to a waiting TOP request

Revision ID: d3f7a1c95e28
Revises: f4b8d2c71e9a
Create Date: 2026-10-10

Paying at DC Wallet (Dushanbe City) ends with a receipt in the customer's
hand, and the operator wants to see it next to the reference in Admin -> TOP.
This column holds the storage key of that picture - one plain nullable TEXT
sized column, no foreign key, exactly like the catch-up revision's late
columns: plain ADD COLUMN works on both dialects, while a constraint in an
ALTER is refused outright on SQLite.
"""

from alembic import op
import sqlalchemy as sa

revision = "d3f7a1c95e28"
down_revision = "f4b8d2c71e9a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Look first, write second. A fresh database builds the table from the
    # models (the column is already there), a fixture may not have the table
    # at all, and every production database needs the ALTER - so each case is
    # detected instead of guessed. Raw queries, not an inspector: SQLAlchemy
    # caches inspection per connection.
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
                for row in bind.execute(sa.text("PRAGMA table_info(top_promotions)"))
            }
            if "top_promotions" in tables
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
                        "WHERE table_name = 'top_promotions'"
                    )
                )
            }
            if "top_promotions" in tables
            else set()
        )

    if "top_promotions" in tables and "check_image_key" not in columns:
        op.execute(
            sa.text(
                "ALTER TABLE top_promotions "
                "ADD COLUMN check_image_key VARCHAR(512)"
            )
        )


def downgrade() -> None:
    # batch rebuild: SQLite on older hosts cannot drop a column in place
    with op.batch_alter_table("top_promotions") as batch:
        batch.drop_column("check_image_key")

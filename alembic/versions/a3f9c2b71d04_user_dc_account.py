"""the owner's own DC account rental payments are collected under

Revision ID: a3f9c2b71d04
Revises: c7a1e93d5426
Create Date: 2026-10-10

Rent (and the deposit) must land with the person who actually rents the
thing out, not with the platform, so each owner registers the DC City
account they want paid. One plain nullable VARCHAR - NULL simply means the
owner has not registered one and the checkout falls back to the platform's
merchant account, so a blank field can never stall a payment. Added the
same guarded way the catch-up revisions add columns: plain ADD COLUMN works
on both dialects, a constraint inside an ALTER is refused outright on
SQLite.
"""

from alembic import op
import sqlalchemy as sa

revision = "a3f9c2b71d04"
down_revision = "c7a1e93d5426"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Look first, write second: a fresh database already has the column from
    # the models, a fixture may have no users table at all, and every
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
                for row in bind.execute(sa.text("PRAGMA table_info(users)"))
            }
            if "users" in tables
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
                        "WHERE table_name = 'users'"
                    )
                )
            }
            if "users" in tables
            else set()
        )

    if "users" in tables and "dc_account" not in columns:
        op.execute(sa.text("ALTER TABLE users ADD COLUMN dc_account VARCHAR(50)"))


def downgrade() -> None:
    # batch rebuild: SQLite on older hosts cannot drop a column in place
    with op.batch_alter_table("users") as batch:
        batch.drop_column("dc_account")

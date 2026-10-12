"""the payment receipt a customer attaches to a waiting top-up or a rental payment

Revision ID: b7e2f4a91c35
Revises: a3f9c2b71d04
Create Date: 2026-10-11

Paying at DC Wallet (Dushanbe City) ends with a receipt in the customer's
hand, and the operator wants to see it next to the reference wherever the
money is headed. Top-promotion requests already carry one of these; a balance
top-up and a rental payment are the same act of paying at the same provider,
so they get the same column under the same name.

Plain nullable VARCHAR(512) storage keys, no foreign key — exactly the shape
the promotion column took, and for the same reason: the file lives in S3 (or
the local fallback), the row holds only its key.
"""

from alembic import op
import sqlalchemy as sa

revision = "b7e2f4a91c35"
down_revision = "a3f9c2b71d04"
branch_labels = None
depends_on = None


# (table, column) pairs added here. Two tables, one identical column: a list
# keeps the guarded logic written once instead of twice, so the two cannot
# drift into one being added and the other forgotten.
TARGETS = (("topup_intents", "check_image_key"), ("payments", "check_image_key"))


def _existing(bind) -> dict[str, set[str]]:
    """Which of the target columns are already there, looked up before written.

    A fresh database builds its tables from the models — where the column
    already exists — a fixture may not have the table at all, and a database
    upgraded by hand may be halfway. Each case is detected, never guessed.
    Raw queries rather than an inspector: SQLAlchemy caches inspection per
    connection, and this runs against whichever connection migrations got.
    """
    dialect = bind.dialect.name
    found: dict[str, set[str]] = {}
    for table, _column in TARGETS:
        if dialect == "sqlite":
            tables = {
                row[0]
                for row in bind.execute(
                    sa.text("SELECT name FROM sqlite_master WHERE type = 'table'")
                )
            }
            if table not in tables:
                found[table] = set()
                continue
            found[table] = {
                row[1]
                for row in bind.execute(sa.text(f"PRAGMA table_info({table})"))
            }
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
            if table not in tables:
                found[table] = set()
                continue
            found[table] = {
                row[0]
                for row in bind.execute(
                    sa.text(
                        "SELECT column_name FROM information_schema.columns "
                        f"WHERE table_name = '{table}'"
                    )
                )
            }
    return found


def upgrade() -> None:
    bind = op.get_bind()
    existing = _existing(bind)

    for table, column in TARGETS:
        # A table this revision's model knows about but the database has no
        # row for is a database the next migration will build; adding a
        # column to a missing table is an error, not a no-op.
        if not existing.get(table):
            continue
        if column in existing[table]:
            continue
        op.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {column} VARCHAR(512)"))


def downgrade() -> None:
    # Batch rebuild for both: SQLite on older hosts cannot drop a column in
    # place, and one revision that added two columns should take both away.
    for table, _column in TARGETS:
        with op.batch_alter_table(table) as batch:
            batch.drop_column("check_image_key")

"""catch the schema up with what the models declare

Revision ID: a1c7f0d42b93
Revises: 7f3a91c2d8e4
Create Date: 2026-10-05

This is the last revision that has to reconcile by hand.

Every change before it was applied by ``ALTER TABLE`` strings sitting in the
application's startup code, where nothing could review them, roll them back or
even see them next to the code that needed them - Alembic was installed but was
migrating a different file. From here on a schema change is
``alembic revision --autogenerate`` and this module is only read once.

It is written to be run against *any* of the three states a database can be in:

* empty - nothing to do, ``upgrade`` created the tables a moment ago,
* built by the old startup code - every statement below is guarded by an
  inspection, so existing tables and columns are left exactly as they are,
* stamped here by ``app.core.migrations`` - same thing, the guards decide.

Hence the shape: look first, write second. A migration that assumes will drop
data on the database it has not seen before.
"""

from alembic import op
import sqlalchemy as sa

# Imported by name, not through `app.models`: this file must work even when
# something else has already imported the package, and it must fail loudly at
# import time rather than with a KeyError halfway through a startup.
from app.models.wallet import Wallet, TopupIntent, WalletTransaction

revision = "a1c7f0d42b93"
down_revision = "7f3a91c2d8e4"
branch_labels = None
depends_on = None


# Tables the models grew after this migration chain was first written. Each is
# created only when it is not already there: the old startup code had created
# them with `create_all` on every database it had ever opened.
LATE_TABLES = {
    "wallets": Wallet.__table__,
    "wallet_transactions": WalletTransaction.__table__,
    "topup_intents": TopupIntent.__table__,
}

# Columns added after the initial migration, as (table, column, DDL).
# `NOT NULL` entries carry the default the model declares, so adding them to a
# table that already holds rows rewrites nothing and fails nowhere.
LATE_COLUMNS = (
    ("categories", "name_en", "VARCHAR(255)"),
    ("categories", "category_group", "VARCHAR(32) NOT NULL DEFAULT 'other'"),
    ("subcategories", "name_tj", "VARCHAR(255)"),
    ("subcategories", "name_en", "VARCHAR(255)"),
    ("cities", "latitude", "NUMERIC(9, 6)"),
    ("cities", "longitude", "NUMERIC(9, 6)"),
    ("listings", "expires_at", "TIMESTAMP"),
    ("notifications", "data", "JSON"),
    ("messages", "reply_to_id", "INTEGER"),
    ("messages", "edited_at", "TIMESTAMP"),
    ("messages", "pinned", "BOOLEAN NOT NULL DEFAULT false"),
    ("messages", "reactions", "TEXT"),
    ("messages", "forwarded_from_name", "VARCHAR(255)"),
    # a chat opened from a rental request keeps that request's id, so the
    # conversation can show the request card and the accept/reject buttons
    ("conversations", "rental_request_id", "INTEGER"),
    # a payment belongs either to an equipment booking or to a rental request
    ("payments", "rental_request_id", "INTEGER"),
)

# (table, index, columns) - only if the table exists and lacks the index.
# Every name here is one the models declare. The old startup code also created
# `idx_payment_rental_request`, a byte-for-byte duplicate of the model's own
# `ix_payments_rental_request_id`; it is deliberately absent so that a database
# built by these migrations is exactly the database the models describe.
# Servers that already carry the duplicate keep it - an extra index costs
# storage, and rewriting somebody's live table to remove one is not worth it.
LATE_INDEXES = (
    ("conversations", "idx_conversation_rental_request", ["rental_request_id"]),
    ("messages", "ix_messages_reply_to_id", ["reply_to_id"]),
    ("payments", "ix_payments_rental_request_id", ["rental_request_id"]),
)

# Columns whose ORM type is a native PostgreSQL enum but which an older
# migration left as VARCHAR. The mismatch makes every filtered query fail with
# `character varying = <enum>` (HTTP 500), e.g. `GET /listings?property_type=`.
# Postgres only - SQLite stores enums as text and has nothing to align.
ENUM_COLUMNS = (
    (
        "listings",
        "property_type",
        "propertytype",
        ["apartment", "house", "office", "room", "commercial", "other"],
        "other",
        "'apartment'",
    ),
    (
        "listings",
        "verification_status",
        "verificationstatus",
        ["pending", "verified", "rejected", "request_info"],
        "pending",
        "'pending'",
    ),
    (
        "posts",
        "status",
        "poststatus",
        ["pending", "approved", "rejected"],
        "pending",
        "'pending'",
    ),
)


def _inspector():
    return sa.inspect(op.get_bind())


def _table_exists(name: str) -> bool:
    return _inspector().has_table(name)


def _columns_of(table: str) -> set:
    if not _table_exists(table):
        return set()
    return {c["name"] for c in _inspector().get_columns(table)}


def _indexes_of(table: str) -> set:
    if not _table_exists(table):
        return set()
    return {i["name"] for i in _inspector().get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- tables -----------------------------------------------------------
    for name, table in LATE_TABLES.items():
        if inspector.has_table(name):
            continue
        # Created from the model rather than from a hand-written CREATE: the
        # ORM knows the columns, the foreign keys and the types, and this is
        # the one place where "what the model says" is not a copy of it.
        table.create(bind)

    # --- columns ----------------------------------------------------------
    for table, column, ddl in LATE_COLUMNS:
        if not _table_exists(table):
            # Nothing to alter. A database can legitimately lack the whole
            # table (this revision is also run against a half-built one), and
            # an ALTER at a missing table would stop the server starting.
            continue
        if column in _columns_of(table):
            continue
        op.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))

    # --- indexes ----------------------------------------------------------
    for table, index, columns in LATE_INDEXES:
        if index in _indexes_of(table):
            continue
        if not _table_exists(table):
            continue
        quoted = ", ".join(columns)
        op.execute(
            sa.text(f"CREATE INDEX IF NOT EXISTS {index} ON {table} ({quoted})")
        )

    # --- payments.booking_id must accept NULL ------------------------------
    # A payment is now for a booking *or* for a rental request, so the booking
    # it does not have is NULL. The initial migration declared it NOT NULL.
    if _table_exists("payments"):
        if bind.dialect.name == "postgresql":
            row = bind.execute(
                sa.text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'payments' AND column_name = 'booking_id'"
                )
            ).first()
            if row is not None and row[0] == "NO":
                op.execute(
                    sa.text("ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL")
                )
        elif bind.dialect.name == "sqlite":
            _rebuild_payments_on_sqlite(bind)

    # --- enum columns on PostgreSQL ---------------------------------------
    if bind.dialect.name == "postgresql":
        _align_enum_columns(bind)


def _rebuild_payments_on_sqlite(bind) -> bool:
    """SQLite cannot `ALTER ... DROP NOT NULL`, so the table is rebuilt.

    It is recreated from its own stored CREATE statement - which keeps every
    column type exactly as the ORM first defined it - the rows are copied
    across, and the indexes are put back. Everything runs inside this
    migration's transaction, so a failure leaves the original table alone.

    Returns ``True`` when it rebuilt the table and ``False`` when there was
    nothing to do, which is what makes a second run provably a no-op.
    """
    import re

    create_sql = bind.execute(
        sa.text(
            "SELECT sql FROM sqlite_master "
            "WHERE type = 'table' AND name = 'payments'"
        )
    ).scalar_one_or_none()
    if not create_sql:
        return False

    info = {row[1]: row for row in bind.execute(sa.text("PRAGMA table_info(payments)"))}
    # PRAGMA row is (cid, name, type, notnull, default, pk): notnull == 0 already
    # means the column takes NULL and there is nothing to rebuild.
    if "booking_id" not in info or info["booking_id"][3] == 0:
        return False

    new_ddl = re.sub(
        r"(`?booking_id`?)(\s+\w+)\s+NOT NULL",
        r"\1\2",
        create_sql.strip(),
        count=1,
        flags=re.IGNORECASE,
    )

    if "rental_request_id" not in new_ddl:
        end = new_ddl.rstrip().rfind(")")
        new_ddl = new_ddl.rstrip()[:end] + ", rental_request_id INTEGER)"

    new_ddl = re.sub(
        r"^(CREATE\s+TABLE\s+)[\"`]?payments[\"`]?",
        r"\1payments_rebuild",
        new_ddl,
        count=1,
        flags=re.IGNORECASE,
    )

    index_sql = [
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'index' AND tbl_name = 'payments' AND sql IS NOT NULL"
            )
        )
    ]

    body = new_ddl[new_ddl.find("(") + 1 : new_ddl.rstrip().rfind(")")]
    target = [
        re.split(r"[\s(`]", part.strip(), maxsplit=1)[0].strip('`"')
        for part in body.split(",")
        if part.strip()
    ]
    source = [name for name in info if name in target]
    if not source:
        return False
    copied = ", ".join(source)

    bind.execute(sa.text("DROP TABLE IF EXISTS payments_rebuild"))
    bind.execute(sa.text(new_ddl))
    bind.execute(
        sa.text(f"INSERT INTO payments_rebuild ({copied}) SELECT {copied} FROM payments")
    )
    bind.execute(sa.text("DROP TABLE payments"))
    bind.execute(sa.text("ALTER TABLE payments_rebuild RENAME TO payments"))
    for sql in index_sql:
        bind.execute(sa.text(sql))
    return True


def _align_enum_columns(bind) -> None:
    """Turn a VARCHAR stand-in back into the enum type the model declares."""
    for table, column, pg_type, values, fallback, default in ENUM_COLUMNS:
        if column not in _columns_of(table):
            continue

        current = bind.execute(
            sa.text(
                "SELECT udt_name FROM information_schema.columns "
                "WHERE table_name = :table AND column_name = :column"
            ),
            {"table": table, "column": column},
        ).first()
        if current is None or current[0] == pg_type:
            continue

        type_exists = bind.execute(
            sa.text("SELECT 1 FROM pg_type WHERE typname = :name"), {"name": pg_type}
        ).first()
        if type_exists is None:
            enum_values = ", ".join(f"'{v}'" for v in values)
            bind.execute(sa.text(f"CREATE TYPE {pg_type} AS ENUM ({enum_values})"))

        # Normalise anything the enum does not know about before casting,
        # otherwise ALTER ... TYPE would fail on the offending row.
        allowed = ", ".join(f"'{v}'" for v in values)
        bind.execute(
            sa.text(
                f"UPDATE {table} SET {column} = :fallback "
                f"WHERE {column} IS NULL OR lower({column}::text) NOT IN ({allowed})"
            ),
            {"fallback": fallback},
        )

        bind.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT")
        )
        bind.execute(
            sa.text(
                f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {pg_type} "
                f"USING {column}::{pg_type}"
            )
        )
        bind.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {default}")
        )


def downgrade() -> None:
    """Nothing is dropped.

    This revision only ever *adds* what the models already declare - taking it
    back would mean removing columns the application is reading right now.
    A database that wants to leave it goes back to 7f3a91c2d8e4 and stays
    there, which is exactly where it was before this file ran.
    """
    return None

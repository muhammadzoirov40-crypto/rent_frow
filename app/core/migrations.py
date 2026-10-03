import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.engine import Inspector


LISTING_COLUMNS: list = [
    ("property_type", "VARCHAR(20) NOT NULL DEFAULT 'apartment'"),
    ("rooms", "INTEGER"),
    ("bathrooms", "INTEGER"),
    ("area_sqm", "INTEGER"),
    ("furnished", "BOOLEAN NOT NULL DEFAULT false"),
    ("parking", "BOOLEAN NOT NULL DEFAULT false"),
    ("wifi_included", "BOOLEAN NOT NULL DEFAULT false"),
    ("available", "BOOLEAN NOT NULL DEFAULT true"),
    ("latitude", "NUMERIC(9, 6)"),
    ("longitude", "NUMERIC(9, 6)"),
    ("verification_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
]

REVIEW_COLUMNS: list = [
    ("rental_request_id", "INTEGER"),
]

NOTIFICATION_COLUMNS: list = [
    ("data", "JSON"),
]

LISTING_COLUMNS_V2: list = [
    ("expires_at", "TIMESTAMP"),
]

POST_COLUMNS: list = [
    ("status", "VARCHAR(16) NOT NULL DEFAULT 'pending'"),
]

CATEGORY_COLUMNS: list = [
    ("name_en", "VARCHAR(255)"),
    ("category_group", "VARCHAR(32) NOT NULL DEFAULT 'other'"),
]

SUBCATEGORY_COLUMNS: list = [
    ("name_tj", "VARCHAR(255)"),
    ("name_en", "VARCHAR(255)"),
]

MESSAGE_COLUMNS: list = [
    ("reply_to_id", "INTEGER"),
    ("edited_at", "TIMESTAMP"),
    ("pinned", "BOOLEAN NOT NULL DEFAULT false"),
    ("reactions", "TEXT"),
    ("forwarded_from_name", "VARCHAR(255)"),
]

MESSAGE_INDEXES: list = [
    "idx_message_reply_to",
]

CITY_COLUMNS: list = [
    ("latitude", "NUMERIC(9, 6)"),
    ("longitude", "NUMERIC(9, 6)"),
]

# A payment now belongs either to an equipment booking or to a rental request.
PAYMENT_COLUMNS: list = [
    ("rental_request_id", "INTEGER"),
]

PAYMENT_INDEXES: list = [
    "idx_payment_rental_request",
]

# Columns whose ORM type is a native PostgreSQL enum, but which an older
# migration created as VARCHAR. The mismatch makes every filtered query fail
# with `character varying = <enum>` (HTTP 500), e.g. `GET /listings?property_type=`.
# Each entry: (table, column, pg enum type, allowed values, fallback, default).
ENUM_COLUMNS: list = [
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
]

LISTING_INDEXES: list = [
    "idx_listing_price_unit",
    "idx_listing_district",
    "idx_listing_available_verified",
]

REVIEW_INDEXES: list = [
    "idx_review_customer",
]


async def _add_missing_columns(conn, table: str, columns: list, existing: set) -> list:
    added = []
    for name, ddl in columns:
        if name in existing:
            continue
        await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        added.append(name)
    return added


async def _create_missing_indexes(conn, table: str, indexes: list, existing: set) -> list:
    created = []
    dialect = conn.dialect.name
    for index_name in indexes:
        if index_name in existing:
            continue
        definition = ""

        if table == "listings":
            if index_name == "idx_listing_price_unit":
                definition = "(price, price_unit)"
            elif index_name == "idx_listing_district":
                definition = "(district_id)"
            elif index_name == "idx_listing_available_verified":
                definition = "(available, is_verified)"

        if table == "reviews":
            if index_name == "idx_review_customer":
                definition = "(customer_id)"

        if table == "messages":
            if index_name == "idx_message_reply_to":
                definition = "(reply_to_id)"

        if table == "payments":
            if index_name == "idx_payment_rental_request":
                definition = "(rental_request_id)"

        if not definition:
            continue

        if dialect == "sqlite":
            await conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} {definition}"
            ))
        else:
            await conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} {definition}"
            ))
        created.append(index_name)
    return created


async def _align_enum_columns(conn, dialect: str) -> list:
    """Convert VARCHAR stand-ins back to the native enum type the ORM declares.

    Idempotent: columns that are already the right enum type (or that do not
    exist) are skipped, so this is safe to run on every startup.
    """
    if dialect != "postgresql":
        return []

    aligned = []
    for table, column, pg_type, values, fallback, default in ENUM_COLUMNS:
        current = (
            await conn.execute(
                text(
                    "SELECT udt_name FROM information_schema.columns "
                    "WHERE table_name = :table AND column_name = :column"
                ),
                {"table": table, "column": column},
            )
        ).first()
        if current is None or current[0] == pg_type:
            continue

        type_exists = (
            await conn.execute(
                text("SELECT 1 FROM pg_type WHERE typname = :name"), {"name": pg_type}
            )
        ).first()
        if type_exists is None:
            enum_values = ", ".join(f"'{v}'" for v in values)
            await conn.execute(text(f"CREATE TYPE {pg_type} AS ENUM ({enum_values})"))

        # Normalise anything the enum does not know about before casting,
        # otherwise ALTER ... TYPE would fail on the offending row.
        allowed = ", ".join(f"'{v}'" for v in values)
        await conn.execute(
            text(
                f"UPDATE {table} SET {column} = :fallback "
                f"WHERE {column} IS NULL OR lower({column}::text) NOT IN ({allowed})"
            ),
            {"fallback": fallback},
        )

        await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT"))
        await conn.execute(
            text(
                f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {pg_type} "
                f"USING {column}::{pg_type}"
            )
        )
        await conn.execute(
            text(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT {default}")
        )
        aligned.append(f"{table}.{column} -> {pg_type}")
    return aligned


async def _allow_payment_to_be_for_a_request(conn, dialect: str) -> bool:
    """`payments.booking_id` must accept NULL now that a payment can be for a
    rental request instead of an equipment booking.

    PostgreSQL drops the constraint in place. SQLite has no
    ``ALTER TABLE ... DROP NOT NULL``, so the table is recreated from its own
    stored CREATE statement — that keeps the column types exactly as the ORM
    defined them — the rows are copied across, and the indexes are put back.
    Both run inside the caller's transaction, so a failure leaves the original
    table untouched.
    """
    if dialect == "postgresql":
        row = (
            await conn.execute(
                text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'payments' AND column_name = 'booking_id'"
                )
            )
        ).first()
        if row is None or row[0] == "YES":
            return False
        await conn.execute(
            text("ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL")
        )
        return True

    if dialect == "sqlite":
        return await _rebuild_payments_for_sqlite(conn)

    return False


async def _rebuild_payments_for_sqlite(conn) -> bool:
    create_sql = (
        await conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'table' AND name = 'payments'"
            )
        )
    ).scalar_one_or_none()
    if not create_sql:
        return False

    info = {
        row[1]: row
        for row in await conn.execute(text("PRAGMA table_info(payments)"))
    }
    # nothing to do unless booking_id still refuses NULL
    if "booking_id" not in info or info["booking_id"][3] == 0:
        return False

    new_ddl = re.sub(
        r"(`?booking_id`?)(\s+\w+)\s+NOT NULL",
        r"\1\2",
        create_sql.strip(),
        count=1,
        flags=re.IGNORECASE,
    )

    # _add_missing_columns has normally already run, but do not assume it:
    # the new table must carry the column either way
    if "rental_request_id" not in create_sql:
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
        for row in await conn.execute(
            text(
                "SELECT sql FROM sqlite_master "
                "WHERE type = 'index' AND tbl_name = 'payments' AND sql IS NOT NULL"
            )
        )
    ]

    # Copy only the columns both tables really have, so the rebuild works
    # whichever order the column and the rebuild were applied in.
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

    await conn.execute(text("DROP TABLE IF EXISTS payments_rebuild"))
    await conn.execute(text(new_ddl))
    await conn.execute(
        text(
            f"INSERT INTO payments_rebuild ({copied}) "
            f"SELECT {copied} FROM payments"
        )
    )
    await conn.execute(text("DROP TABLE payments"))
    await conn.execute(text("ALTER TABLE payments_rebuild RENAME TO payments"))
    for sql in index_sql:
        await conn.execute(text(sql))
    return True


async def run_schema_migrations(engine: AsyncEngine) -> list:
    """Additively upgrades an existing database schema (columns + indexes) in place.

    Safe to run on every startup: it inspects the live schema and only applies
    the changes that are still missing.
    """
    applied: list = []
    async with engine.connect() as conn:
        if not await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("listings")):
            return applied

        def _get_columns(sync_conn, table):
            return {c["name"] for c in Inspector.from_engine(sync_conn).get_columns(table)}

        def _get_indexes(sync_conn, table):
            return {i["name"] for i in Inspector.from_engine(sync_conn).get_indexes(table)}

        listing_columns = await conn.run_sync(_get_columns, "listings")
        listing_indexes = await conn.run_sync(_get_indexes, "listings")

        added = await _add_missing_columns(conn, "listings", LISTING_COLUMNS, listing_columns)
        if added:
            applied.append(f"listings: added columns {', '.join(added)}")

        v2_added = await _add_missing_columns(conn, "listings", LISTING_COLUMNS_V2, listing_columns)
        if v2_added:
            applied.append(f"listings: added columns {', '.join(v2_added)}")

        idx_created = await _create_missing_indexes(conn, "listings", LISTING_INDEXES, listing_indexes)
        if idx_created:
            applied.append(f"listings: created indexes {', '.join(idx_created)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("reviews")):
            review_columns = await conn.run_sync(_get_columns, "reviews")
            review_indexes = await conn.run_sync(_get_indexes, "reviews")

            r_added = await _add_missing_columns(conn, "reviews", REVIEW_COLUMNS, review_columns)
            if r_added:
                applied.append(f"reviews: added columns {', '.join(r_added)}")

            r_created = await _create_missing_indexes(conn, "reviews", REVIEW_INDEXES, review_indexes)
            if r_created:
                applied.append(f"reviews: created indexes {', '.join(r_created)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("notifications")):
            notification_columns = await conn.run_sync(_get_columns, "notifications")
            n_added = await _add_missing_columns(conn, "notifications", NOTIFICATION_COLUMNS, notification_columns)
            if n_added:
                applied.append(f"notifications: added columns {', '.join(n_added)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("posts")):
            post_columns = await conn.run_sync(_get_columns, "posts")
            p_added = await _add_missing_columns(conn, "posts", POST_COLUMNS, post_columns)
            if p_added:
                applied.append(f"posts: added columns {', '.join(p_added)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("categories")):
            category_columns = await conn.run_sync(_get_columns, "categories")
            c_added = await _add_missing_columns(conn, "categories", CATEGORY_COLUMNS, category_columns)
            if c_added:
                applied.append(f"categories: added columns {', '.join(c_added)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("subcategories")):
            subcategory_columns = await conn.run_sync(_get_columns, "subcategories")
            s_added = await _add_missing_columns(conn, "subcategories", SUBCATEGORY_COLUMNS, subcategory_columns)
            if s_added:
                applied.append(f"subcategories: added columns {', '.join(s_added)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("messages")):
            message_columns = await conn.run_sync(_get_columns, "messages")
            message_indexes = await conn.run_sync(_get_indexes, "messages")

            m_added = await _add_missing_columns(conn, "messages", MESSAGE_COLUMNS, message_columns)
            if m_added:
                applied.append(f"messages: added columns {', '.join(m_added)}")

            m_idx = await _create_missing_indexes(conn, "messages", MESSAGE_INDEXES, message_indexes)
            if m_idx:
                applied.append(f"messages: created indexes {', '.join(m_idx)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("cities")):
            city_columns = await conn.run_sync(_get_columns, "cities")
            cy_added = await _add_missing_columns(conn, "cities", CITY_COLUMNS, city_columns)
            if cy_added:
                applied.append(f"cities: added columns {', '.join(cy_added)}")

        if await conn.run_sync(lambda sync_conn: Inspector.from_engine(sync_conn).has_table("payments")):
            payment_columns = await conn.run_sync(_get_columns, "payments")
            payment_indexes = await conn.run_sync(_get_indexes, "payments")

            pay_added = await _add_missing_columns(conn, "payments", PAYMENT_COLUMNS, payment_columns)
            if pay_added:
                applied.append(f"payments: added columns {', '.join(pay_added)}")

            pay_idx = await _create_missing_indexes(conn, "payments", PAYMENT_INDEXES, payment_indexes)
            if pay_idx:
                applied.append(f"payments: created indexes {', '.join(pay_idx)}")

            if await _allow_payment_to_be_for_a_request(conn, conn.dialect.name):
                applied.append("payments: booking_id is now nullable")

        enum_aligned = await _align_enum_columns(conn, conn.dialect.name)
        if enum_aligned:
            applied.append(f"enum columns: aligned {', '.join(enum_aligned)}")

        await conn.commit()
    return applied
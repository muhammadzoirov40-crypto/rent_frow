from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.engine import Inspector


LISTING_COLUMNS: list = [
    ("property_type", "VARCHAR(20) NOT NULL DEFAULT 'apartment'"),
    ("rooms", "INTEGER"),
    ("bathrooms", "INTEGER"),
    ("area_sqm", "INTEGER"),
    ("furnished", "BOOLEAN NOT NULL DEFAULT 0"),
    ("parking", "BOOLEAN NOT NULL DEFAULT 0"),
    ("wifi_included", "BOOLEAN NOT NULL DEFAULT 0"),
    ("available", "BOOLEAN NOT NULL DEFAULT 1"),
    ("latitude", "NUMERIC(9, 6)"),
    ("longitude", "NUMERIC(9, 6)"),
    ("verification_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
]

REVIEW_COLUMNS: list = [
    ("rental_request_id", "INTEGER"),
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

        await conn.commit()
    return applied
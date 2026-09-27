"""One-shot data migration: rentflow.db (SQLite) -> PostgreSQL (asyncpg).

SQLite does not enforce foreign keys, so the dump can contain orphan rows.
The copy therefore runs with FK triggers disabled (needs a superuser DSN,
passed as argv[1], e.g. postgresql+psycopg2://postgres:postgres@localhost:5432/rentflow)
and orphans are purged afterwards with FK checks ON.

Usage:
  .venv/Scripts/python.exe scripts/migrate_sqlite_to_pg.py [sync_dsn]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text

from app.core.config import get_settings
from app.core.database import Base
import app.models  # noqa: F401  (registers all tables on Base.metadata)

SRC_URL = "sqlite:///./rentflow.db"
BATCH = 500


def is_superuser(engine) -> bool:
    with engine.connect() as conn:
        return bool(
            conn.execute(
                text("SELECT rolsuper FROM pg_roles WHERE rolname = current_user")
            ).scalar()
        )


def fk_off(conn, enabled: bool) -> None:
    if enabled:
        conn.execute(text("SET LOCAL session_replication_role = replica"))


def copy_rows(src, dst, tables, disable_fk: bool) -> int:
    total = 0
    for t in tables:
        with src.connect() as conn:
            rows = [dict(r._mapping) for r in conn.execute(t.select())]
        if not rows:
            continue
        cols = {c.name for c in t.columns}
        rows = [{k: v for k, v in r.items() if k in cols} for r in rows]
        with dst.begin() as conn:
            fk_off(conn, disable_fk)
            for i in range(0, len(rows), BATCH):
                conn.execute(t.insert(), rows[i : i + BATCH])
        total += len(rows)
        print(f"  {t.name}: {len(rows)}")
    return total


def delete_orphans(dst, tables) -> int:
    """Remove rows whose FK points at a missing parent (children first)."""
    removed = 0
    for _ in range(3):  # repeat: deleting a row can orphan its own children
        pass_removed = 0
        for t in reversed(tables):
            for c in t.columns:
                if not c.foreign_keys:
                    continue
                fk = list(c.foreign_keys)[0]
                parent = fk.column.table
                parent_col = fk.column.name
                with dst.begin() as conn:
                    res = conn.execute(
                        text(
                            f"DELETE FROM {t.name} WHERE {c.name} IS NOT NULL "
                            f"AND {c.name} NOT IN (SELECT {parent_col} FROM {parent.name})"
                        )
                    )
                    pass_removed += res.rowcount
                    if res.rowcount:
                        print(f"  orphan {t.name}.{c.name}: {res.rowcount} removed")
        removed += pass_removed
        if not pass_removed:
            break
    return removed


def resync_sequences(dst, tables, dst_tables) -> None:
    with dst.begin() as conn:
        for t in tables:
            if t.name not in dst_tables:
                continue
            for c in t.columns:
                if c.primary_key and c.autoincrement:
                    conn.execute(
                        text(
                            f"SELECT setval(pg_get_serial_sequence('{t.name}', '{c.name}'), "
                            f"GREATEST(COALESCE((SELECT MAX({c.name}) FROM {t.name}), 0) + 1, 1), false)"
                        )
                    )


def main() -> int:
    settings = get_settings()
    dsn = sys.argv[1] if len(sys.argv) > 1 else settings.DATABASE_URL_SYNC
    if not dsn.startswith("postgresql"):
        print("Not a PostgreSQL DSN:", dsn)
        return 1

    src = create_engine(SRC_URL)
    dst = create_engine(dsn)
    disable_fk = is_superuser(dst)
    if not disable_fk:
        print("Note: DSN is not a superuser — FK checks stay ON during copy.")

    src_tables = set(inspect(src).get_table_names())
    dst_tables = set(inspect(dst).get_table_names())
    tables = [t for t in Base.metadata.sorted_tables if t.name in src_tables]

    # 1) wipe target tables (FK-safe order: reversed topological)
    with dst.begin() as conn:
        fk_off(conn, disable_fk)
        for t in reversed(tables):
            if t.name in dst_tables:
                conn.execute(t.delete())

    # 2) copy rows in FK topological order
    total = copy_rows(src, dst, tables, disable_fk)

    # 3) purge orphan rows left over from SQLite's unchecked FKs
    orphans = delete_orphans(dst, tables)

    # 4) resync identity sequences so future inserts don't collide on ids
    resync_sequences(dst, tables, dst_tables)

    print(f"TOTAL rows migrated: {total}, orphans removed: {orphans}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

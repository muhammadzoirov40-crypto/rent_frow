"""Schema changes go through Alembic, not through strings in this file.

This module used to hold ~470 lines of hand-written ``ALTER TABLE``: a list of
columns, a list of indexes, and code that inspected the live schema on every
startup and patched whatever it found missing. It worked, but it was the
review's point - the changes lived in the application, where nothing could
review them, version them, roll them back, or run them once.

Those changes now live in ``alembic/versions/a1c7f0d42b93_catch_up_with_models.py``.
What is left here is only the decision a running server has to make about the
database in front of it:

* **empty** - let the revisions build it, from nothing to the full schema;
* **built by the old startup code** - it has tables but no ``alembic_version``
  row, so stamp it at the last revision before the catch-up and upgrade: the
  catch-up is guarded table by table and column by column, so it applies only
  what is actually missing and touches nothing that is there;
* **already tracked** - just upgrade, which is what every deploy does.

The one rule this file keeps: never guess what a database contains. Look
first, then act.
"""

import asyncio
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import command
from alembic.config import Config

# The last revision written before schema changes were made to flow through
# Alembic. A database that has tables but no alembic_version row was built by
# the old startup code and already holds this revision's schema, so it is
# stamped here - never at `head`, because that would mark the catch-up as done
# without running it.
PRE_CATCH_UP_REVISION = "7f3a91c2d8e4"

REPO_ROOT = Path(__file__).resolve().parents[2]


def alembic_config() -> Config:
    """Point Alembic at this checkout's migrations and this app's database.

    ``alembic.ini`` deliberately carries no URL (a hardcoded one is what made
    ``alembic upgrade`` migrate a file nobody was reading); ``alembic/env.py``
    fills it in from settings. The paths are set absolutely so this works from
    any working directory the server happens to have been started in.
    """
    config = Config(str(REPO_ROOT / "alembic.ini"))
    # %% again: ConfigParser interpolates these values, so a path containing
    # a percent sign would otherwise make the config unusable.
    script = str(REPO_ROOT / "alembic")
    config.set_main_option("script_location", script.replace("%", "%%"))
    config.set_main_option("prepend_sys_path", str(REPO_ROOT).replace("%", "%%"))
    return config


async def _describe_database(engine: AsyncEngine) -> tuple[bool, str | None]:
    """`(does it hold any tables, which revision is recorded)` - read only.

    Returns `(False, None)` for an empty database and `(True, None)` for one
    that has tables but has never been stamped by Alembic.
    """

    def _inspect(sync_conn):
        inspector = sa.inspect(sync_conn)
        names = set(inspector.get_table_names())
        has_tables = bool(names - {"alembic_version"})
        version = None
        if "alembic_version" in names:
            version = sync_conn.execute(
                sa.text("SELECT version_num FROM alembic_version")
            ).scalar()
        return has_tables, version

    async with engine.connect() as conn:
        return await conn.run_sync(_inspect)


async def _current_revision(engine: AsyncEngine) -> str | None:
    """Which revision the database itself says it is on.

    Read from the database, not from the scripts directory: reporting the
    script's head would claim success even if the upgrade had failed.
    """
    _, version = await _describe_database(engine)
    return version


async def run_schema_migrations(engine: AsyncEngine) -> list[str]:
    """Bring the database to the schema this code expects.

    Safe to call on every startup: an empty database is built, an untracked
    one is stamped and caught up, and an up-to-date one changes nothing.
    Returns a short human-readable note per step for the startup log.
    """
    has_tables, version = await _describe_database(engine)
    notes: list[str] = []
    config = alembic_config()

    if version is not None:
        # Ordinary case: tracked, possibly behind. Alembic decides.
        notes.append(f"database is at {version}; upgrading to head")
        await asyncio.to_thread(command.upgrade, config, "head")
    elif not has_tables:
        # A brand new database: the revisions are the schema, start to finish.
        notes.append("empty database: building the schema from the migrations")
        await asyncio.to_thread(command.upgrade, config, "head")
    else:
        # Tables, but no alembic_version: written by the old startup code.
        # Fill in any table the model grew later (create_all only ever *adds*),
        # then stamp and let the catch-up repair the columns.
        async with engine.begin() as conn:
            from app.core.database import Base

            await conn.run_sync(Base.metadata.create_all)
        notes.append("tables exist but were never stamped by Alembic")

        await asyncio.to_thread(command.stamp, config, PRE_CATCH_UP_REVISION)
        notes.append(f"stamped at {PRE_CATCH_UP_REVISION}; catching up")

        await asyncio.to_thread(command.upgrade, config, "head")

    notes.append(f"schema is at {await _current_revision(engine)}")
    return notes


__all__ = ["run_schema_migrations", "alembic_config", "PRE_CATCH_UP_REVISION"]

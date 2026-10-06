"""Alembic reads the *same* database the application does.

There is one place that decides which database this is: ``app.core.config``.
Until now ``alembic.ini`` pointed at ``sqlite:///./app.db`` while the app was
configured with something else, so ``alembic upgrade`` silently migrated a
file nobody was using - and every real schema change had to be hand-written
as an ``ALTER TABLE`` inside the startup code, where nothing could review it
or roll it back.

``alembic/env.py`` now takes the URL from settings (overridable with
``ALEMBIC_DATABASE_URL`` for tests and one-off jobs), converts the async
driver to the synchronous one Alembic needs, and passes the models as the
target metadata - so ``alembic revision --autogenerate`` sees what the code
actually wants and ``alembic upgrade head`` builds exactly that.
"""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv

# Хондани тағйирёбандаҳо аз файли .env
load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings
from app.core.database import Base
from app.models import *  # noqa: F401,F403 - registers every table in Base.metadata

config = context.config

target_metadata = Base.metadata


def synchronous_url() -> str:
    """The application's URL, with a driver Alembic can actually load.

    The app talks to the database asynchronously (``aiosqlite``/``asyncpg``);
    Alembic's command line and ``command.upgrade`` are synchronous and need
    the plain driver. Both spell the same database - only the dialect driver
    differs - so this is a swap of the driver, never of the target.

    ``DATABASE_URL_SYNC`` is deliberately *not* read here. It exists for the
    one-off ``scripts/migrate_sqlite_to_pg.py``, and its default points at
    PostgreSQL while ``.env`` on the server only sets ``DATABASE_URL`` to a
    SQLite file - so taking the sync URL from settings would have made
    ``alembic upgrade`` quietly migrate a database the server never opens.
    Deriving it from ``DATABASE_URL`` keeps one source of truth.
    """
    url = os.getenv("ALEMBIC_DATABASE_URL") or get_settings().DATABASE_URL
    if "+aiosqlite" in url:
        return url.replace("+aiosqlite", "")
    if "+asyncpg" in url:
        # psycopg2 ships with requirements.txt for exactly this
        return url.replace("+asyncpg", "+psycopg2")
    return url


# Anything reading sqlalchemy.url from alembic.ini would get a stale answer;
# this is set from settings before the engine (or offline mode) is built.
#
# %% is not decoration: ConfigParser interpolates these values with pyformat,
# so a literal percent anywhere in the URL - a password containing one, say -
# would make set_main_option raise, the lifespan would catch it, and every
# deploy would log "Schema migrations skipped" while never migrating anything.
config.set_main_option("sqlalchemy.url", synchronous_url().replace("%", "%%"))

if config.config_file_name is not None:
    # disable_existing_loggers=False: this runs inside a running server, and
    # wiping its loggers would leave uvicorn logging into nothing.
    fileConfig(config.config_file_name, disable_existing_loggers=False)


def run_migrations_offline() -> None:
    """Emit SQL without a database connection (``alembic upgrade --sql``)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

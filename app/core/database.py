from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine_kwargs = {"echo": settings.SQL_ECHO}
if settings.DATABASE_URL.startswith("sqlite"):
    # The pool keeps several connections inside this one process, and a page
    # view writes on every request, so writers queue behind one another;
    # waiting patiently (30s) beats failing the request after the driver's
    # 5-second default.
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)


def enable_sqlite_wal() -> None:
    """Switch the SQLite file to WAL journaling, if this deployment uses one.

    A property of the file, not of the connection, so one plain statement at
    startup is enough and every later connection inherits it.  In the default
    rollback journal a writer needs the file's *exclusive* lock, which readers
    refuse to hand over while the site is being browsed - the view counter, the
    geocoder task and the expiry sweeps then timed each other out with
    "database is locked".  WAL lets the readers and the single writer proceed
    side by side.  PostgreSQL deployments skip this entirely.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    import sqlite3

    # The URL's path is relative to the working directory, exactly as the
    # engine reads it.
    db_path = settings.DATABASE_URL.split("///", 1)[-1]
    try:
        connection = sqlite3.connect(db_path, timeout=30)
        try:
            connection.execute("PRAGMA journal_mode=WAL")
        finally:
            connection.close()
    except Exception:  # noqa: BLE001 - journaling mode is an optimisation
        pass

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

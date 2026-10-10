"""Alembic, not application code, is what defines the schema.

Two claims the review put to this repository, tested end to end against a
real database file rather than asserted in prose:

* ``alembic upgrade head`` on an empty database produces exactly what the
  models declare - no more, no less;
* a database written by the old startup code (``create_all`` plus hand-written
  ALTERs, no ``alembic_version`` row) is recognised, stamped and caught up
  without losing anything and without replaying the whole chain.

Both run against a temporary SQLite file: ``ALEMBIC_DATABASE_URL`` is what
``alembic/env.py`` reads first, so the migrations are pointed away from
whatever the app is configured with, and the application's own engine is never
touched.
"""

import asyncio
import os

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import Base
from app.models import *  # noqa: F401,F403  - registers every model on Base


@pytest.fixture
def alembic_db(tmp_path):
    """The migrations pointed at a throwaway file, restored afterwards.

    ``alembic/env.py`` reads ``ALEMBIC_DATABASE_URL`` first, which is how the
    migrations are diverted from whatever the application is configured with
    - the app's own engine is never touched by these tests.
    """
    db = tmp_path / "migrated.db"
    previous = os.environ.get("ALEMBIC_DATABASE_URL")
    os.environ["ALEMBIC_DATABASE_URL"] = f"sqlite:///{db}"
    try:
        yield db
    finally:
        if previous is None:
            os.environ.pop("ALEMBIC_DATABASE_URL", None)
        else:
            os.environ["ALEMBIC_DATABASE_URL"] = previous


def _schema(engine) -> dict[str, dict]:
    """`{table: {column: notnull}}` plus the indexes, from the live database."""
    inspector = inspect(engine)
    schema: dict[str, dict] = {}
    for table in sorted(set(inspector.get_table_names()) - {"alembic_version"}):
        columns = {
            column["name"]: not bool(column["nullable"])
            for column in inspector.get_columns(table)
        }
        columns["__indexes__"] = sorted(
            index["name"] for index in inspector.get_indexes(table)
        )
        schema[table] = columns
    return schema


def _declared_schema() -> dict[str, dict]:
    """The same shape, built from what the models declare."""
    schema: dict[str, dict] = {}
    for name, table in sorted(Base.metadata.tables.items()):
        columns = {column.name: not column.nullable for column in table.columns}
        columns["__indexes__"] = sorted(index.name for index in table.indexes)
        schema[name] = columns
    return schema


def test_upgrade_head_builds_exactly_the_schema_the_models_declare(alembic_db):
    from alembic import command

    from app.core.migrations import alembic_config

    assert not alembic_db.exists(), "the test needs an empty database"

    command.upgrade(alembic_config(), "head")

    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        built = _schema(engine)
        declared = _declared_schema()
        # The one column whose nullability the whole catch-up exists for.
        with engine.connect() as conn:
            booking_notnull = conn.execute(
                text(
                    'SELECT "notnull" FROM pragma_table_info(\'payments\') '
                    "WHERE name = 'booking_id'"
                )
            ).scalar_one()
    finally:
        engine.dispose()

    assert set(built) == set(declared), (
        "tables differ: "
        f"only in the migration {sorted(set(built) - set(declared))}, "
        f"only in the models {sorted(set(declared) - set(built))}"
    )
    assert built == declared, (
        "columns differ: "
        + str(
            {
                table: {
                    "migration": built[table],
                    "models": declared[table],
                }
                for table in built
                if built[table] != declared[table]
            }
        )
    )
    assert booking_notnull == 0, (
        "payments.booking_id must accept NULL (payment by request)"
    )


def test_a_database_the_old_startup_code_built_is_recognised_and_caught_up(
    alembic_db,
):
    """No alembic_version row, but tables - what every old server looks like."""
    from app.core.migrations import run_schema_migrations

    # What the old startup produced: every table from the models, none of the
    # history Alembic needs to know where the database already is.
    engine = create_engine(f"sqlite:///{alembic_db}")
    Base.metadata.create_all(engine)
    engine.dispose()

    async_engine = create_async_engine(f"sqlite+aiosqlite:///{alembic_db}")
    try:
        notes = asyncio.run(run_schema_migrations(async_engine))
    finally:
        asyncio.run(async_engine.dispose())

    assert any("never stamped" in note for note in notes), notes
    # the catch-up must land on the current head (the check-receipt revision)
    assert any("a3f9c2b71d04" in note for note in notes), notes

    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        assert _schema(engine) == _declared_schema()
        with engine.connect() as conn:
            stamped = conn.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
    finally:
        engine.dispose()
    assert stamped == "a3f9c2b71d04"


def test_running_the_migrations_again_changes_nothing(alembic_db):
    """Every deploy after the first one. Nothing must be altered."""
    from alembic import command

    from app.core.migrations import alembic_config

    command.upgrade(alembic_config(), "head")
    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        first = _schema(engine)
    finally:
        engine.dispose()

    command.upgrade(alembic_config(), "head")
    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        second = _schema(engine)
    finally:
        engine.dispose()

    assert second == first


def test_the_top_plan_catalogue_is_seeded_exactly_once(alembic_db):
    """The four plans must land on a database the migrations built.

    ``c7d2e5a9f3b1`` created the tables but its seed sat behind
    ``inspector.has_table`` - and SQLAlchemy 2.0 caches that answer per
    connection, so the freshly created table still read as "missing" and
    the inserts never ran. The follow-up revision ``e2c4f7a91b3d`` seeds
    by live count instead; this test is what keeps both honest: a fresh
    upgrade ends with the catalogue, a re-run doubles nothing.
    """
    from alembic import command

    from app.core.migrations import alembic_config

    command.upgrade(alembic_config(), "head")
    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        with engine.connect() as conn:
            plans = conn.execute(
                text(
                    "SELECT duration_key, price, is_active FROM top_plans ORDER BY id"
                )
            ).fetchall()
    finally:
        engine.dispose()

    assert [
        (key, float(price), bool(active)) for key, price, active in plans
    ] == [
        ("3h", 0.0, False),
        ("1d", 0.0, False),
        ("1w", 0.0, False),
        ("1m", 0.0, False),
    ], plans

    command.upgrade(alembic_config(), "head")
    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        with engine.connect() as conn:
            count = conn.execute(text("SELECT COUNT(*) FROM top_plans")).scalar_one()
    finally:
        engine.dispose()

    assert count == 4, "re-running the chain must not duplicate the catalogue"


def test_the_dc_intent_column_is_added_to_a_database_that_already_has_the_table(
    alembic_db,
):
    """The path the production server actually takes.

    ``topup_intents`` exists from before - created by the catch-up revision
    or by the old startup code - without ``promotion_id``, and this revision
    is the only thing that can add it. Two traps wait here: the ALTER must
    be plain (a SQLite dialect refuses to ALTER a constraint at all), and
    the table's existing index must survive the statement.

    A fresh database never reaches this code - there the catch-up revision
    creates the table from the model, column included - which is exactly
    why this test has to exist: it is the only one that runs the ALTER.
    """
    from alembic import command

    from app.core.migrations import alembic_config

    engine = create_engine(f"sqlite:///{alembic_db}")
    with engine.connect() as conn:
        conn.execute(
            text(
                "CREATE TABLE alembic_version ("
                "version_num VARCHAR(32) NOT NULL, "
                "PRIMARY KEY (version_num))"
            )
        )
        conn.execute(
            text(
                "CREATE TABLE topup_intents ("
                "id INTEGER NOT NULL, "
                "user_id INTEGER NOT NULL, "
                "amount NUMERIC NOT NULL, "
                "reference VARCHAR(40) NOT NULL, "
                "status VARCHAR(16) NOT NULL, "
                "provider VARCHAR(32) NOT NULL, "
                "raw_response TEXT, "
                "created_at TIMESTAMP NOT NULL, "
                "paid_at TIMESTAMP, "
                "PRIMARY KEY (id))"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX idx_topup_user_created "
                "ON topup_intents (user_id, created_at)"
            )
        )
        conn.execute(
            text(
                "INSERT INTO alembic_version (version_num) "
                "VALUES ('e2c4f7a91b3d')"
            )
        )
        conn.commit()
    engine.dispose()

    command.upgrade(alembic_config(), "head")

    engine = create_engine(f"sqlite:///{alembic_db}")
    try:
        inspector = inspect(engine)
        columns = {c["name"] for c in inspector.get_columns("topup_intents")}
        indexes = {i["name"] for i in inspector.get_indexes("topup_intents")}
        with engine.connect() as conn:
            stamped = conn.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
    finally:
        engine.dispose()

    assert "promotion_id" in columns, columns
    assert "payment_id" in columns, "the DC rental reference column arrives too"
    assert "ix_topup_intents_promotion_id" in indexes, indexes
    assert "idx_topup_user_created" in indexes, "the pre-existing index must survive"
    assert stamped == "a3f9c2b71d04"

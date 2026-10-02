"""Sanjishi 7: migrations + seed = IDEMPOTENT?

Davrai 1 -> baydad chizhoe nav dokhil shavand.
Davrai 2 -> hich chiz NE baiad dokhil shavand (0 = IDEMPOTENT).
"""
import asyncio
import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


async def main():
    from app.core.database import engine, Base
    from app.core.migrations import run_schema_migrations
    from app.seed_data import sync_cities, sync_categories

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[1/4] Base.metadata.create_all ... OK")

    r1 = await run_schema_migrations(engine)
    print("[2/4] run_schema_migrations RUN1 -> %d ta ozgarish" % len(r1))
    for c in r1:
        print("        +", c)

    r2 = await run_schema_migrations(engine)
    print("[3/4] run_schema_migrations RUN2 -> %d ta ozgarish" % len(r2))
    for c in r2:
        print("        +", c)

    city1 = await sync_cities()
    city2 = await sync_cities()
    cat1 = await sync_categories()
    cat2 = await sync_categories()
    print("[4/4] sync_cities     RUN1 -> %s" % city1)
    print("      sync_cities     RUN2 -> %s" % city2)
    print("      sync_categories RUN1 -> %s" % cat1)
    print("      sync_categories RUN2 -> %s" % cat2)

    ok = len(r2) == 0
    print("")
    print("NATIJA (migrations idempotent): %s" % ("OK" if ok else "FAIL"))
    if r2:
        for c in r2:
            print("   ! RUN2 hal ham chize dokhil kard:", c)


asyncio.run(main())

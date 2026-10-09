from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.database import engine
from app.core.migrations import run_schema_migrations
from app.api.router import api_router

settings = get_settings()

UPLOAD_DIR = Path("uploads")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic is the only thing that decides what the schema looks like:
    # an empty database is built from the revisions, one written by the old
    # startup code is stamped and caught up, an up-to-date one is left alone.
    try:
        applied = await run_schema_migrations(engine)
        for change in applied:
            print(f"  - {change}")
    except Exception as e:
        print(f"Schema migrations skipped: {e}")
    UPLOAD_DIR.mkdir(exist_ok=True)
    try:
        from app.seed_data import seed_database, sync_categories, sync_cities
        await seed_database()
        await sync_cities()
        await sync_categories()
    except Exception as e:
        print(f"Seed skipped: {e}")

    from app.services.listing_expiry import run_expiry_loop
    from app.services.rental_expiry import run_rental_expiry_loop
    from app.services.top_expiry import run_top_expiry_loop
    expiry_task = asyncio.create_task(run_expiry_loop())
    rental_expiry_task = asyncio.create_task(run_rental_expiry_loop())
    top_expiry_task = asyncio.create_task(run_top_expiry_loop())
    try:
        yield
    finally:
        expiry_task.cancel()
        rental_expiry_task.cancel()
        top_expiry_task.cancel()
        for task in (expiry_task, rental_expiry_task, top_expiry_task):
            try:
                await task
            except asyncio.CancelledError:
                pass
        await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Equipment Rental Management System API",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

if UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME, "version": settings.APP_VERSION}

import asyncio
import os
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.database import Base, get_db
from app.core.config import get_settings
from app.main import app
from app.core.enums import UserRole
from app.models.user import User

settings = get_settings()

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rentflow:rentflow@localhost:5432/rentflow_test",
)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session
        await session.commit()


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


def _create_token(external_user_id: str, role: UserRole) -> str:
    from datetime import datetime, timedelta
    from jose import jwt
    expire = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": external_user_id,
        "role": role.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def _ensure_user(email: str, role: UserRole) -> tuple[int, str]:
    """Create (or reuse) a user in its own committed session so that requests
    made through the app's own DB session can see it."""
    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                email=email,
                hashed_password="",
                external_user_id=str(uuid.uuid4()),
                role=role,
            )
            session.add(user)
            await session.flush()
        user_id, external_id = user.id, user.external_user_id
        await session.commit()
        return user_id, external_id


@pytest_asyncio.fixture
async def admin_token(setup_db) -> str:
    _, external_id = await _ensure_user("test_admin@rentflow.com", UserRole.ADMIN)
    return _create_token(external_id, UserRole.ADMIN)


@pytest_asyncio.fixture
async def customer_token(setup_db) -> str:
    _, external_id = await _ensure_user("test_customer@rentflow.com", UserRole.CUSTOMER)
    return _create_token(external_id, UserRole.CUSTOMER)


@pytest_asyncio.fixture
async def customer_id(setup_db) -> int:
    user_id, _ = await _ensure_user("test_customer@rentflow.com", UserRole.CUSTOMER)
    return user_id


@pytest_asyncio.fixture
async def admin_client(admin_token: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers["Authorization"] = f"Bearer {admin_token}"
        yield ac


@pytest_asyncio.fixture
async def customer_client(customer_token: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers["Authorization"] = f"Bearer {customer_token}"
        yield ac


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

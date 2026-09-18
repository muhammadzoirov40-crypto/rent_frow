import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.database import Base, get_db
from app.core.config import get_settings
from app.main import app
from app.core.enums import UserRole

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
        await session.rollback()


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


@pytest_asyncio.fixture
async def admin_token(db_session: AsyncSession):
    from app.repositories.user import UserRepository
    from app.models.user import User
    from sqlalchemy import select
    import uuid

    external_id = str(uuid.uuid4())
    result = await db_session.execute(select(User).where(User.email == "test_admin@rentflow.com"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email="test_admin@rentflow.com",
            hashed_password="",
            external_user_id=external_id,
            role=UserRole.ADMIN,
        )
        db_session.add(user)
        await db_session.flush()
    return _create_token(user.external_user_id, UserRole.ADMIN)


@pytest_asyncio.fixture
async def customer_token(db_session: AsyncSession):
    from app.models.user import User
    from sqlalchemy import select
    import uuid

    external_id = str(uuid.uuid4())
    result = await db_session.execute(select(User).where(User.email == "test_customer@rentflow.com"))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email="test_customer@rentflow.com",
            hashed_password="",
            external_user_id=external_id,
            role=UserRole.CUSTOMER,
        )
        db_session.add(user)
        await db_session.flush()
    return _create_token(user.external_user_id, UserRole.CUSTOMER)


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

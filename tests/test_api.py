import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_create_category(admin_client: AsyncClient):
    response = await admin_client.post(
        "/api/v1/categories",
        json={"name": "Cameras", "description": "Professional cameras"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Cameras"


@pytest.mark.asyncio
async def test_create_category_duplicate(admin_client: AsyncClient):
    await admin_client.post("/api/v1/categories", json={"name": "Lenses"})
    response = await admin_client.post("/api/v1/categories", json={"name": "Lenses"})
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_categories(customer_client: AsyncClient):
    await customer_client.post(
        "/api/v1/categories",
        json={"name": "Audio"},
        headers={"Authorization": "Bearer test"},
    )
    response = await customer_client.get("/api/v1/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 0


@pytest.mark.asyncio
async def test_update_category(admin_client: AsyncClient):
    create = await admin_client.post("/api/v1/categories", json={"name": "Old Name"})
    cat_id = create.json()["data"]["id"]
    response = await admin_client.put(
        f"/api/v1/categories/{cat_id}",
        json={"name": "New Name"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_category(admin_client: AsyncClient):
    create = await admin_client.post("/api/v1/categories", json={"name": "ToDelete"})
    cat_id = create.json()["data"]["id"]
    response = await admin_client.delete(f"/api/v1/categories/{cat_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_equipment(admin_client: AsyncClient):
    cat = await admin_client.post("/api/v1/categories", json={"name": "Cameras"})
    cat_id = cat.json()["data"]["id"]

    response = await admin_client.post(
        "/api/v1/equipment",
        json={
            "category_id": cat_id,
            "name": "Canon EOS R5",
            "serial_number": "SN-001",
            "price_per_day": 50.0,
            "deposit_amount": 500.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "Canon EOS R5"
    assert data["data"]["serial_number"] == "SN-001"


@pytest.mark.asyncio
async def test_create_equipment_duplicate_serial(admin_client: AsyncClient):
    cat = await admin_client.post("/api/v1/categories", json={"name": "Cameras"})
    cat_id = cat.json()["data"]["id"]

    await admin_client.post(
        "/api/v1/equipment",
        json={
            "category_id": cat_id,
            "name": "Camera 1",
            "serial_number": "SN-DUP",
            "price_per_day": 50.0,
            "deposit_amount": 500.0,
        },
    )
    response = await admin_client.post(
        "/api/v1/equipment",
        json={
            "category_id": cat_id,
            "name": "Camera 2",
            "serial_number": "SN-DUP",
            "price_per_day": 60.0,
            "deposit_amount": 600.0,
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_equipment(customer_client: AsyncClient):
    cat_response = await customer_client.get("/api/v1/categories")
    response = await customer_client.get("/api/v1/equipment")
    assert response.status_code == 200
    assert response.json()["total"] >= 0


@pytest.mark.asyncio
async def test_check_availability(customer_client: AsyncClient, admin_client: AsyncClient):
    cat = await admin_client.post("/api/v1/categories", json={"name": "AvailCat"})
    cat_id = cat.json()["data"]["id"]
    equip = await admin_client.post(
        "/api/v1/equipment",
        json={
            "category_id": cat_id,
            "name": "Avail Equip",
            "serial_number": "SN-AVAIL",
            "price_per_day": 40.0,
            "deposit_amount": 400.0,
        },
    )
    equip_id = equip.json()["data"]["id"]

    response = await customer_client.post(
        "/api/v1/equipment/availability",
        json={
            "equipment_id": equip_id,
            "start_date": "2026-10-01",
            "end_date": "2026-10-05",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["available"] is True


@pytest.mark.asyncio
async def test_category_unauthorized(client: AsyncClient):
    response = await client.post(
        "/api/v1/categories",
        json={"name": "Unauthorized"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_equipment_list_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/equipment")
    assert response.status_code == 401

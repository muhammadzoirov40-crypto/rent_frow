async def test_admin_chart_data(admin_client):
    response = await admin_client.get("/api/v1/admin/chart-data")
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["requestsByDay"]) == 30
    assert all({"date", "count"} == set(point) for point in data["requestsByDay"])
    assert isinstance(data["listingsByStatus"], list)
    assert isinstance(data["requestsByStatus"], list)
    assert isinstance(data["usersByRole"], list)


async def test_admin_chart_data_requires_admin(customer_client):
    response = await customer_client.get("/api/v1/admin/chart-data")
    assert response.status_code == 403

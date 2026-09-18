import pytest
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.equipment import EquipmentService
from app.services.booking import BookingService
from app.services.category import CategoryService
from app.schemas.equipment import EquipmentCreate, AvailabilityCheck
from app.schemas.booking import BookingCreate
from app.schemas.category import CategoryCreate


@pytest.mark.asyncio
async def test_price_calculation(db_session: AsyncSession):
    cat_service = CategoryService(db_session)
    cat = await cat_service.create(CategoryCreate(name="TestCat"))

    equip_service = EquipmentService(db_session)
    equip = await equip_service.create(
        EquipmentCreate(
            category_id=cat.id,
            name="Test Camera",
            serial_number="SN-PRICE-001",
            price_per_day=100.0,
            deposit_amount=500.0,
        )
    )

    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=5)

    booking_service = BookingService(db_session)
    booking = await booking_service.create(
        customer_id=1,
        data=BookingCreate(equipment_id=equip.id, start_date=start, end_date=end),
    )

    assert booking.total_price == 500.0
    assert booking.deposit_amount == 500.0


@pytest.mark.asyncio
async def test_availability_check(db_session: AsyncSession):
    cat_service = CategoryService(db_session)
    cat = await cat_service.create(CategoryCreate(name="AvailTestCat"))

    equip_service = EquipmentService(db_session)
    equip = await equip_service.create(
        EquipmentCreate(
            category_id=cat.id,
            name="Avail Camera",
            serial_number="SN-AVAIL-001",
            price_per_day=80.0,
            deposit_amount=400.0,
        )
    )

    start = date.today() + timedelta(days=10)
    end = start + timedelta(days=5)

    result = await equip_service.check_availability(
        AvailabilityCheck(equipment_id=equip.id, start_date=start, end_date=end)
    )
    assert result["available"] is True

    booking_service = BookingService(db_session)
    await booking_service.create(
        customer_id=1,
        data=BookingCreate(equipment_id=equip.id, start_date=start, end_date=end),
    )

    result2 = await equip_service.check_availability(
        AvailabilityCheck(
            equipment_id=equip.id,
            start_date=start + timedelta(days=2),
            end_date=end - timedelta(days=1),
        )
    )
    assert result2["available"] is False
    assert result2["conflicting_booking_id"] is not None


@pytest.mark.asyncio
async def test_overlap_detection(db_session: AsyncSession):
    cat_service = CategoryService(db_session)
    cat = await cat_service.create(CategoryCreate(name="OverlapCat"))

    equip_service = EquipmentService(db_session)
    equip = await equip_service.create(
        EquipmentCreate(
            category_id=cat.id,
            name="Overlap Camera",
            serial_number="SN-OVERLAP-001",
            price_per_day=120.0,
            deposit_amount=600.0,
        )
    )

    start1 = date(2026, 9, 10)
    end1 = date(2026, 9, 15)

    booking_service = BookingService(db_session)
    await booking_service.create(
        customer_id=1,
        data=BookingCreate(equipment_id=equip.id, start_date=start1, end_date=end1),
    )

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await booking_service.create(
            customer_id=2,
            data=BookingCreate(
                equipment_id=equip.id,
                start_date=date(2026, 9, 12),
                end_date=date(2026, 9, 14),
            ),
        )
    assert exc_info.value.status_code == 409

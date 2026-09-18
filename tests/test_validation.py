import pytest
from pydantic import ValidationError
from app.schemas.equipment import EquipmentCreate, AvailabilityCheck
from app.schemas.booking import BookingCreate
from datetime import date, timedelta


def test_equipment_create_validation():
    with pytest.raises(ValidationError):
        EquipmentCreate(
            category_id=1,
            name="",
            serial_number="SN-001",
            price_per_day=50.0,
            deposit_amount=500.0,
        )


def test_equipment_create_negative_price():
    with pytest.raises(ValidationError):
        EquipmentCreate(
            category_id=1,
            name="Camera",
            serial_number="SN-002",
            price_per_day=-10.0,
            deposit_amount=500.0,
        )


def test_equipment_create_negative_deposit():
    with pytest.raises(ValidationError):
        EquipmentCreate(
            category_id=1,
            name="Camera",
            serial_number="SN-003",
            price_per_day=50.0,
            deposit_amount=-100.0,
        )


def test_availability_check_end_before_start():
    with pytest.raises(ValidationError):
        AvailabilityCheck(
            equipment_id=1,
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 5),
        )


def test_booking_end_before_start():
    with pytest.raises(ValidationError):
        BookingCreate(
            equipment_id=1,
            start_date=date(2026, 10, 10),
            end_date=date(2026, 10, 5),
        )


def test_booking_valid_dates():
    booking = BookingCreate(
        equipment_id=1,
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 5),
    )
    assert booking.start_date < booking.end_date

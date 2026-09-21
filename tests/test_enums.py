import pytest
from app.core.enums import UserRole, EquipmentStatus, BookingStatus, RentalStatus


def test_user_roles():
    assert UserRole.CUSTOMER.value == "CUSTOMER"
    assert UserRole.ADMIN.value == "ADMIN"
    assert UserRole.OWNER.value == "OWNER"
    assert len(UserRole) == 3


def test_equipment_statuses():
    assert EquipmentStatus.AVAILABLE.value == "AVAILABLE"
    assert EquipmentStatus.RESERVED.value == "RESERVED"
    assert EquipmentStatus.RENTED.value == "RENTED"
    assert EquipmentStatus.MAINTENANCE.value == "MAINTENANCE"
    assert EquipmentStatus.INACTIVE.value == "INACTIVE"


def test_booking_statuses():
    assert BookingStatus.PENDING.value == "PENDING"
    assert BookingStatus.CONFIRMED.value == "CONFIRMED"
    assert BookingStatus.CANCELLED.value == "CANCELLED"
    assert BookingStatus.REJECTED.value == "REJECTED"
    assert BookingStatus.COMPLETED.value == "COMPLETED"


def test_rental_statuses():
    assert RentalStatus.RESERVED.value == "RESERVED"
    assert RentalStatus.PICKED_UP.value == "PICKED_UP"
    assert RentalStatus.ACTIVE.value == "ACTIVE"
    assert RentalStatus.RETURN_REQUESTED.value == "RETURN_REQUESTED"
    assert RentalStatus.RETURNED.value == "RETURNED"
    assert RentalStatus.INSPECTING.value == "INSPECTING"
    assert RentalStatus.COMPLETED.value == "COMPLETED"

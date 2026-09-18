from typing import Optional
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.booking import BookingRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.booking import BookingCreate
from app.models.booking import Booking
from app.core.enums import BookingStatus, EquipmentStatus


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.booking_repo = BookingRepository(db)
        self.equipment_repo = EquipmentRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create(self, customer_id: int, data: BookingCreate) -> Booking:
        equipment = await self.equipment_repo.get_by_id(data.equipment_id)
        if not equipment:
            raise HTTPException(status_code=404, detail="Equipment not found")

        if not equipment.is_active:
            raise HTTPException(status_code=400, detail="Equipment is not active")

        if equipment.status != EquipmentStatus.AVAILABLE:
            raise HTTPException(status_code=409, detail="Equipment is not available for booking")

        conflicting = await self.equipment_repo.check_availability(
            data.equipment_id, data.start_date, data.end_date
        )
        if conflicting is not None:
            raise HTTPException(status_code=409, detail="Equipment is already booked for these dates")

        number_of_days = (data.end_date - data.start_date).days
        if number_of_days <= 0:
            raise HTTPException(status_code=400, detail="Booking must be for at least 1 day")

        total_price = number_of_days * float(equipment.price_per_day)
        deposit_amount = float(equipment.deposit_amount)

        booking = await self.booking_repo.create(
            customer_id=customer_id,
            equipment_id=data.equipment_id,
            start_date=data.start_date,
            end_date=data.end_date,
            total_price=total_price,
            deposit_amount=deposit_amount,
            status=BookingStatus.PENDING,
        )

        await self.equipment_repo.update(equipment, status=EquipmentStatus.RESERVED)

        await self.audit_repo.create(
            user_id=customer_id,
            action="booking_created",
            entity_type="booking",
            entity_id=booking.id,
            new_data={
                "equipment_id": data.equipment_id,
                "start_date": str(data.start_date),
                "end_date": str(data.end_date),
                "total_price": total_price,
            },
        )

        return booking

    async def get_by_id(self, booking_id: int) -> Booking:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking

    async def get_customer_bookings(
        self, customer_id: int, status: Optional[BookingStatus] = None, skip: int = 0, limit: int = 20
    ) -> tuple[list[Booking], int]:
        items = await self.booking_repo.get_customer_bookings(customer_id, status, skip, limit)
        total = await self.booking_repo.count_customer_bookings(customer_id, status)
        return items, total

    async def get_all_bookings(
        self, status: Optional[BookingStatus] = None, skip: int = 0, limit: int = 20
    ) -> tuple[list[Booking], int]:
        items = await self.booking_repo.get_all_bookings(status, skip, limit)
        total = await self.booking_repo.count_all_bookings(status)
        return items, total

    async def cancel_booking(self, customer_id: int, booking_id: int) -> Booking:
        booking = await self.get_by_id(booking_id)
        if booking.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel booking in {booking.status.value} status",
            )

        old_status = booking.status.value
        booking = await self.booking_repo.update(booking, status=BookingStatus.CANCELLED)

        equipment = await self.equipment_repo.get_by_id(booking.equipment_id)
        if equipment:
            has_other = await self.booking_repo.has_active_booking_for_equipment(booking.equipment_id)
            if not has_other:
                await self.equipment_repo.update(equipment, status=EquipmentStatus.AVAILABLE)

        await self.audit_repo.create(
            user_id=customer_id,
            action="booking_cancelled",
            entity_type="booking",
            entity_id=booking.id,
            old_data={"status": old_status},
            new_data={"status": BookingStatus.CANCELLED.value},
        )

        return booking

    async def confirm_booking(self, admin_id: int, booking_id: int) -> Booking:
        booking = await self.get_by_id(booking_id)
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot confirm booking in {booking.status.value} status",
            )

        old_status = booking.status.value
        booking = await self.booking_repo.update(booking, status=BookingStatus.CONFIRMED)

        await self.audit_repo.create(
            user_id=admin_id,
            action="booking_confirmed",
            entity_type="booking",
            entity_id=booking.id,
            old_data={"status": old_status},
            new_data={"status": BookingStatus.CONFIRMED.value},
        )

        return booking

    async def reject_booking(self, admin_id: int, booking_id: int) -> Booking:
        booking = await self.get_by_id(booking_id)
        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject booking in {booking.status.value} status",
            )

        old_status = booking.status.value
        booking = await self.booking_repo.update(booking, status=BookingStatus.REJECTED)

        equipment = await self.equipment_repo.get_by_id(booking.equipment_id)
        if equipment:
            has_other = await self.booking_repo.has_active_booking_for_equipment(booking.equipment_id)
            if not has_other:
                await self.equipment_repo.update(equipment, status=EquipmentStatus.AVAILABLE)

        await self.audit_repo.create(
            user_id=admin_id,
            action="booking_rejected",
            entity_type="booking",
            entity_id=booking.id,
            old_data={"status": old_status},
            new_data={"status": BookingStatus.REJECTED.value},
        )

        return booking

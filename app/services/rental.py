from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.rental import RentalRepository
from app.repositories.booking import BookingRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.rental import ReturnRequest
from app.models.rental import Rental
from app.core.enums import (
    BookingStatus, RentalStatus, EquipmentStatus,
)


class RentalService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.rental_repo = RentalRepository(db)
        self.booking_repo = BookingRepository(db)
        self.equipment_repo = EquipmentRepository(db)
        self.audit_repo = AuditLogRepository(db)

    async def create_from_booking(self, admin_id: int, booking_id: int) -> Rental:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=400,
                detail="Only confirmed bookings can be converted to rentals",
            )

        existing = await self.rental_repo.get_by_booking_id(booking_id)
        if existing:
            raise HTTPException(status_code=409, detail="Rental already exists for this booking")

        number_of_days = (booking.end_date - booking.start_date).days
        expected_return_at = datetime.utcnow() + timedelta(days=number_of_days)

        rental = await self.rental_repo.create(
            booking_id=booking_id,
            equipment_id=booking.equipment_id,
            customer_id=booking.customer_id,
            expected_return_at=expected_return_at,
            status=RentalStatus.RESERVED,
        )

        await self.equipment_repo.update(
            await self.equipment_repo.get_by_id(booking.equipment_id),
            status=EquipmentStatus.RESERVED,
        )

        await self.booking_repo.update(booking, status=BookingStatus.COMPLETED)

        await self.audit_repo.create(
            user_id=admin_id,
            action="rental_created",
            entity_type="rental",
            entity_id=rental.id,
            new_data={"booking_id": booking_id, "equipment_id": booking.equipment_id},
        )

        return rental

    async def pickup(self, admin_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.RESERVED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot pickup rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(
            rental,
            status=RentalStatus.PICKED_UP,
            pickup_at=datetime.utcnow(),
        )

        equipment = await self.equipment_repo.get_by_id(rental.equipment_id)
        if equipment:
            await self.equipment_repo.update(equipment, status=EquipmentStatus.RENTED)

        await self.audit_repo.create(
            user_id=admin_id,
            action="equipment_picked_up",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.PICKED_UP.value},
        )

        return rental

    async def activate(self, admin_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.PICKED_UP:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot activate rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(rental, status=RentalStatus.ACTIVE)

        await self.audit_repo.create(
            user_id=admin_id,
            action="rental_activated",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.ACTIVE.value},
        )

        return rental

    async def request_return(self, customer_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        if rental.status != RentalStatus.ACTIVE:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot request return for rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(rental, status=RentalStatus.RETURN_REQUESTED)

        await self.audit_repo.create(
            user_id=customer_id,
            action="return_requested",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.RETURN_REQUESTED.value},
        )

        return rental

    async def accept_return(self, admin_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.RETURN_REQUESTED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot accept return for rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(
            rental,
            status=RentalStatus.RETURNED,
            returned_at=datetime.utcnow(),
        )

        await self.audit_repo.create(
            user_id=admin_id,
            action="return_accepted",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.RETURNED.value},
        )

        return rental

    async def start_inspection(self, admin_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.RETURNED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start inspection for rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(rental, status=RentalStatus.INSPECTING)

        await self.audit_repo.create(
            user_id=admin_id,
            action="inspection_started",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.INSPECTING.value},
        )

        return rental

    async def complete_rental(self, admin_id: int, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")

        if rental.status != RentalStatus.INSPECTING:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete rental in {rental.status.value} status",
            )

        old_status = rental.status.value
        rental = await self.rental_repo.update(rental, status=RentalStatus.COMPLETED)

        equipment = await self.equipment_repo.get_by_id(rental.equipment_id)
        if equipment:
            await self.equipment_repo.update(equipment, status=EquipmentStatus.AVAILABLE)

        await self.audit_repo.create(
            user_id=admin_id,
            action="rental_completed",
            entity_type="rental",
            entity_id=rental.id,
            old_data={"status": old_status},
            new_data={"status": RentalStatus.COMPLETED.value},
        )

        return rental

    async def get_by_id(self, rental_id: int) -> Rental:
        rental = await self.rental_repo.get_by_id(rental_id)
        if not rental:
            raise HTTPException(status_code=404, detail="Rental not found")
        return rental

    async def get_customer_rentals(
        self, customer_id: int, skip: int = 0, limit: int = 20
    ) -> tuple[list[Rental], int]:
        items = await self.rental_repo.get_customer_rentals(customer_id, skip=skip, limit=limit)
        total = await self.rental_repo.count_customer_rentals(customer_id)
        return items, total

    async def get_all_rentals(
        self, status=None, skip: int = 0, limit: int = 20
    ) -> tuple[list[Rental], int]:
        items = await self.rental_repo.get_all_rentals(status, skip, limit)
        total = await self.rental_repo.count_all_rentals()
        return items, total

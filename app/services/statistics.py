from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.equipment import EquipmentRepository
from app.repositories.booking import BookingRepository
from app.repositories.rental import RentalRepository
from app.repositories.payment import PaymentRepository
from app.repositories.penalty import PenaltyRepository
from app.repositories.user import UserRepository
from app.core.enums import (
    EquipmentStatus, BookingStatus, RentalStatus,
    PaymentStatus, PaymentType, UserRole,
)
from app.schemas.statistics import StatisticsResponse


class StatisticsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.equipment_repo = EquipmentRepository(db)
        self.booking_repo = BookingRepository(db)
        self.rental_repo = RentalRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.penalty_repo = PenaltyRepository(db)
        self.user_repo = UserRepository(db)

    async def get_statistics(self) -> StatisticsResponse:
        total_equipment = await self.equipment_repo.count()

        from sqlalchemy import select, func
        from app.models.equipment import Equipment

        available = await self.db.execute(
            select(func.count()).select_from(Equipment).where(
                Equipment.status == EquipmentStatus.AVAILABLE,
                Equipment.is_active == True,
            )
        )
        rented = await self.db.execute(
            select(func.count()).select_from(Equipment).where(
                Equipment.status == EquipmentStatus.RENTED,
            )
        )
        maintenance = await self.db.execute(
            select(func.count()).select_from(Equipment).where(
                Equipment.status == EquipmentStatus.MAINTENANCE,
            )
        )

        total_bookings = await self.booking_repo.count_all_bookings()
        pending_bookings = await self.booking_repo.count_all_bookings(BookingStatus.PENDING)
        confirmed_bookings = await self.booking_repo.count_all_bookings(BookingStatus.CONFIRMED)

        active_rentals = await self.rental_repo.count_active_rentals()
        total_rentals = await self.rental_repo.count_all_rentals()

        total_revenue = await self.payment_repo.get_total_revenue()
        total_penalties = await self.penalty_repo.get_total_penalties_amount()
        total_customers = await self.user_repo.count_by_role(UserRole.CUSTOMER)

        return StatisticsResponse(
            total_equipment=total_equipment,
            available_equipment=available.scalar_one(),
            rented_equipment=rented.scalar_one(),
            maintenance_equipment=maintenance.scalar_one(),
            total_bookings=total_bookings,
            pending_bookings=pending_bookings,
            confirmed_bookings=confirmed_bookings,
            total_rentals=total_rentals,
            active_rentals=active_rentals,
            total_revenue=float(total_revenue),
            total_penalties=float(total_penalties),
            total_customers=total_customers,
        )

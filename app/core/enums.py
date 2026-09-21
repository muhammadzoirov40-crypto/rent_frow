import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"
    OWNER = "OWNER"


class ListingStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    RENTED = "RENTED"
    EXPIRED = "EXPIRED"
    REMOVED = "REMOVED"


class PriceUnit(str, enum.Enum):
    PER_HOUR = "per_hour"
    PER_DAY = "per_day"
    PER_WEEK = "per_week"
    PER_MONTH = "per_month"


class RentalRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class EquipmentStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    RENTED = "RENTED"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"


class EquipmentCondition(str, enum.Enum):
    NEW = "NEW"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class RentalStatus(str, enum.Enum):
    RESERVED = "RESERVED"
    PICKED_UP = "PICKED_UP"
    ACTIVE = "ACTIVE"
    RETURN_REQUESTED = "RETURN_REQUESTED"
    RETURNED = "RETURNED"
    INSPECTING = "INSPECTING"
    COMPLETED = "COMPLETED"


class PaymentType(str, enum.Enum):
    BOOKING = "BOOKING"
    DEPOSIT = "DEPOSIT"
    DAMAGE = "DAMAGE"
    LATE_FEE = "LATE_FEE"
    REFUND = "REFUND"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class MaintenanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class PenaltyStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    WAIVED = "WAIVED"


class NotificationType(str, enum.Enum):
    RENTAL_REQUEST = "rental_request"
    RENTAL_ACCEPTED = "rental_accepted"
    RENTAL_REJECTED = "rental_rejected"
    NEW_MESSAGE = "new_message"
    NEW_REVIEW = "new_review"
    LISTING_APPROVED = "listing_approved"
    LISTING_REJECTED = "listing_rejected"
    RENTAL_ENDING = "rental_ending"

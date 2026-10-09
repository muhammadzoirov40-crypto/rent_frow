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


class PropertyType(str, enum.Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    OFFICE = "office"
    ROOM = "room"
    COMMERCIAL = "commercial"
    OTHER = "other"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    REQUEST_INFO = "request_info"


class PostStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


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


class WalletTransactionType(str, enum.Enum):
    """Every way money can move in a user's wallet.

    TOPUP     money comes in (manual credit — there is no payment gateway on
              the free tier, so a top-up is an explicit ledger entry).
    HELD      available -> reserved, when a rental request is created.
    RELEASED  reserved -> available, when a hold ends without the rent ever
              having been collected (rejected / cancelled before payment).
    REFUNDED  reserved -> available, when the rent HAD been collected (a PAID
              payment exists) and is now given back.
    COMPLETED the reserved rent is settled: it leaves the wallet for good when
              the rental is completed.
    PROMO     a TOP promotion was bought: the price leaves the available
              balance for good, recorded once per promotion.
    """

    TOPUP = "TOPUP"
    HELD = "HELD"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"
    COMPLETED = "COMPLETED"
    PROMO = "PROMO"


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
    RENTAL_CANCELLED = "rental_cancelled"
    RENTAL_COMPLETED = "rental_completed"
    NEW_MESSAGE = "new_message"
    NEW_REVIEW = "new_review"
    NEW_FAVORITE = "new_favorite"
    NEW_COMMENT = "new_comment"
    LISTING_APPROVED = "listing_approved"
    LISTING_REJECTED = "listing_rejected"
    LISTING_EXPIRED = "listing_expired"
    LISTING_DEACTIVATED = "listing_deactivated"
    LISTING_REQUEST_INFO = "listing_request_info"
    RENTAL_ENDING = "rental_ending"


class TopPromotionStatus(str, enum.Enum):
    """Lifecycle of one paid TOP window.

    PENDING   requested, not paid and not yet approved - never shown as TOP.
    ACTIVE    paid or approved: ``expires_at`` is live, the badge shows.
    EXPIRED   the window ran out server-side; history, no badge, no re-charge.
    REJECTED  admin declined the request (``reject_reason`` says why).
    CANCELLED admin deactivated an active window by hand.
    """

    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class TopPromotionPayment(str, enum.Enum):
    """How (and whether) the promotion was paid for.

    UNPAID   awaiting money or an admin decision - status stays PENDING.
    PAID     charged from the wallet at request time (server-side CAS).
    APPROVED an admin authorised it without a wallet charge.
    REFUNDED PAID, then given back when an admin deactivated the window.
    """

    UNPAID = "UNPAID"
    PAID = "PAID"
    APPROVED = "APPROVED"
    REFUNDED = "REFUNDED"

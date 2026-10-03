from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rental_request import RentalRequest, RentalRequestStatus
from app.models.listing import Listing, PriceUnit
from app.repositories.rental_request import RentalRequestRepository
from app.repositories.listing import ListingRepository
from app.repositories.user import UserRepository
from app.services.notification import NotificationService
from app.repositories.conversation import ConversationRepository
from app.services.message import MessageService
from app.services import email as mailer
from app.services import system_message
from app.services.wallet import WalletService
from app.schemas.rental_request import RentalRequestCreate


def calculate_total_days(start_date: date, end_date: date) -> int:
    delta = end_date - start_date
    return max(delta.days, 1)


def calculate_total_price(listing: Listing, total_days: int) -> float:
    price = float(listing.price)
    unit = listing.price_unit
    if unit == PriceUnit.PER_HOUR:
        days_in_unit = 1
        hours = total_days * 24
        return price * hours
    elif unit == PriceUnit.PER_DAY:
        return price * total_days
    elif unit == PriceUnit.PER_WEEK:
        return price * (total_days / 7)
    elif unit == PriceUnit.PER_MONTH:
        return price * (total_days / 30)
    return price * total_days


class RentalRequestService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = RentalRequestRepository(db)
        self.listing_repo = ListingRepository(db)
        self.user_repo = UserRepository(db)
        self.notif_service = NotificationService(db)
        self.conv_repo = ConversationRepository(db)
        self.message_service = MessageService(db)
        # The money side of a rental request lives entirely in the wallet:
        # it decides affordability, holds TOTAL while the request is alive and
        # releases / refunds / settles it when the request ends.
        self.wallet = WalletService(db)

    # ── chat + email plumbing, shared by create / accept / reject ────────────
    async def _conversation(self, request: RentalRequest):
        """The chat this request lives in, created and tagged on first use."""
        conv = await self.conv_repo.get_by_rental_request(request.id)
        if not conv:
            conv = await self.conv_repo.get_or_create(
                request.renter_id, request.owner_id, request.listing_id
            )
            conv.rental_request_id = request.id
            await self.db.flush()
        return conv

    async def _post_system(self, conversation, sender_id: int, text: str) -> None:
        """Write RentHub's own line into the chat.

        A chat hiccup (websocket down, notification failed) must not roll back
        the rental decision itself, so it is logged and swallowed.
        """
        try:
            await self.message_service.send(conversation.id, sender_id, text)
        except Exception as exc:  # noqa: BLE001
            print(f"[chat] system message in conversation {conversation.id} failed: {exc}", flush=True)

    @staticmethod
    def _display_name(user) -> str:
        if not user:
            return ""
        return user.display_name or (user.email or "").split("@")[0]

    async def create(self, renter_id: int, data: RentalRequestCreate) -> RentalRequest:
        listing = await self.listing_repo.get_by_id(data.listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing.owner_id == renter_id:
            raise HTTPException(status_code=400, detail="Cannot rent your own listing")
        if data.start_date >= data.end_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")

        has_conflict = await self.repo.check_date_conflicts(
            data.listing_id, data.start_date, data.end_date
        )
        if has_conflict:
            raise HTTPException(status_code=409, detail="Listing is not available for the selected dates")

        total_days = calculate_total_days(data.start_date, data.end_date)
        total_price = calculate_total_price(listing, total_days)
        deposit_amount = float(listing.deposit)

        # Backend is the source of truth for balances: refuse before anything
        # is written when TOTAL = price x duration is more than the renter's
        # available (not held) balance.
        if not await self.wallet.can_afford(renter_id, total_price):
            raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")

        request = await self.repo.create(
            listing_id=data.listing_id,
            renter_id=renter_id,
            owner_id=listing.owner_id,
            start_date=data.start_date,
            end_date=data.end_date,
            total_days=total_days,
            total_price=total_price,
            deposit_amount=deposit_amount,
            message=data.message,
            status=RentalRequestStatus.PENDING,
        )

        # Reserve TOTAL on the renter's wallet for as long as this request
        # lives: available -> held, recorded as a HELD transaction.
        await self.wallet.hold(
            renter_id,
            total_price,
            request.id,
            description=f"Rental request #{request.id} · {listing.title}",
        )

        renter = await self.user_repo.get_by_id(renter_id)
        renter_name = self._display_name(renter)
        owner = await self.user_repo.get_by_id(listing.owner_id)
        owner_name = self._display_name(owner) or "there"
        request_text = (
            f"{renter_name} wants to rent {listing.title}"
            if renter_name
            else f"Someone wants to rent {listing.title}"
        )

        notif_data = {
            "actor_id": renter_id,
            "actor_name": renter_name,
            "listing_id": listing.id,
            "listing_title": listing.title,
            "request_message": data.message,
            "start_date": str(data.start_date),
            "end_date": str(data.end_date),
            "total_days": total_days,
            "total_price": total_price,
        }

        await self.notif_service.create(
            user_id=listing.owner_id,
            title="New Rental Request",
            message=request_text,
            type="rental_request",
            reference_id=request.id,
            reference_type="rental_request",
            data=notif_data,
        )

        # 1. open (or reuse) the renter <-> owner chat and tie it to this request
        conv = await self._conversation(request)
        # 2. both sides see what just happened inside that chat
        await self._post_system(
            conv,
            renter_id,
            system_message.request_created(
                listing_title=listing.title,
                start_date=data.start_date,
                end_date=data.end_date,
                days=total_days,
                total=total_price,
            ),
        )
        # 3. and both get it by email too — best effort, never blocks the request
        mailer.send_in_background(
            getattr(owner, "email", None),
            mailer.owner_new_request(
                owner_name=owner_name,
                renter_name=renter_name or "A renter",
                listing_title=listing.title,
                start_date=data.start_date,
                end_date=data.end_date,
                days=total_days,
                total=total_price,
                conversation_id=conv.id,
            ),
        )
        mailer.send_in_background(
            getattr(renter, "email", None),
            mailer.renter_request_sent(
                renter_name=renter_name or "there",
                listing_title=listing.title,
                start_date=data.start_date,
                end_date=data.end_date,
                days=total_days,
                total=total_price,
                conversation_id=conv.id,
            ),
        )

        return request

    async def accept(self, request_id: int, owner_id: int, response: str | None = None) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request is not pending")

        request = await self.repo.update(
            request,
            status=RentalRequestStatus.ACCEPTED,
            owner_response=response,
        )

        # The hold made at request time stays reserved - accepting only
        # confirms it. Requests opened before wallets existed get their hold
        # here, and an acceptance is never blocked by a missing balance.
        try:
            await self.wallet.hold(
                request.renter_id,
                request.total_price,
                request.id,
                description=f"Rental request #{request.id} (accepted)",
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[wallet] hold for request {request.id} skipped: {exc}", flush=True)

        notif_data = await self._listing_context(request)
        notif_data["response"] = response
        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Request Accepted",
            message="Your rental request has been accepted!",
            type="rental_accepted",
            reference_id=request.id,
            reference_type="rental_request",
            data=notif_data,
        )

        conv = await self._conversation(request)
        listing_title = notif_data.get("listing_title") or "your rental"
        await self._post_system(
            conv,
            owner_id,
            system_message.request_accepted(
                listing_title=listing_title,
                start_date=request.start_date,
                end_date=request.end_date,
                days=request.total_days,
                total=request.total_price,
            ),
        )
        renter = await self.user_repo.get_by_id(request.renter_id)
        mailer.send_in_background(
            getattr(renter, "email", None),
            mailer.renter_accepted(
                renter_name=self._display_name(renter) or "there",
                listing_title=listing_title,
                start_date=request.start_date,
                end_date=request.end_date,
                days=request.total_days,
                total=request.total_price,
                conversation_id=conv.id,
            ),
        )

        return request

    async def _listing_context(self, request: RentalRequest) -> dict:
        listing = await self.listing_repo.get_by_id(request.listing_id)
        return {
            "listing_id": request.listing_id,
            "listing_title": listing.title if listing else None,
        }

    async def reject(self, request_id: int, owner_id: int, response: str | None = None) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="Request is not pending")

        request = await self.repo.update(
            request,
            status=RentalRequestStatus.REJECTED,
            owner_response=response,
        )

        # Give the reserved rent back: RELEASED when it was only a hold,
        # REFUNDED when the owner had already collected the money.
        await self.wallet.end_request_hold(
            request.renter_id,
            request.total_price,
            request.id,
            description=f"Rental request #{request.id} rejected",
        )

        notif_data = await self._listing_context(request)
        notif_data["reason"] = response
        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Request Rejected",
            message="Your rental request has been rejected.",
            type="rental_rejected",
            reference_id=request.id,
            reference_type="rental_request",
            data=notif_data,
        )

        conv = await self._conversation(request)
        listing_title = notif_data.get("listing_title") or "your rental"
        await self._post_system(
            conv,
            owner_id,
            system_message.request_rejected(
                listing_title=listing_title,
                reason=response,
            ),
        )
        renter = await self.user_repo.get_by_id(request.renter_id)
        mailer.send_in_background(
            getattr(renter, "email", None),
            mailer.renter_rejected(
                renter_name=self._display_name(renter) or "there",
                listing_title=listing_title,
                start_date=request.start_date,
                end_date=request.end_date,
                total=request.total_price,
                conversation_id=conv.id,
            ),
        )

        return request

    async def cancel(self, request_id: int, renter_id: int) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.renter_id != renter_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status not in [RentalRequestStatus.PENDING, RentalRequestStatus.ACCEPTED]:
            raise HTTPException(status_code=400, detail="Request cannot be cancelled")

        request = await self.repo.update(request, status=RentalRequestStatus.CANCELLED)

        # The hold goes back to the renter - as a refund if it was already paid.
        await self.wallet.end_request_hold(
            request.renter_id,
            request.total_price,
            request.id,
            description=f"Rental request #{request.id} cancelled",
        )

        renter = await self.user_repo.get_by_id(request.renter_id)
        renter_name = ""
        if renter:
            renter_name = renter.display_name or (renter.email or "").split("@")[0]
        notif_data = await self._listing_context(request)
        notif_data.update({"actor_id": request.renter_id, "actor_name": renter_name})
        await self.notif_service.create(
            user_id=request.owner_id,
            title="Rental Request Cancelled",
            message="A rental request was cancelled by the renter.",
            type="rental_cancelled",
            reference_id=request.id,
            reference_type="rental_request",
            data=notif_data,
        )

        conv = await self._conversation(request)
        await self._post_system(
            conv,
            request.renter_id,
            system_message.request_cancelled(
                listing_title=notif_data.get("listing_title") or "your rental"
            ),
        )

        return request

    async def complete(self, request_id: int, owner_id: int) -> RentalRequest:
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if request.owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if request.status != RentalRequestStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Only accepted requests can be completed")

        request = await self.repo.update(request, status=RentalRequestStatus.COMPLETED)

        # The reserved rent is settled: it leaves the renter's wallet for good.
        await self.wallet.end_request_hold(
            request.renter_id,
            request.total_price,
            request.id,
            completed=True,
            description=f"Rental request #{request.id} completed",
        )

        listing = await self.listing_repo.get_by_id(request.listing_id)
        if listing:
            listing.available = True
            await self.db.flush()

        await self.notif_service.create(
            user_id=request.renter_id,
            title="Rental Completed",
            message=f"The rental of {listing.title if listing else 'your rental'} has been completed. You can now leave a review.",
            type="rental_completed",
            reference_id=request.id,
            reference_type="rental_request",
            data={
                "listing_id": request.listing_id,
                "listing_title": listing.title if listing else None,
            },
        )

        return request

    async def get_for_user(self, request_id: int, user_id: int) -> RentalRequest:
        """One request, only for the renter or the owner on it — this is what
        the chat's rental-request card loads."""
        request = await self.repo.get_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Rental request not found")
        if user_id not in (request.renter_id, request.owner_id):
            raise HTTPException(status_code=403, detail="Not authorized")
        return request

    async def get_by_renter(self, renter_id: int, skip: int = 0, limit: int = 20) -> tuple[list[RentalRequest], int]:
        requests = await self.repo.get_by_renter(renter_id, skip, limit)
        total = await self.repo.count_by_renter(renter_id)
        return requests, total

    async def get_by_owner(self, owner_id: int, skip: int = 0, limit: int = 20) -> tuple[list[RentalRequest], int]:
        requests = await self.repo.get_by_owner(owner_id, skip, limit)
        total = await self.repo.count_by_owner(owner_id)
        return requests, total

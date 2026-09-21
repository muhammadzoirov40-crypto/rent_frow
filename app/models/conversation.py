from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user1_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user2_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    listing_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("listings.id"), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user1 = relationship("User", foreign_keys=[user1_id], lazy="selectin")
    user2 = relationship("User", foreign_keys=[user2_id], lazy="selectin")
    listing = relationship("Listing", lazy="selectin")
    messages = relationship("Message", back_populates="conversation", lazy="selectin")

    __table_args__ = (
        Index("idx_conversation_users", "user1_id", "user2_id"),
    )

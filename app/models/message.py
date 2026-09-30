from datetime import datetime
from sqlalchemy import Integer, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    reply_to_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reactions: Mapped[str | None] = mapped_column(Text, nullable=True)
    forwarded_from_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="messages", lazy="selectin")
    sender = relationship("User", back_populates="sent_messages", lazy="selectin")
    reply_to = relationship("Message", remote_side=[id], lazy="selectin")

    __table_args__ = (
        Index("idx_message_conversation_created", "conversation_id", "created_at"),
    )

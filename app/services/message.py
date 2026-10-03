import json
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.repositories.message import MessageRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.user import UserRepository
from app.services.notification import NotificationService
from app.services.system_message import is_system
from app.utils.websocket import manager


def _load_reactions(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _serialize(msg: Message) -> dict:
    reply = getattr(msg, "reply_to", None)
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "reply_to_id": msg.reply_to_id,
        "reply_to_content": reply.content if reply else None,
        "reply_to_sender_id": reply.sender_id if reply else None,
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        "pinned": bool(msg.pinned),
        "reactions": _load_reactions(msg.reactions),
        "forwarded_from_name": msg.forwarded_from_name,
    }


class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MessageRepository(db)
        self.conv_repo = ConversationRepository(db)
        self.user_repo = UserRepository(db)
        self.notif_service = NotificationService(db)

    async def _participants(self, conversation_id: int) -> list[int]:
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if not hasattr(conv, "_checked"):
            conv._checked = True
        return [conv.user1_id, conv.user2_id]

    async def send(
        self,
        conversation_id: int,
        sender_id: int,
        content: str,
        reply_to_id: int | None = None,
        forwarded_from_name: str | None = None,
    ) -> Message:
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if sender_id not in (conv.user1_id, conv.user2_id):
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        reply_msg = None
        if reply_to_id:
            reply_msg = await self.repo.get_by_id(reply_to_id)
            if not reply_msg or reply_msg.conversation_id != conversation_id:
                reply_to_id = None
                reply_msg = None

        message = await self.repo.create(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            reply_to_id=reply_to_id,
            forwarded_from_name=forwarded_from_name,
        )
        if reply_msg:
            message.reply_to = reply_msg

        conv.last_message_at = datetime.utcnow()
        await self.db.flush()

        other_user_id = conv.user1_id if conv.user2_id == sender_id else conv.user2_id

        sender = await self.user_repo.get_by_id(sender_id)
        sender_name = ""
        if sender:
            sender_name = sender.display_name or (sender.email or "").split("@")[0]
        notification_text = f"{sender_name}: {content[:110]}" if sender_name else content[:120]

        # A system message already comes with its own rental notification
        # ("request sent / accepted / rejected") — a second "New Message" on
        # top of it would only be noise.
        if not is_system(content):
            await self.notif_service.create(
                user_id=other_user_id,
                title="New Message",
                message=notification_text,
                type="new_message",
                reference_id=conversation_id,
                reference_type="conversation",
                data={
                    "actor_id": sender_id,
                    "actor_name": sender_name,
                    "conversation_id": conversation_id,
                    "message_preview": content[:200],
                },
            )

        event = {
            "type": "message",
            "event": "new_message",
            "conversation_id": conversation_id,
            "message": _serialize(message),
        }
        await manager.send_to_users(event, [conv.user1_id, conv.user2_id])

        return message

    async def edit(self, message_id: int, user_id: int, content: str) -> Message:
        message = await self.repo.get_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        if message.sender_id != user_id:
            raise HTTPException(status_code=403, detail="Not allowed to edit this message")
        message.content = content
        message.edited_at = datetime.utcnow()
        await self.db.flush()

        event = {
            "type": "message",
            "event": "message_updated",
            "conversation_id": message.conversation_id,
            "message": _serialize(message),
        }
        await manager.send_to_users(event, await self._participants(message.conversation_id))
        return message

    async def toggle_reaction(self, message_id: int, user_id: int, emoji: str) -> dict:
        message = await self.repo.get_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        conv = await self.conv_repo.get_by_id(message.conversation_id)
        if conv and user_id not in (conv.user1_id, conv.user2_id):
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        reactions = _load_reactions(message.reactions)
        users = [int(u) for u in reactions.get(emoji, [])]
        if user_id in users:
            users.remove(user_id)
        else:
            users.append(user_id)
        if users:
            reactions[emoji] = users
        else:
            reactions.pop(emoji, None)
        message.reactions = json.dumps(reactions)
        await self.db.flush()

        event = {
            "type": "message",
            "event": "message_reaction",
            "conversation_id": message.conversation_id,
            "message_id": message.id,
            "reactions": reactions,
        }
        if conv:
            await manager.send_to_users(event, [conv.user1_id, conv.user2_id])
        return reactions

    async def set_pinned(self, message_id: int, user_id: int, pinned: bool) -> Message:
        message = await self.repo.get_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        conv = await self.conv_repo.get_by_id(message.conversation_id)
        if conv and user_id not in (conv.user1_id, conv.user2_id):
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        if pinned:
            await self.repo.unpin_conversation_messages(message.conversation_id)
        message.pinned = pinned
        await self.db.flush()

        event = {
            "type": "message",
            "event": "message_pinned",
            "conversation_id": message.conversation_id,
            "message_id": message.id,
            "pinned": pinned,
        }
        if conv:
            await manager.send_to_users(event, [conv.user1_id, conv.user2_id])
        return message

    async def get_messages(self, conversation_id: int, skip: int = 0, limit: int = 50) -> list[Message]:
        return await self.repo.get_conversation_messages(conversation_id, skip, limit)

    async def mark_read(self, conversation_id: int, user_id: int) -> None:
        await self.repo.mark_conversation_read(conversation_id, user_id)

    async def get_unread_count(self, conversation_id: int, user_id: int) -> int:
        return await self.repo.get_unread_count(conversation_id, user_id)

    async def delete(self, message_id: int, user_id: int, is_admin: bool = False) -> None:
        message = await self.repo.get_by_id(message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        if message.sender_id != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not allowed to delete this message")

        conversation_id = message.conversation_id
        conv = await self.conv_repo.get_by_id(conversation_id)

        await self.repo.delete(message)
        await self.db.flush()

        if conv:
            remaining = await self.repo.get_conversation_messages(conversation_id, 0, 1)
            conv.last_message_at = remaining[0].created_at if remaining else None
            await self.db.flush()

            event = {
                "type": "message",
                "event": "message_deleted",
                "conversation_id": conversation_id,
                "message_id": message_id,
            }
            await manager.send_to_users(event, [conv.user1_id, conv.user2_id])

    async def clear_conversation(self, conversation_id: int, user_id: int, is_admin: bool = False) -> None:
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if user_id not in (conv.user1_id, conv.user2_id) and not is_admin:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")

        await self.repo.delete_conversation_messages(conversation_id)
        conv.last_message_at = None
        await self.db.flush()

        event = {
            "type": "message",
            "event": "conversation_cleared",
            "conversation_id": conversation_id,
        }
        await manager.send_to_users(event, [conv.user1_id, conv.user2_id])

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.conversation import (
    ConversationResponse, MessageResponse, SendMessageRequest,
    ConversationCreateRequest,
)
from app.schemas.base import APIResponse, PaginatedResponse
from app.services.conversation import ConversationService
from app.services.message import MessageService
from app.utils.s3 import get_presigned_url

router = APIRouter(prefix="/messages", tags=["Messages"])


def _msg_to_response(msg) -> MessageResponse:
    sender_avatar = None
    if msg.sender and msg.sender.avatar_url:
        try:
            sender_avatar = get_presigned_url(msg.sender.avatar_url, expires_in=86400)
        except Exception:
            sender_avatar = msg.sender.avatar_url

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at,
        sender_name=msg.sender.display_name if msg.sender else None,
        sender_avatar=sender_avatar,
    )


def _conv_to_response(conv, current_user_id: int, last_message=None, unread: int = 0) -> ConversationResponse:
    other_user = conv.user2 if conv.user1_id == current_user_id else conv.user1
    other_name = other_user.display_name if other_user else None
    other_avatar = None
    if other_user and other_user.avatar_url:
        try:
            other_avatar = get_presigned_url(other_user.avatar_url, expires_in=86400)
        except Exception:
            other_avatar = other_user.avatar_url

    last_content = None
    if last_message:
        last_content = last_message.content
    elif conv.messages:
        sorted_msgs = sorted(conv.messages, key=lambda m: m.created_at, reverse=True)
        last_content = sorted_msgs[0].content

    return ConversationResponse(
        id=conv.id,
        user1_id=conv.user1_id,
        user2_id=conv.user2_id,
        listing_id=conv.listing_id,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        other_user_name=other_name,
        other_user_avatar=other_avatar,
        last_message_content=last_content,
        unread_count=unread,
    )


@router.get("/conversations", response_model=APIResponse[list[ConversationResponse]])
async def get_conversations(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    conv_service = ConversationService(db)
    msg_service = MessageService(db)
    conversations = await conv_service.get_user_conversations(current_user.user_id)
    items = []
    for conv in conversations:
        unread = await msg_service.get_unread_count(conv.id, current_user.user_id)
        items.append(_conv_to_response(conv, current_user.user_id, unread=unread))
    return APIResponse(data=items)


@router.post("/conversations", response_model=APIResponse[ConversationResponse])
async def create_or_get_conversation(
    data: ConversationCreateRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    conv_service = ConversationService(db)
    conv = await conv_service.get_or_create(
        current_user.user_id, data.user_id, data.listing_id
    )
    return APIResponse(data=_conv_to_response(conv, current_user.user_id))


@router.get("/conversations/{conversation_id}", response_model=APIResponse[list[MessageResponse]])
async def get_messages(
    conversation_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    msg_service = MessageService(db)
    skip = (page - 1) * page_size
    messages = await msg_service.get_messages(conversation_id, skip, page_size)
    items = [_msg_to_response(m) for m in reversed(messages)]
    return APIResponse(data=items)


@router.post("/conversations/{conversation_id}", response_model=APIResponse[MessageResponse])
async def send_message(
    conversation_id: int,
    data: SendMessageRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    msg_service = MessageService(db)
    msg = await msg_service.send(conversation_id, current_user.user_id, data.content)
    return APIResponse(message="Message sent", data=_msg_to_response(msg))


@router.post("/conversations/{conversation_id}/read", response_model=APIResponse)
async def mark_read(
    conversation_id: int,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    msg_service = MessageService(db)
    await msg_service.mark_read(conversation_id, current_user.user_id)
    return APIResponse(message="Messages marked as read")

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.comment import CommentResponse, CreateCommentRequest, UpdateCommentRequest
from app.schemas.base import APIResponse
from app.models.comment import Comment
from app.models.post import Post
from app.utils.s3 import get_presigned_url

router = APIRouter(prefix="/posts", tags=["Comments"])


def _comment_to_response(comment: Comment) -> CommentResponse:
    author_name = None
    author_avatar = None
    if comment.author:
        author_name = comment.author.display_name or comment.author.email
        if comment.author.avatar_url:
            try:
                author_avatar = get_presigned_url(comment.author.avatar_url, expires_in=86400)
            except Exception:
                author_avatar = comment.author.avatar_url

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        content=comment.content,
        author_name=author_name,
        author_avatar=author_avatar,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get("/{post_id}/comments", response_model=APIResponse[list[CommentResponse]])
async def list_comments(
    post_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    query = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    comments = result.scalars().all()
    return APIResponse(data=[_comment_to_response(c) for c in comments])


@router.post("/{post_id}/comments", response_model=APIResponse[CommentResponse])
async def create_comment(
    post_id: int,
    data: CreateCommentRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        post_id=post_id,
        user_id=current_user.user_id,
        content=data.content,
    )
    db.add(comment)
    post.comments_count += 1
    await db.flush()
    await db.refresh(comment)
    return APIResponse(message="Comment created successfully", data=_comment_to_response(comment))


@router.put("/{post_id}/comments/{comment_id}", response_model=APIResponse[CommentResponse])
async def update_comment(
    post_id: int,
    comment_id: int,
    data: UpdateCommentRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.content = data.content
    await db.flush()
    await db.refresh(comment)
    return APIResponse(message="Comment updated successfully", data=_comment_to_response(comment))


@router.delete("/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: int,
    comment_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if post and post.comments_count > 0:
        post.comments_count -= 1

    await db.delete(comment)
    return APIResponse(message="Comment deleted successfully")

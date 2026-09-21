from fastapi import APIRouter, Depends, HTTPException, status as http_status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.post import PostResponse, CreatePostRequest, UpdatePostRequest
from app.schemas.base import APIResponse
from app.models.post import Post
from app.models.like import Like
from app.models.user import User
from app.utils.s3 import upload_file, get_presigned_url, delete_file

router = APIRouter(prefix="/posts", tags=["Posts"])

ALLOWED_POST_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_POST_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def _post_to_response(post: Post) -> PostResponse:
    author_name = None
    author_avatar = None
    if post.author:
        author_name = post.author.display_name or post.author.email
        if post.author.avatar_url:
            try:
                author_avatar = get_presigned_url(post.author.avatar_url, expires_in=86400)
            except Exception:
                author_avatar = post.author.avatar_url
    image_url = None
    if post.image_url:
        try:
            image_url = get_presigned_url(post.image_url, expires_in=86400)
        except Exception:
            image_url = post.image_url

    category_name = None
    if post.category:
        category_name = post.category.name

    return PostResponse(
        id=post.id,
        user_id=post.user_id,
        category_id=post.category_id,
        category_name=category_name,
        title=post.title,
        content=post.content,
        image_url=image_url,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        author_name=author_name,
        author_avatar=author_avatar,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


@router.get("", response_model=APIResponse[list[PostResponse]])
async def list_posts(
    user_id: int = None,
    skip: int = 0,
    limit: int = 20,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Post).order_by(Post.created_at.desc())
    if user_id:
        query = query.where(Post.user_id == user_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    return APIResponse(data=[_post_to_response(p) for p in posts])


@router.get("/{post_id}", response_model=APIResponse[PostResponse])
async def get_post(
    post_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return APIResponse(data=_post_to_response(post))


@router.post("", response_model=APIResponse[PostResponse])
async def create_post(
    data: CreatePostRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = Post(
        user_id=current_user.user_id,
        category_id=data.category_id,
        title=data.title,
        content=data.content,
        image_url=data.image_url,
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return APIResponse(message="Post created successfully", data=_post_to_response(post))


@router.put("/{post_id}", response_model=APIResponse[PostResponse])
async def update_post(
    post_id: int,
    data: UpdatePostRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    if data.title is not None:
        post.title = data.title
    if data.content is not None:
        post.content = data.content
    if data.image_url is not None:
        post.image_url = data.image_url
    if data.category_id is not None:
        post.category_id = data.category_id

    await db.flush()
    await db.refresh(post)
    return APIResponse(message="Post updated successfully", data=_post_to_response(post))


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    if post.image_url:
        try:
            delete_file(post.image_url)
        except Exception:
            pass

    await db.delete(post)
    return APIResponse(message="Post deleted successfully")


@router.post("/{post_id}/like", response_model=APIResponse[PostResponse])
async def toggle_like(
    post_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_like = await db.execute(
        select(Like).where(Like.user_id == current_user.user_id, Like.post_id == post_id)
    )
    like = existing_like.scalar_one_or_none()

    if like:
        await db.delete(like)
        post.likes_count = max(0, post.likes_count - 1)
    else:
        new_like = Like(user_id=current_user.user_id, post_id=post_id)
        db.add(new_like)
        post.likes_count += 1

    await db.flush()
    await db.refresh(post)
    return APIResponse(data=_post_to_response(post))


@router.post("/upload-image", response_model=APIResponse[dict])
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_POST_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: JPG, JPEG, PNG, WebP. Got: {file.content_type}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_POST_IMAGE_SIZE:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_POST_IMAGE_SIZE // (1024 * 1024)}MB.",
        )

    image_key = upload_file(
        file_bytes=file_bytes,
        folder="posts",
        filename=file.filename or "post_image.jpg",
        content_type=file.content_type,
    )

    try:
        image_url = get_presigned_url(image_key, expires_in=86400)
    except Exception:
        image_url = image_key

    return APIResponse(data={"image_url": image_url, "image_key": image_key})

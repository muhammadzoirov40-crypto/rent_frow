from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi import status as http_status
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.base import APIResponse
from app.utils.s3 import upload_file, get_presigned_url

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024


@router.post("/image", response_model=APIResponse[dict])
async def upload_image(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_auth),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: JPG, JPEG, PNG, WebP. Got: {file.content_type}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_SIZE // (1024 * 1024)}MB.",
        )

    image_key = upload_file(
        file_bytes=file_bytes,
        folder="listings",
        filename=file.filename or "image.jpg",
        content_type=file.content_type,
    )

    try:
        image_url = get_presigned_url(image_key, expires_in=86400)
    except Exception:
        image_url = image_key

    return APIResponse(data={"image_url": image_url, "image_key": image_key})

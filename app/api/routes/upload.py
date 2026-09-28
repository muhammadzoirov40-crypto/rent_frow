from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi import status as http_status
from app.core.dependencies import require_auth, CurrentUser
from app.schemas.base import APIResponse
from app.utils.s3 import upload_file, get_presigned_url

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024

ALLOWED_FILE_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
    "audio/webm",
    "audio/mpeg",
    "audio/ogg",
    "audio/mp4",
    "audio/wav",
    "audio/x-m4a",
    "video/mp4",
    "image/png",
    "image/jpeg",
    "image/webp",
}

ALLOWED_FILE_EXTS = {
    "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "rtf", "zip", "rar",
    "webm", "mp3", "ogg", "m4a", "wav", "mp4",
    "png", "jpg", "jpeg", "webp",
}

FILE_MAX_SIZE = 25 * 1024 * 1024


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


@router.post("/file", response_model=APIResponse[dict])
async def upload_any_file(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_auth),
):
    """Uploads chat attachments: documents, contracts, voice notes, media."""
    original_name = file.filename or "file"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    content_type = (file.content_type or "").split(";")[0].strip().lower()

    if ext and ext not in ALLOWED_FILE_EXTS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"File type '.{ext}' is not allowed.",
        )
    if not ext and content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Empty file.")
    if len(file_bytes) > FILE_MAX_SIZE:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {FILE_MAX_SIZE // (1024 * 1024)}MB.",
        )

    file_key = upload_file(
        file_bytes=file_bytes,
        folder="chat",
        filename=original_name,
        content_type=content_type or "application/octet-stream",
    )

    try:
        file_url = get_presigned_url(file_key, expires_in=604800)
    except Exception:
        file_url = file_key

    return APIResponse(
        data={
            "file_url": file_url,
            "file_key": file_key,
            "name": original_name,
            "size": len(file_bytes),
            "content_type": content_type,
        }
    )

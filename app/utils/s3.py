import os
import uuid
import base64
from pathlib import Path
from botocore.exceptions import EndpointConnectionError
from app.core.config import get_settings

settings = get_settings()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _get_s3_client():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def _s3_available() -> bool:
    try:
        s3 = _get_s3_client()
        s3.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        return True
    except Exception:
        return False


S3_OK = None


def upload_file(file_bytes: bytes, folder: str, filename: str, content_type: str = "image/jpeg") -> str:
    global S3_OK
    if S3_OK is None:
        S3_OK = _s3_available()

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique_name = f"{folder}/{uuid.uuid4().hex}.{ext}"

    if S3_OK:
        try:
            s3 = _get_s3_client()
            s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=unique_name,
                Body=file_bytes,
                ContentType=content_type,
            )
            return unique_name
        except Exception:
            pass

    local_path = UPLOAD_DIR / unique_name
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(file_bytes)
    return f"local:{unique_name}"


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    if key.startswith("local:"):
        return f"/uploads/{key[6:]}"

    if S3_OK:
        try:
            s3 = _get_s3_client()
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception:
            pass

    return f"/uploads/{key.split('/')[-1]}"


def delete_file(key: str) -> None:
    if key.startswith("local:"):
        local_path = UPLOAD_DIR / key[6:]
        if local_path.exists():
            local_path.unlink()
        return

    if S3_OK:
        try:
            s3 = _get_s3_client()
            s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
        except Exception:
            pass


def ensure_bucket_exists() -> None:
    if S3_OK:
        try:
            s3 = _get_s3_client()
            s3.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        except Exception:
            try:
                s3.create_bucket(
                    Bucket=settings.S3_BUCKET_NAME,
                    CreateBucketConfiguration={"LocationConstraint": settings.S3_REGION},
                )
            except Exception:
                pass

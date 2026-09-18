import os
import uuid
import boto3
from botocore.config import Config
from app.core.config import get_settings

settings = get_settings()


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def upload_file(file_bytes: bytes, folder: str, filename: str, content_type: str = "image/jpeg") -> str:
    s3 = get_s3_client()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique_name = f"{folder}/{uuid.uuid4().hex}.{ext}"

    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=unique_name,
        Body=file_bytes,
        ContentType=content_type,
    )

    return unique_name


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    s3 = get_s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


def delete_file(key: str) -> None:
    s3 = get_s3_client()
    s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)


def ensure_bucket_exists() -> None:
    s3 = get_s3_client()
    try:
        s3.head_bucket(Bucket=settings.S3_BUCKET_NAME)
    except Exception:
        s3.create_bucket(
            Bucket=settings.S3_BUCKET_NAME,
            CreateBucketConfiguration={"LocationConstraint": settings.S3_REGION},
        )

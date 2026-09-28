import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_file_accepts_document(customer_client: AsyncClient):
    resp = await customer_client.post(
        "/api/v1/upload/file",
        files={"file": ("contract.pdf", b"%PDF-1.4 test content", "application/pdf")},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["name"] == "contract.pdf"
    assert data["size"] == len(b"%PDF-1.4 test content")
    assert data["file_url"].startswith("/uploads/") or data["file_url"].startswith("http")


@pytest.mark.asyncio
async def test_upload_file_accepts_voice_note(customer_client: AsyncClient):
    resp = await customer_client.post(
        "/api/v1/upload/file",
        files={"file": ("note.webm", b"\x1a\x45\xdf\xa3fakeaudio", "audio/webm")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["file_url"]


@pytest.mark.asyncio
async def test_upload_file_rejects_disallowed_type(customer_client: AsyncClient):
    resp = await customer_client.post(
        "/api/v1/upload/file",
        files={"file": ("evil.exe", b"MZbinary", "application/octet-stream")},
    )
    assert resp.status_code == 400

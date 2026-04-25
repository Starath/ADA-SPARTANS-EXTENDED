import io
import pytest
import fitz
from httpx import AsyncClient, ASGITransport
from app.main import app


def make_pdf_bytes() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Anak-anak belajar membaca dengan giat.", fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_extract_pdf_returns_200():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/pdf/extract",
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )
    assert response.status_code == 200
    data = response.json()
    assert "pages" in data
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_extract_pdf_rejects_non_pdf():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/pdf/extract",
            files={"file": ("test.txt", b"not a pdf", "text/plain")},
        )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_extracted_blocks_have_valid_structure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/pdf/extract",
            files={"file": ("test.pdf", make_pdf_bytes(), "application/pdf")},
        )
    data = response.json()
    for page in data["pages"]:
        for block in page["blocks"]:
            assert block["type"] in {"text", "image"}
            assert "bbox" in block
            assert 0 <= block["bbox"]["x0"] <= 1

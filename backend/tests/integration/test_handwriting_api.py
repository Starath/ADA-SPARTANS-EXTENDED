from __future__ import annotations

import io

from httpx import ASGITransport, AsyncClient
import pytest
from PIL import Image, ImageDraw

from app.main import app


def _make_png_bytes() -> bytes:
    image = Image.new("RGB", (240, 120), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((20, 40), "b d p q", fill="black")
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_handwriting_analyze_returns_200():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/handwriting/analyze",
            files={"file": ("sample.png", _make_png_bytes(), "image/png")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["classification"] in {"normal", "reversal", "corrected"}
    assert 0.0 <= data["confidence"] <= 1.0


@pytest.mark.asyncio
async def test_handwriting_analyze_rejects_unsupported_extension():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/handwriting/analyze",
            files={"file": ("sample.txt", b"not an image", "text/plain")},
        )

    assert response.status_code == 400
    assert "Unsupported image format" in response.json()["detail"]

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_diagnose_with_handwriting_returns_200():
    payload = {
        "handwriting": {
            "classification": "reversal",
            "confidence": 0.92,
            "reversal_chars": ["b", "d"],
        },
        "child_age": 8,
        "child_grade": 2,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in {"low", "medium", "high"}
    assert 0 <= data["confidence"] <= 1


@pytest.mark.asyncio
async def test_diagnose_with_transcript_returns_200():
    payload = {
        "transcript": {
            "full_text": "buku ini bagus",
            "words": [
                {"word": "buku", "start": 0.0, "end": 0.5},
                {"word": "ini", "start": 0.6, "end": 0.9},
                {"word": "bagus", "start": 1.0, "end": 1.4},
            ],
            "words_per_minute": 25.0,
            "detected_language": "id",
        }
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/diagnose", json=payload)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_diagnose_empty_body_returns_400():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/diagnose", json={})
    assert response.status_code == 400

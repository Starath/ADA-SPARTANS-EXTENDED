from __future__ import annotations

from httpx import ASGITransport, AsyncClient
import pytest

from app.main import app
from app.models.schemas import TranscriptResult, TranscriptWord


@pytest.mark.asyncio
async def test_transcribe_audio_returns_200(monkeypatch):
    mock_result = TranscriptResult(
        full_text="buku ini",
        words=[
            TranscriptWord(word="buku", start=0.0, end=0.5),
            TranscriptWord(word="ini", start=0.5, end=1.0),
        ],
        words_per_minute=120.0,
        detected_language="id",
    )
    monkeypatch.setattr("app.api.audio.transcribe", lambda *args, **kwargs: mock_result)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/audio/transcribe",
            files={"file": ("sample.wav", b"fake wav bytes", "audio/wav")},
            data={"language": "id"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["full_text"] == "buku ini"
    assert len(data["words"]) == 2
    assert data["detected_language"] == "id"


@pytest.mark.asyncio
async def test_transcribe_audio_rejects_unsupported_extension():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/audio/transcribe",
            files={"file": ("sample.txt", b"not audio", "text/plain")},
            data={"language": "id"},
        )

    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]

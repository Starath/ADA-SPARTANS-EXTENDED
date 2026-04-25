from __future__ import annotations

from types import SimpleNamespace

from app.services import whisper_service


def _mock_segment(text: str, words: list[tuple[str, float, float]]):
    return SimpleNamespace(
        text=text,
        words=[
            SimpleNamespace(word=word, start=start, end=end)
            for word, start, end in words
        ],
    )


def test_transcribe_returns_words_and_wpm(monkeypatch):
    segments = [
        _mock_segment(" buku ini ", [("buku", 0.0, 0.5), ("ini", 0.5, 1.0)]),
    ]
    info = SimpleNamespace(language="id")
    model = SimpleNamespace(transcribe=lambda *args, **kwargs: (segments, info))

    monkeypatch.setattr(whisper_service, "_get_model", lambda: model)

    result = whisper_service.transcribe(b"fake wav bytes", language="id")

    assert result.full_text == "buku ini"
    assert len(result.words) == 2
    assert result.words[0].word == "buku"
    assert result.words[0].start == 0.0
    assert result.words[1].end == 1.0
    assert result.words_per_minute == 120.0
    assert result.detected_language == "id"


def test_transcribe_handles_empty_audio_without_crashing(monkeypatch):
    info = SimpleNamespace(language="id")
    model = SimpleNamespace(transcribe=lambda *args, **kwargs: ([], info))

    monkeypatch.setattr(whisper_service, "_get_model", lambda: model)

    result = whisper_service.transcribe(b"", language="id")

    assert result.full_text == ""
    assert result.words == []
    assert result.words_per_minute == 0.0
    assert result.detected_language == "id"

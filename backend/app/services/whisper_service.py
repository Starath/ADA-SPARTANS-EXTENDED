from __future__ import annotations
import os
import tempfile
from functools import lru_cache
from faster_whisper import WhisperModel
from app.models.schemas import TranscriptResult, TranscriptWord

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    return WhisperModel(MODEL_SIZE, device=DEVICE, compute_type="int8")


def transcribe(audio_bytes: bytes, language: str = "id") -> TranscriptResult:
    model = _get_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
        )

        words: list[TranscriptWord] = []
        full_text_parts: list[str] = []

        for segment in segments:
            full_text_parts.append(segment.text.strip())
            if segment.words:
                for w in segment.words:
                    words.append(
                        TranscriptWord(word=w.word.strip(), start=w.start, end=w.end)
                    )

        total_duration = words[-1].end if words else 0
        wpm = (len(words) / total_duration * 60) if total_duration > 0 else 0.0

        return TranscriptResult(
            full_text=" ".join(full_text_parts),
            words=words,
            words_per_minute=round(wpm, 1),
            detected_language=info.language,
        )
    finally:
        os.unlink(tmp_path)

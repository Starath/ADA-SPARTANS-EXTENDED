from __future__ import annotations
import logging
import os
import tempfile
from functools import lru_cache
from faster_whisper import WhisperModel
from app.models.schemas import TranscriptResult, TranscriptWord

logger = logging.getLogger(__name__)

# large-v3 gives best accuracy for Indonesian children's speech.
# First run will download ~3 GB; subsequent runs use the cached model.
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "large-v3")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    logger.info("Loading Whisper model %r on device=%r compute_type=int8", MODEL_SIZE, DEVICE)
    return WhisperModel(MODEL_SIZE, device=DEVICE, compute_type="int8")


def transcribe(audio_bytes: bytes, language: str = "id") -> TranscriptResult:
    model = _get_model()
    logger.info("Transcribing %d bytes, language=%r", len(audio_bytes), language)

    # Save with .webm extension so ffmpeg detects the container format correctly.
    # Using .wav with WebM content caused ffmpeg to misparse timestamps → anomalous WPM.
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
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
            text = segment.text.strip()
            full_text_parts.append(text)
            logger.debug("Segment [%.2fs–%.2fs]: %r", segment.start, segment.end, text)
            if segment.words:
                for w in segment.words:
                    words.append(TranscriptWord(word=w.word.strip(), start=w.start, end=w.end))

        # Use total audio duration from Whisper (more reliable than word-level timestamps
        # for WebM audio, where end-timestamps can be compressed into a small window).
        audio_duration: float = (
            info.duration
            if hasattr(info, "duration") and info.duration and info.duration > 0
            else (words[-1].end if words else 0.0)
        )
        wpm = round((len(words) / audio_duration * 60), 1) if audio_duration > 0 else 0.0

        logger.info(
            "Done: %d words | %.1f WPM | audio_duration=%.2fs | "
            "word_span=[%.2fs–%.2fs] | lang=%r",
            len(words), wpm, audio_duration,
            words[0].start if words else 0.0,
            words[-1].end if words else 0.0,
            info.language,
        )
        logger.info("Transcript: %r", " ".join(full_text_parts))

        return TranscriptResult(
            full_text=" ".join(full_text_parts),
            words=words,
            words_per_minute=wpm,
            detected_language=info.language,
        )
    finally:
        os.unlink(tmp_path)

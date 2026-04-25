from __future__ import annotations

import io

from PIL import Image, ImageStat, UnidentifiedImageError

from app.models.schemas import HandwritingResult


def analyze_handwriting(image_bytes: bytes) -> HandwritingResult:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image bytes") from exc

    grayscale = image.convert("L")
    mean, stddev = ImageStat.Stat(grayscale).mean[0], ImageStat.Stat(grayscale).stddev[0]

    ink_density = max(0.0, min(1.0, (255.0 - mean) / 255.0))
    stroke_variation = max(0.0, min(1.0, stddev / 128.0))
    score = (ink_density * 0.6) + (stroke_variation * 0.4)

    if score >= 0.32:
        classification = "reversal"
        reversal_chars = ["b", "d", "p", "q"]
    elif score >= 0.18:
        classification = "corrected"
        reversal_chars = []
    else:
        classification = "normal"
        reversal_chars = []

    confidence = max(0.55, min(0.95, 0.55 + abs(score - 0.2)))

    return HandwritingResult(
        classification=classification,
        confidence=round(confidence, 2),
        reversal_chars=reversal_chars,
        gradcam_image=None,
    )

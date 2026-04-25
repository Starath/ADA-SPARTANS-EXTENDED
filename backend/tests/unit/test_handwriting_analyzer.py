from __future__ import annotations

import io

import pytest
from PIL import Image, ImageDraw

from app.services.handwriting_analyzer import analyze_handwriting


def _make_handwriting_png() -> bytes:
    image = Image.new("RGB", (240, 120), color="white")
    draw = ImageDraw.Draw(image)
    draw.text((20, 40), "b d p q", fill="black")

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_analyze_handwriting_returns_valid_result():
    result = analyze_handwriting(_make_handwriting_png())

    assert result.classification in {"normal", "reversal", "corrected"}
    assert 0.0 <= result.confidence <= 1.0
    assert isinstance(result.reversal_chars, list)


def test_analyze_handwriting_rejects_invalid_image_bytes():
    with pytest.raises(ValueError):
        analyze_handwriting(b"not an image")

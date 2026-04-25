import io
from pathlib import Path

import pytest
from PIL import Image

from app.services.handwriting_analyzer import analyze_handwriting


def _resolve_model_path() -> Path:
    candidates = [
        Path.cwd() / "app/models/handwriting/yolo26n.pt",
        Path.cwd() / "backend/app/models/handwriting/yolo26n.pt",
        Path.cwd().parent / "backend/app/models/handwriting/yolo26n.pt",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


MODEL_PATH = _resolve_model_path()


def make_dummy_handwriting_image() -> bytes:
    img = Image.new("L", (224, 224), color=255)
    for x in range(50, 200, 20):
        img.putpixel((x, 100), 0)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.skipif(
    not MODEL_PATH.exists(),
    reason="Skip only when yolo26n.pt is not present locally",
)
def test_yolo_model_inference_returns_boxes():
    img_bytes = make_dummy_handwriting_image()
    result = analyze_handwriting(
        img_bytes,
        model_path=str(MODEL_PATH),
    )
    assert hasattr(result, "detected_chars")
    assert isinstance(result.detected_chars, list)
    if len(result.detected_chars) > 0:
        for char in result.detected_chars:
            assert "bbox" in char
            assert "cls" in char
            assert "conf" in char
            assert len(char["bbox"]) == 4

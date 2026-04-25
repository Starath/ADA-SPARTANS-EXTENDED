from __future__ import annotations

import io
import re
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

from app.models.schemas import HandwritingResult

HANDWRITING_MODEL_PATH_ENV = "HANDWRITING_MODEL_PATH"
DEFAULT_MODEL_PATH = Path("backend/app/models/handwriting/yolo26n.pt")

REVERSAL_TARGET_CHARS = ("b", "d", "p", "q")

REVERSAL_HINTS = {
    "reversal",
    "reverse",
    "reversed",
    "mirror",
    "mirrored",
    "flip",
    "flipped",
    "inverted",
    "wrong",
    "rotated",
}

NORMAL_HINTS = {
    "normal",
    "correct",
    "upright",
    "regular",
    "nonreversal",
    "non_reversal",
    "not_reversal",
}

CORRECTED_HINTS = {
    "corrected",
    "correction",
    "erased",
    "erase",
    "overwritten",
    "overwrite",
    "fixed",
    "repair",
    "repaired",
}

_MODEL_CACHE: dict[str, YOLO] = {}


def _load_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image bytes") from exc

def _resolve_model_path(model_path: str | None) -> Path:
    env_model_path = os.getenv(HANDWRITING_MODEL_PATH_ENV)
    chosen = Path(model_path or env_model_path or DEFAULT_MODEL_PATH)

    candidates = [
        chosen,
        Path.cwd() / chosen,
        Path.cwd().parent / chosen,
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    return chosen.resolve()


def _get_yolo_model(model_path: str | None = None) -> YOLO:
    path = _resolve_model_path(model_path)
    cache_key = str(path)

    if cache_key not in _MODEL_CACHE:
        if not path.exists():
            raise ValueError(f"Model file not found: {path}")
        _MODEL_CACHE[cache_key] = YOLO(str(path))

    return _MODEL_CACHE[cache_key]


def _to_numpy(value: Any) -> np.ndarray:
    if value is None:
        return np.asarray([])

    if hasattr(value, "detach"):
        value = value.detach()

    if hasattr(value, "cpu"):
        value = value.cpu()

    if hasattr(value, "numpy"):
        return np.asarray(value.numpy())

    return np.asarray(value)


def _normalize_label(label: str | None) -> str:
    if label is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", str(label).strip().lower()).strip("_")


def _label_tokens(label: str | None) -> set[str]:
    normalized = _normalize_label(label)
    if not normalized:
        return set()
    return {token for token in normalized.split("_") if token}


def _lookup_label(names: Any, class_id: int) -> str:
    if isinstance(names, dict):
        label = names.get(class_id, names.get(str(class_id)))
        if label is not None:
            return str(label)

    if isinstance(names, (list, tuple)) and 0 <= class_id < len(names):
        return str(names[class_id])

    return f"class_{class_id}"


def _infer_char(label: str, class_id: int) -> str | None:
    normalized = _normalize_label(label)
    tokens = _label_tokens(label)

    for char in REVERSAL_TARGET_CHARS:
        if char in tokens:
            return char

    for char in REVERSAL_TARGET_CHARS:
        if re.search(rf"(^|_){re.escape(char)}($|_)", normalized):
            return char

    if normalized in REVERSAL_TARGET_CHARS:
        return normalized

    return None


def _has_any_hint(label: str, hints: set[str]) -> bool:
    normalized = _normalize_label(label)
    tokens = _label_tokens(label)

    if any(hint in tokens for hint in hints):
        return True

    return any(hint in normalized for hint in hints)


def _is_corrected_detection(label: str) -> bool:
    return _has_any_hint(label, CORRECTED_HINTS)


def _is_reversal_detection(label: str, char: str | None) -> bool:
    if _is_corrected_detection(label):
        return False

    if _has_any_hint(label, NORMAL_HINTS):
        return False

    if _has_any_hint(label, REVERSAL_HINTS):
        return True

    return char in REVERSAL_TARGET_CHARS


def _clip_box(box: np.ndarray, width: int, height: int) -> list[int]:
    x0, y0, x1, y1 = [float(v) for v in box[:4]]

    x0 = max(0, min(width, int(round(x0))))
    y0 = max(0, min(height, int(round(y0))))
    x1 = max(0, min(width, int(round(x1))))
    y1 = max(0, min(height, int(round(y1))))

    return [x0, y0, x1, y1]


def _extract_detections(results: Any, model: YOLO, image: Image.Image) -> list[dict]:
    if not results:
        return []

    result = results[0]
    boxes = getattr(result, "boxes", None)

    if boxes is None or len(boxes) == 0:
        return []

    names = getattr(result, "names", None) or getattr(model, "names", None) or {}
    width, height = image.size

    xyxy = _to_numpy(getattr(boxes, "xyxy", None))
    confs = _to_numpy(getattr(boxes, "conf", None))
    classes = _to_numpy(getattr(boxes, "cls", None))

    detections: list[dict] = []

    for box, conf, cls_value in zip(xyxy, confs, classes):
        class_id = int(cls_value)
        label = _lookup_label(names, class_id)
        char = _infer_char(label, class_id)
        is_corrected = _is_corrected_detection(label)
        is_reversal = _is_reversal_detection(label, char)

        detections.append(
            {
                "bbox": _clip_box(box, width, height),
                "cls": class_id,
                "conf": round(float(conf), 6),
                "label": label,
                "char": char,
                "is_reversal": is_reversal,
                "is_corrected": is_corrected,
            }
        )

    detections.sort(key=lambda item: item["conf"], reverse=True)
    return detections


def _confidence_from_detections(detections: list[dict], default: float = 0.5) -> float:
    confs = [float(item.get("conf", 0.0)) for item in detections]

    if not confs:
        return default

    strongest = max(confs)
    average = sum(confs) / len(confs)
    count_bonus = min(0.1, max(0, len(confs) - 1) * 0.02)

    confidence = max(strongest, average) + count_bonus
    return round(max(0.0, min(1.0, confidence)), 4)


def _unique_reversal_chars(detections: list[dict]) -> list[str]:
    found: list[str] = []

    for char in REVERSAL_TARGET_CHARS:
        if any(item.get("char") == char for item in detections):
            found.append(char)

    for item in detections:
        char = item.get("char")
        if char and char not in found:
            found.append(str(char))

    return found


def _classify_from_detections(detections: list[dict]) -> tuple[str, float, list[str]]:
    reversal_detections = [item for item in detections if item.get("is_reversal")]
    corrected_detections = [item for item in detections if item.get("is_corrected")]

    if reversal_detections:
        return (
            "reversal",
            _confidence_from_detections(reversal_detections, default=0.5),
            _unique_reversal_chars(reversal_detections),
        )

    if corrected_detections:
        return (
            "corrected",
            _confidence_from_detections(corrected_detections, default=0.5),
            [],
        )

    if detections:
        return (
            "normal",
            _confidence_from_detections(detections, default=0.5),
            [],
        )

    return "normal", 0.5, []


def analyze_handwriting(
    image_bytes: bytes,
    model_path: str | None = None,
) -> HandwritingResult:
    image = _load_image(image_bytes)
    model = _get_yolo_model(model_path)

    results = model.predict(
        source=np.array(image),
        verbose=False,
    )

    detected_chars = _extract_detections(results, model, image)
    classification, confidence, reversal_chars = _classify_from_detections(detected_chars)

    return HandwritingResult(
        classification=classification,
        confidence=confidence,
        reversal_chars=reversal_chars,
        gradcam_image=None,
        detected_chars=detected_chars,
    )

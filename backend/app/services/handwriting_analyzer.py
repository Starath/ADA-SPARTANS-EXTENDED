from __future__ import annotations

import base64
import io
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError

from app.models.schemas import HandwritingResult

HANDWRITING_MODEL_PATH_ENV = "HANDWRITING_MODEL_PATH"
# Use os.path.abspath on __file__ first — Path.resolve() on Windows can strip apostrophes in folder names
_HERE = Path(os.path.abspath(__file__)).parent
DEFAULT_MODEL_PATH = _HERE.parent / "models" / "handwriting" / "best.pt"

# Class IDs as trained in notebook: 0=Normal, 1=Reversal, 2=Corrected
CLS_NORMAL = 0
CLS_REVERSAL = 1
CLS_CORRECTED = 2
CLS_NAMES = {CLS_NORMAL: "Normal", CLS_REVERSAL: "Reversal", CLS_CORRECTED: "Corrected"}
# Box colors match the reference visualization (RGB)
CLS_COLORS_PIL = {CLS_NORMAL: (0, 200, 0), CLS_REVERSAL: (220, 0, 0), CLS_CORRECTED: (0, 100, 220)}

# Predict params matching notebook training/validation settings
PREDICT_IMGSZ = 768
PREDICT_CONF = 0.15
PREDICT_IOU = 0.6

_MODEL_CACHE: dict[str, Any] = {}


def _load_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid image bytes") from exc

def _resolve_model_path(model_path: str | None) -> Path:
    env_model_path = os.getenv(HANDWRITING_MODEL_PATH_ENV)
    chosen = Path(os.path.abspath(model_path or env_model_path or DEFAULT_MODEL_PATH))
    return chosen


def _get_yolo_model(model_path: str | None = None) -> Any:
    from ultralytics import YOLO  # lazy import — keeps backend startable if package is missing
    import tempfile
    import shutil

    path = _resolve_model_path(model_path)
    cache_key = str(path)

    if cache_key not in _MODEL_CACHE:
        print(f"[YOLO] loading model from: {path}")
        if not path.exists():
            raise ValueError(f"Model file not found: {path}")

        # Windows: PyTorch's C-level open() strips apostrophes from paths (e.g. "Farrel's" → "Farrels").
        # Work around by copying to %TEMP% which resolves to a short 8.3 path without apostrophes.
        tmp_dir = tempfile.gettempdir()
        safe_path = os.path.join(tmp_dir, "yolo_handwriting_best.pt")
        if not os.path.exists(safe_path) or os.path.getsize(safe_path) != path.stat().st_size:
            print(f"[YOLO] copying model to safe temp path: {safe_path}")
            with open(str(path), "rb") as src:
                data = src.read()
            with open(safe_path, "wb") as dst:
                dst.write(data)

        _MODEL_CACHE[cache_key] = YOLO(safe_path)
        print(f"[YOLO] model loaded — classes: {getattr(_MODEL_CACHE[cache_key], 'names', 'unknown')}")

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


def _lookup_label(names: Any, class_id: int) -> str:
    if isinstance(names, dict):
        label = names.get(class_id, names.get(str(class_id)))
        if label is not None:
            return str(label)
    if isinstance(names, (list, tuple)) and 0 <= class_id < len(names):
        return str(names[class_id])
    return CLS_NAMES.get(class_id, f"class_{class_id}")


def _clip_box(box: np.ndarray, width: int, height: int) -> list[int]:
    x0, y0, x1, y1 = [float(v) for v in box[:4]]

    x0 = max(0, min(width, int(round(x0))))
    y0 = max(0, min(height, int(round(y0))))
    x1 = max(0, min(width, int(round(x1))))
    y1 = max(0, min(height, int(round(y1))))

    return [x0, y0, x1, y1]


def _extract_detections(results: Any, model: Any, image: Image.Image) -> list[dict]:
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
        is_reversal = class_id == CLS_REVERSAL
        is_corrected = class_id == CLS_CORRECTED

        detections.append(
            {
                "bbox": _clip_box(box, width, height),
                "cls": class_id,
                "conf": round(float(conf), 6),
                "label": label,
                "char": None,
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
    seen: set[str] = set()
    found: list[str] = []
    for item in detections:
        char = item.get("char")
        if char and char not in seen:
            seen.add(char)
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


def _annotate_image(image: Image.Image, detections: list[dict]) -> str:
    """Draw bounding boxes on image, return base64-encoded PNG."""
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)

    try:
        font = ImageFont.truetype("arial.ttf", size=max(12, min(20, annotated.width // 40)))
    except Exception:
        font = ImageFont.load_default()

    for det in detections:
        x0, y0, x1, y1 = det["bbox"]
        cls_id = det["cls"]
        color = CLS_COLORS_PIL.get(cls_id, (128, 128, 128))
        label = CLS_NAMES.get(cls_id, det["label"])
        conf_pct = int(det["conf"] * 100)

        # Box border (2px thick)
        draw.rectangle([x0, y0, x1, y1], outline=color, width=2)

        # Label text above box
        tag = f"{label} {conf_pct}%"
        try:
            bbox_text = font.getbbox(tag)
            tw = bbox_text[2] - bbox_text[0]
            th = bbox_text[3] - bbox_text[1]
        except AttributeError:
            tw, th = font.getsize(tag)  # type: ignore[attr-defined]

        tx = x0
        ty = max(0, y0 - th - 2)
        draw.rectangle([tx, ty, tx + tw + 4, ty + th + 2], fill=color)
        draw.text((tx + 2, ty + 1), tag, fill=(255, 255, 255), font=font)

    buf = io.BytesIO()
    annotated.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def analyze_handwriting(
    image_bytes: bytes,
    model_path: str | None = None,
) -> HandwritingResult:
    image = _load_image(image_bytes)
    model = _get_yolo_model(model_path)

    results = model.predict(
        source=np.array(image),
        imgsz=PREDICT_IMGSZ,
        conf=PREDICT_CONF,
        iou=PREDICT_IOU,
        verbose=False,
    )

    detected_chars = _extract_detections(results, model, image)

    model_names = getattr(model, "names", {})
    print(f"[YOLO] model classes: {model_names}")
    print(f"[YOLO] image size: {image.size}, detections: {len(detected_chars)}")
    for i, d in enumerate(detected_chars):
        print(f"  [{i}] cls={d['cls']} label={d['label']} conf={d['conf']:.3f} bbox={d['bbox']}")

    classification, confidence, reversal_chars = _classify_from_detections(detected_chars)
    annotated_b64 = _annotate_image(image, detected_chars) if detected_chars else None

    return HandwritingResult(
        classification=classification,
        confidence=confidence,
        reversal_chars=reversal_chars,
        gradcam_image=annotated_b64,
        detected_chars=detected_chars,
    )

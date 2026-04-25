from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import HandwritingResult

router = APIRouter()


@router.post("/analyze", response_model=HandwritingResult)
async def analyze_handwriting(file: UploadFile = File(...)):
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported image format: {ext}")
    # TODO: load MobileNetV3 weights and run inference
    # For now returns a stub — real implementation goes in handwriting_analyzer.py
    raise NotImplementedError("Handwriting analyzer not yet implemented")

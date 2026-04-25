from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import HandwritingResult
from app.services.handwriting_analyzer import analyze_handwriting as analyze_handwriting_image

router = APIRouter()


@router.post("/analyze", response_model=HandwritingResult)
async def analyze_handwriting(file: UploadFile = File(...)):
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported image format: {ext}")
    contents = await file.read()
    try:
        return analyze_handwriting_image(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

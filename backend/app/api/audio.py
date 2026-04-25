from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.whisper_service import transcribe
from app.models.schemas import TranscriptResult

router = APIRouter()


@router.post("/transcribe", response_model=TranscriptResult)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default="id"),
):
    allowed = {".wav", ".mp3", ".m4a", ".webm", ".ogg"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {ext}")
    contents = await file.read()
    return transcribe(contents, language=language)

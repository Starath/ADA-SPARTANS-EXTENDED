import uuid
from typing import Dict

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import PDFExtractResponse
from app.services.pdf_extractor import extract_pdf

router = APIRouter()

# In-memory session store for shareable PDF reading links.
# Evicts oldest entry when capacity is reached (demo-safe).
_sessions: Dict[str, PDFExtractResponse] = {}
_MAX_SESSIONS = 100


@router.post("/extract", response_model=PDFExtractResponse)
async def extract_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    contents = await file.read()
    pages = extract_pdf(contents)
    return PDFExtractResponse(pages=pages, total_pages=len(pages))


@router.post("/session")
async def create_pdf_session(file: UploadFile = File(...)):
    """Extract a PDF and store it under a UUID for shareable reading links."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    contents = await file.read()
    pages = extract_pdf(contents)
    response = PDFExtractResponse(pages=pages, total_pages=len(pages))

    session_id = str(uuid.uuid4())

    if len(_sessions) >= _MAX_SESSIONS:
        oldest = next(iter(_sessions))
        del _sessions[oldest]

    _sessions[session_id] = response
    return {"session_id": session_id, "total_pages": len(pages)}


@router.get("/session/{session_id}", response_model=PDFExtractResponse)
async def get_pdf_session(session_id: str):
    """Retrieve a previously stored PDF session by its UUID."""
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session

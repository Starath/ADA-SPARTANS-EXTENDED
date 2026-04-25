from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.pdf_extractor import extract_pdf
from app.models.schemas import PDFExtractResponse

router = APIRouter()


@router.post("/extract", response_model=PDFExtractResponse)
async def extract_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    contents = await file.read()
    pages = extract_pdf(contents)
    return PDFExtractResponse(pages=pages, total_pages=len(pages))

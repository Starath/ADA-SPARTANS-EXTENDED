from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class BBox(BaseModel):
    x0: float = Field(ge=0, le=1)
    y0: float = Field(ge=0, le=1)
    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)


class PDFBlock(BaseModel):
    id: str
    type: Literal["text", "image"]
    bbox: BBox
    text: Optional[str] = None
    image_data: Optional[str] = None  # base64 PNG


class PageBlocks(BaseModel):
    page_num: int
    blocks: list[PDFBlock]


class PDFExtractResponse(BaseModel):
    pages: list[PageBlocks]
    total_pages: int


class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float


class TranscriptResult(BaseModel):
    full_text: str
    words: list[TranscriptWord]
    words_per_minute: float
    detected_language: str
    pause_rate: Optional[float] = None


class HandwritingResult(BaseModel):
    classification: Literal["normal", "reversal", "corrected"]
    confidence: float = Field(ge=0, le=1)
    reversal_chars: list[str] = []
    gradcam_image: Optional[str] = None  # base64


class DiagnosisIndicator(BaseModel):
    name: str
    severity: Literal["mild", "moderate", "significant"]
    evidence: str


class DiagnosisResult(BaseModel):
    risk_level: Literal["low", "medium", "high"]
    confidence: float = Field(ge=0, le=1)
    indicators: list[DiagnosisIndicator]
    reasoning: str
    recommendation: str


class DiagnoseRequest(BaseModel):
    handwriting: Optional[HandwritingResult] = None
    transcript: Optional[TranscriptResult] = None
    child_age: Optional[int] = None
    child_grade: Optional[int] = None

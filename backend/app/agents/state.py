from __future__ import annotations

from typing import Optional, TypedDict

from app.models.schemas import DiagnosisResult, HandwritingResult, TranscriptResult


class AgentState(TypedDict):
    handwriting: Optional[HandwritingResult]
    transcript: Optional[TranscriptResult]
    child_age: Optional[int]
    child_grade: Optional[int]
    context: str
    raw_diagnosis: Optional[DiagnosisResult]
    critique: Optional[str]
    final_report: Optional[DiagnosisResult]

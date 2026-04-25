from __future__ import annotations

import json
import logging
import os

from app.agents.state import AgentState
from app.models.schemas import DiagnosisResult, DiagnosisIndicator

logger = logging.getLogger(__name__)


def _is_reversal_detection(item: dict) -> bool:
    return bool(item.get("is_reversal"))


def _reversal_detections(hw) -> list[dict]:
    return [
        item for item in getattr(hw, "detected_chars", [])
        if isinstance(item, dict) and _is_reversal_detection(item)
    ]


def _unique_chars_from_handwriting(hw, detections: list[dict]) -> list[str]:
    chars: list[str] = []

    for char in getattr(hw, "reversal_chars", []) or []:
        if char and char not in chars:
            chars.append(str(char))

    for item in detections:
        char = item.get("char")
        if char and char not in chars:
            chars.append(str(char))

    return chars


def _reversal_evidence(hw) -> str:
    detections = _reversal_detections(hw)
    chars = _unique_chars_from_handwriting(hw, detections)

    char_text = ", ".join(chars) if chars else "tidak spesifik"

    if not detections:
        return (
            f"Terdeteksi pembalikan: {char_text}, "
            f"confidence {hw.confidence:.0%}"
        )

    labels: list[str] = []
    for item in detections:
        label = item.get("label") or f"class_{item.get('cls', 'unknown')}"
        if label not in labels:
            labels.append(str(label))

    label_text = ", ".join(labels[:5]) if labels else "tanpa label"

    return (
        f"Terdeteksi pembalikan: {char_text}; "
        f"{len(detections)} deteksi YOLO ({label_text}); "
        f"confidence {hw.confidence:.0%}"
    )


def _call_claude_reasoning(
    risk_level: str,
    risk_score: float,
    indicators: list[DiagnosisIndicator],
    context: str,
) -> str:
    """Call Claude Sonnet 4.6 via OpenRouter for enhanced reasoning narrative."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set; using fallback reasoning")
        return f"Skor risiko: {risk_score:.2f}. Konteks: {context[:200]}"

    try:
        from openai import OpenAI

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "https://dyslexiaid.app",
                "X-Title": "DyslexiAID",
            },
        )

        indicator_text = "\n".join(
            f"- {ind.name} ({ind.severity}): {ind.evidence}"
            for ind in indicators
        ) or "Tidak ada indikator spesifik"

        prompt = f"""Kamu adalah psikolog pendidikan yang membantu menginterpretasi hasil skrining disleksia anak SD.

Hasil analisis:
- Tingkat risiko: {risk_level}
- Skor risiko: {risk_score:.2f} (0=rendah, 1=tinggi)
- Indikator:
{indicator_text}

Konteks:
{context[:500]}

Tulis penjelasan analisis dalam 2-3 kalimat bahasa Indonesia yang jelas, empatis, dan mudah dipahami orang tua.
Fokus pada apa artinya hasil ini untuk anak, bukan jargon teknis.
Jawab hanya teks penjelasannya, tanpa label atau format."""

        response = client.chat.completions.create(
            model="anthropic/claude-sonnet-4-6",
            messages=[
                {
                    "role": "system",
                    "content": "Kamu psikolog pendidikan yang membantu orang tua memahami hasil skrining disleksia anak.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.3,
        )

        reasoning = response.choices[0].message.content or ""
        return reasoning.strip()

    except Exception as exc:
        logger.warning("Claude reasoning call failed: %s", exc)
        return f"Skor risiko: {risk_score:.2f}. Konteks: {context[:200]}"


def diagnostician_node(state: AgentState) -> AgentState:
    indicators: list[DiagnosisIndicator] = []
    risk_score = 0.0

    hw = state.get("handwriting")
    tr = state.get("transcript")

    if hw:
        if hw.classification == "reversal":
            risk_score += 0.4
            indicators.append(DiagnosisIndicator(
                name="Pembalikan Huruf",
                severity="significant",
                evidence=_reversal_evidence(hw),
            ))
        elif hw.classification == "corrected":
            risk_score += 0.2
            indicators.append(DiagnosisIndicator(
                name="Koreksi Berlebihan",
                severity="mild",
                evidence="Banyak koreksi pada tulisan tangan",
            ))

    if tr:
        if tr.words_per_minute < 40:
            risk_score += 0.4
            indicators.append(DiagnosisIndicator(
                name="Kelancaran Membaca Rendah",
                severity="significant",
                evidence=f"{tr.words_per_minute:.0f} kata/menit (normal kelas 2: ≥60)",
            ))
        elif tr.words_per_minute < 60:
            risk_score += 0.2
            indicators.append(DiagnosisIndicator(
                name="Kelancaran Membaca Di Bawah Rata-rata",
                severity="moderate",
                evidence=f"{tr.words_per_minute:.0f} kata/menit",
            ))

    if risk_score >= 0.6:
        risk_level = "high"
        confidence = min(0.95, 0.6 + risk_score * 0.2)
    elif risk_score >= 0.3:
        risk_level = "medium"
        confidence = min(0.85, 0.5 + risk_score * 0.3)
    else:
        risk_level = "low"
        confidence = 0.8

    reasoning = _call_claude_reasoning(
        risk_level=risk_level,
        risk_score=risk_score,
        indicators=indicators,
        context=state.get("context", ""),
    )

    diagnosis = DiagnosisResult(
        risk_level=risk_level,
        confidence=confidence,
        indicators=indicators,
        reasoning=reasoning,
        recommendation=(
            "Konsultasikan dengan psikolog pendidikan atau terapis wicara."
            if risk_level == "high"
            else "Pantau perkembangan dan pertimbangkan evaluasi lanjutan."
            if risk_level == "medium"
            else "Tidak ada tindakan segera diperlukan. Pantau perkembangan anak."
        ),
    )

    return {**state, "raw_diagnosis": diagnosis}

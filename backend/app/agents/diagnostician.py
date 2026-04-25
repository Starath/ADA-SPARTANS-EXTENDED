from __future__ import annotations
from app.agents.state import AgentState
from app.models.schemas import DiagnosisResult, DiagnosisIndicator


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
                evidence=f"Terdeteksi pembalikan: {', '.join(hw.reversal_chars) or 'tidak spesifik'}, confidence {hw.confidence:.0%}",
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

    diagnosis = DiagnosisResult(
        risk_level=risk_level,
        confidence=confidence,
        indicators=indicators,
        reasoning=f"Skor risiko: {risk_score:.2f}. Konteks: {state.get('context', '')[:200]}",
        recommendation=(
            "Konsultasikan dengan psikolog pendidikan atau terapis wicara."
            if risk_level == "high"
            else "Pantau perkembangan dan pertimbangkan evaluasi lanjutan."
        ),
    )

    return {**state, "raw_diagnosis": diagnosis}

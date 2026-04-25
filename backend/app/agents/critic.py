from __future__ import annotations
from app.agents.graph import AgentState


def critic_node(state: AgentState) -> AgentState:
    diagnosis = state.get("raw_diagnosis")
    if not diagnosis:
        return {**state, "critique": "No diagnosis to critique."}

    critique_parts = []

    # Check for false positive conditions
    child_age = state.get("child_age")
    if child_age and child_age <= 6 and diagnosis.risk_level == "high":
        critique_parts.append(
            "DOWNGRADE: Anak usia ≤6 tahun normal mengalami pembalikan huruf. "
            "Pertimbangkan risk_level medium."
        )
        # Downgrade high → medium for very young children
        diagnosis = diagnosis.model_copy(update={"risk_level": "medium", "confidence": diagnosis.confidence * 0.8})

    tr = state.get("transcript")
    if tr and tr.words_per_minute < 30 and child_age and child_age <= 7:
        critique_parts.append(
            "NOTE: WPM sangat rendah pada anak usia 7 tahun bisa karena belum terbiasa baca, "
            "bukan hanya disleksia."
        )

    if not critique_parts:
        critique_parts.append("Diagnosis tampak konsisten dengan data yang tersedia.")

    return {**state, "raw_diagnosis": diagnosis, "critique": " ".join(critique_parts)}

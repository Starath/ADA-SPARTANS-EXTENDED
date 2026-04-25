from __future__ import annotations

import logging

from app.agents.state import AgentState
from app.services.embedding_service import retrieve

logger = logging.getLogger(__name__)


def _grade_label(child_grade: int | None) -> str:
    if child_grade is None:
        return "kelas tidak diketahui"
    return f"kelas {child_grade} SD"


def _age_label(child_age: int | None) -> str:
    if child_age is None:
        return "usia tidak diketahui"
    return f"usia {child_age} tahun"


def _handwriting_context(state: AgentState) -> list[str]:
    hw = state.get("handwriting")
    if not hw:
        return []

    if hw.classification == "reversal":
        chars = ", ".join(hw.reversal_chars) if hw.reversal_chars else "tidak spesifik"
        detection_count = len(getattr(hw, "detected_chars", []) or [])
        return [
            (
                "Tulisan tangan menunjukkan pembalikan huruf. "
                f"Karakter yang terdeteksi: {chars}. "
                f"Confidence handwriting: {hw.confidence:.0%}. "
                f"Jumlah deteksi model: {detection_count}."
            ),
            (
                "Pembalikan huruf seperti b/d atau p/q dapat menjadi indikator risiko bila muncul konsisten, "
                "terutama jika disertai kesulitan membaca, mengeja, atau menulis pada anak usia sekolah dasar."
            ),
        ]

    if hw.classification == "corrected":
        return [
            (
                "Tulisan tangan menunjukkan banyak koreksi. "
                f"Confidence handwriting: {hw.confidence:.0%}."
            ),
            (
                "Koreksi berulang pada tulisan dapat menjadi sinyal kesulitan menulis atau keraguan visual-ortografis, "
                "tetapi perlu dikaitkan dengan indikator membaca lain sebelum menaikkan risiko secara kuat."
            ),
        ]

    return [
        (
            "Tulisan tangan tidak menunjukkan indikator pembalikan huruf yang kuat. "
            f"Confidence handwriting: {hw.confidence:.0%}."
        )
    ]


def _transcript_context(state: AgentState) -> list[str]:
    tr = state.get("transcript")
    if not tr:
        return []

    grade = state.get("child_grade")
    expected_wpm = 60 if grade in (None, 1, 2, 3) else 80

    parts = [
        (
            "Hasil membaca lisan menunjukkan "
            f"{tr.words_per_minute:.0f} kata/menit. "
            f"Patokan awal kelancaran membaca untuk {_grade_label(grade)} adalah sekitar ≥{expected_wpm} kata/menit."
        )
    ]

    if tr.words_per_minute < 40:
        parts.append(
            "Kecepatan membaca berada pada kategori rendah dan dapat memperkuat indikasi risiko bila muncul bersama kesalahan fonologis, pengejaan, atau pembalikan huruf."
        )
    elif tr.words_per_minute < expected_wpm:
        parts.append(
            "Kecepatan membaca berada di bawah patokan awal sehingga perlu dipantau bersama indikator lain."
        )
    else:
        parts.append(
            "Kecepatan membaca berada pada atau mendekati patokan awal sehingga tidak menjadi indikator risiko utama pada slice ini."
        )

    if tr.pause_rate is not None:
        parts.append(f"Pause rate terdeteksi sebesar {tr.pause_rate:.2f}.")

    return parts


def _build_rag_query(state: AgentState) -> str:
    parts = []
    hw = state.get("handwriting")
    tr = state.get("transcript")
    if hw and hw.classification == "reversal":
        parts.append("pembalikan huruf disleksia anak SD")
    if hw and hw.classification == "corrected":
        parts.append("koreksi tulisan tangan kesulitan menulis")
    if tr and tr.words_per_minute is not None:
        if tr.words_per_minute < 40:
            parts.append("kecepatan membaca sangat rendah disleksia")
        elif tr.words_per_minute < 60:
            parts.append("kelancaran membaca di bawah rata-rata")
    if not parts:
        parts.append("skrining disleksia anak sekolah dasar")
    return " ".join(parts)


def researcher_node(state: AgentState) -> AgentState:
    child_age = state.get("child_age")
    child_grade = state.get("child_grade")

    context_parts = [
        (
            "Konteks skrining disleksia anak: interpretasi harus berbasis kombinasi indikator, "
            "bukan satu temuan tunggal."
        ),
        f"Profil anak: {_age_label(child_age)}, {_grade_label(child_grade)}.",
    ]

    context_parts.extend(_handwriting_context(state))
    context_parts.extend(_transcript_context(state))

    if not state.get("handwriting") and not state.get("transcript"):
        context_parts.append(
            "Belum ada data handwriting atau transcript, sehingga risiko tidak boleh dinaikkan tanpa bukti observasional."
        )

    # RAG: retrieve relevant dyslexia knowledge
    try:
        query = _build_rag_query(state)
        snippets = retrieve(query, top_k=3)
        if snippets:
            context_parts.append("Referensi panduan disleksia:")
            context_parts.extend(snippets)
    except Exception as exc:
        logger.warning("RAG retrieval failed: %s", exc)

    context_parts.append(
        "Catatan batasan: hasil ini adalah skrining awal, bukan diagnosis klinis. "
        "Evaluasi profesional tetap diperlukan bila indikator muncul konsisten minimal beberapa bulan dan mengganggu fungsi akademik."
    )

    return {**state, "context": " ".join(context_parts)}
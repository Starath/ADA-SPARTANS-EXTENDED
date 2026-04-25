import pytest
from app.agents.researcher import researcher_node
from app.agents.diagnostician import diagnostician_node
from app.agents.critic import critic_node
from app.agents.reporter import reporter_node
from app.models.schemas import HandwritingResult, TranscriptResult, TranscriptWord


def make_state(**kwargs):
    base = {
        "handwriting": None,
        "transcript": None,
        "child_age": 8,
        "child_grade": 2,
        "context": "",
        "raw_diagnosis": None,
        "critique": None,
        "final_report": None,
    }
    return {**base, **kwargs}


def make_transcript(wpm: float = 50.0) -> TranscriptResult:
    words = [
        TranscriptWord(word="buku", start=0.0, end=0.5),
        TranscriptWord(word="ini", start=0.6, end=0.9),
    ]
    return TranscriptResult(
        full_text="buku ini",
        words=words,
        words_per_minute=wpm,
        detected_language="id",
    )


def make_handwriting(cls: str = "reversal") -> HandwritingResult:
    return HandwritingResult(
        classification=cls,
        confidence=0.92,
        reversal_chars=["b", "d"],
    )


class TestResearcherNode:
    def test_populates_context(self):
        state = make_state(handwriting=make_handwriting())
        result = researcher_node(state)
        assert len(result["context"]) > 0

    def test_context_is_string(self):
        state = make_state()
        result = researcher_node(state)
        assert isinstance(result["context"], str)


class TestDiagnosticianNode:
    def test_returns_diagnosis_with_risk_level(self):
        state = researcher_node(make_state(handwriting=make_handwriting("reversal")))
        result = diagnostician_node(state)
        assert result["raw_diagnosis"] is not None
        assert result["raw_diagnosis"].risk_level in {"low", "medium", "high"}

    def test_reversal_handwriting_raises_risk(self):
        state = researcher_node(make_state(handwriting=make_handwriting("reversal")))
        result = diagnostician_node(state)
        assert result["raw_diagnosis"].risk_level in {"medium", "high"}

    def test_low_wpm_raises_risk(self):
        state = researcher_node(make_state(transcript=make_transcript(wpm=25.0)))
        result = diagnostician_node(state)
        assert result["raw_diagnosis"].risk_level in {"medium", "high"}

    def test_normal_handwriting_low_risk(self):
        state = researcher_node(make_state(handwriting=make_handwriting("normal")))
        result = diagnostician_node(state)
        assert result["raw_diagnosis"].risk_level == "low"


class TestCriticNode:
    def test_downgrades_high_to_medium_for_very_young(self):
        state = researcher_node(make_state(
            handwriting=make_handwriting("reversal"),
            transcript=make_transcript(wpm=20.0),
            child_age=5,
        ))
        state = diagnostician_node(state)
        # Force high risk manually
        state["raw_diagnosis"] = state["raw_diagnosis"].model_copy(update={"risk_level": "high"})
        result = critic_node(state)
        assert result["raw_diagnosis"].risk_level == "medium"

    def test_critique_is_string(self):
        state = diagnostician_node(researcher_node(make_state(handwriting=make_handwriting())))
        result = critic_node(state)
        assert isinstance(result["critique"], str)


class TestReporterNode:
    def test_final_report_populated(self):
        state = make_state()
        state = researcher_node(state)
        state = diagnostician_node(state)
        state = critic_node(state)
        result = reporter_node(state)
        assert result["final_report"] is not None
        assert result["final_report"].risk_level in {"low", "medium", "high"}

    def test_final_report_includes_critique(self):
        state = researcher_node(make_state(handwriting=make_handwriting()))
        state = diagnostician_node(state)
        state = critic_node(state)
        result = reporter_node(state)
        assert "kritik" in result["final_report"].reasoning.lower() or \
               "catatan" in result["final_report"].reasoning.lower()

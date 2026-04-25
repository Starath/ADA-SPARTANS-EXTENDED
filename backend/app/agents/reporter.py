from __future__ import annotations
from app.agents.graph import AgentState


def reporter_node(state: AgentState) -> AgentState:
    diagnosis = state.get("raw_diagnosis")
    if not diagnosis:
        raise ValueError("No diagnosis available for reporter")

    critique = state.get("critique", "")
    reasoning_with_critique = f"{diagnosis.reasoning}\n\nCatatan kritik: {critique}"

    final = diagnosis.model_copy(update={"reasoning": reasoning_with_critique})
    return {**state, "final_report": final}

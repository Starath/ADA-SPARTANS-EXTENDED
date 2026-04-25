from __future__ import annotations
from langgraph.graph import StateGraph, END
from app.agents.researcher import researcher_node
from app.agents.diagnostician import diagnostician_node
from app.agents.critic import critic_node
from app.agents.reporter import reporter_node
from app.agents.state import AgentState


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("researcher", researcher_node)
    graph.add_node("diagnostician", diagnostician_node)
    graph.add_node("critic", critic_node)
    graph.add_node("reporter", reporter_node)
    graph.set_entry_point("researcher")
    graph.add_edge("researcher", "diagnostician")
    graph.add_edge("diagnostician", "critic")
    graph.add_edge("critic", "reporter")
    graph.add_edge("reporter", END)
    return graph.compile()


diagnosis_graph = build_graph()

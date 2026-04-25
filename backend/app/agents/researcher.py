from __future__ import annotations
from app.agents.state import AgentState

# Placeholder RAG retrieval — will query pgvector with indo-sentence-bert embeddings
# Returns context strings from dyslexia guidelines (ADI, DSM-5 criteria in Indonesian)
def researcher_node(state: AgentState) -> AgentState:
    query_parts = []
    if state.get("handwriting"):
        query_parts.append(f"handwriting {state['handwriting'].classification}")
    if state.get("transcript"):
        wpm = state["transcript"].words_per_minute
        query_parts.append(f"oral reading fluency {wpm} wpm")

    # TODO: replace with actual pgvector similarity search
    context = (
        "Disleksia ditandai kesulitan membaca, menulis, mengeja meski kecerdasan normal. "
        "Indikator: reversal huruf (b/d, p/q), kecepatan baca <60 wpm untuk kelas 2 SD, "
        "kesalahan fonemik konsisten. DSM-5 kriteria: kesulitan minimal 6 bulan, "
        "tidak dijelaskan faktor lain."
    )

    return {**state, "context": context}

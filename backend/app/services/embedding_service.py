"""In-memory RAG service using sentence-transformers.

Falls back gracefully when sentence-transformers is not installed or
when the knowledge base is empty. No external database required.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_KNOWLEDGE_PATH = Path(__file__).parent.parent.parent / "data" / "dyslexia_knowledge.json"
_TOP_K = 4

# Module-level cache so we load once per process
_documents: list[dict] | None = None
_embeddings: "list[list[float]]" | None = None
_model: object | None = None


def _load_knowledge() -> list[dict]:
    global _documents
    if _documents is not None:
        return _documents

    if not _KNOWLEDGE_PATH.exists():
        logger.warning("Knowledge base not found at %s", _KNOWLEDGE_PATH)
        _documents = []
        return _documents

    with open(_KNOWLEDGE_PATH, encoding="utf-8") as f:
        _documents = json.load(f)

    logger.info("Loaded %d knowledge documents", len(_documents))
    return _documents


def _load_model():
    global _model
    if _model is not None:
        return _model

    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _model = SentenceTransformer("firqaaa/indo-sentence-bert-base")
        logger.info("Sentence-transformers model loaded")
    except Exception as exc:
        logger.warning("Could not load sentence-transformers model: %s", exc)
        _model = None

    return _model


def _compute_embeddings(texts: list[str]) -> "list[list[float]] | None":
    model = _load_model()
    if model is None:
        return None

    try:
        import numpy as np  # type: ignore
        embeddings = model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    except Exception as exc:
        logger.warning("Embedding computation failed: %s", exc)
        return None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    try:
        import numpy as np  # type: ignore
        return float(np.dot(a, b))  # vectors already normalized
    except ImportError:
        # Pure Python fallback
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x**2 for x in a) ** 0.5
        norm_b = sum(x**2 for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


def _get_all_embeddings() -> "list[list[float]] | None":
    global _embeddings
    if _embeddings is not None:
        return _embeddings

    docs = _load_knowledge()
    if not docs:
        return None

    texts = [d["text"] for d in docs]
    _embeddings = _compute_embeddings(texts)
    return _embeddings


def retrieve(query: str, top_k: int = _TOP_K) -> list[str]:
    """Return top_k relevant knowledge snippets for the given query.

    Falls back to empty list if the model or knowledge base is unavailable.
    """
    docs = _load_knowledge()
    if not docs:
        return []

    all_emb = _get_all_embeddings()

    # If embeddings unavailable, return first top_k docs as fallback
    if all_emb is None:
        return [d["text"] for d in docs[:top_k]]

    query_emb = _compute_embeddings([query])
    if query_emb is None:
        return [d["text"] for d in docs[:top_k]]

    q = query_emb[0]
    scored = [(i, _cosine_similarity(q, emb)) for i, emb in enumerate(all_emb)]
    scored.sort(key=lambda x: x[1], reverse=True)

    results = [docs[i]["text"] for i, _ in scored[:top_k]]
    logger.debug("RAG retrieved %d snippets for query: %s", len(results), query[:60])
    return results

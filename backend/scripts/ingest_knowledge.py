"""One-time script to ingest dyslexia knowledge into pgvector (optional).

Run this if you have PostgreSQL + pgvector set up.
Without a database, the embedding_service uses in-memory similarity search instead.

Usage:
    cd backend
    python scripts/ingest_knowledge.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

KNOWLEDGE_PATH = Path(__file__).parent.parent / "data" / "dyslexia_knowledge.json"
DATABASE_URL = os.getenv("DATABASE_URL")


def ingest():
    if not DATABASE_URL:
        print("DATABASE_URL not set. Skipping pgvector ingestion.")
        print("The app will use in-memory RAG instead (no setup needed).")
        return

    try:
        import psycopg2
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        print(f"Missing dependency: {e}")
        print("Run: pip install psycopg2-binary sentence-transformers")
        return

    with open(KNOWLEDGE_PATH, encoding="utf-8") as f:
        docs = json.load(f)

    print(f"Loaded {len(docs)} documents")

    model = SentenceTransformer("firqaaa/indo-sentence-bert-base")
    texts = [d["text"] for d in docs]
    embeddings = model.encode(texts, normalize_embeddings=True)
    print(f"Computed embeddings: shape {embeddings.shape}")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS dyslexia_knowledge (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            topic TEXT,
            embedding vector(768)
        )
    """)

    for doc, emb in zip(docs, embeddings):
        cur.execute(
            """
            INSERT INTO dyslexia_knowledge (id, text, topic, embedding)
            VALUES (%s, %s, %s, %s::vector)
            ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, embedding = EXCLUDED.embedding
            """,
            (doc["id"], doc["text"], doc.get("topic"), emb.tolist()),
        )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Ingested {len(docs)} documents into pgvector")


if __name__ == "__main__":
    ingest()

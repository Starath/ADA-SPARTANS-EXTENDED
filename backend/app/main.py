import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import audio, diagnose, handwriting, pdf

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm Whisper so the first real request isn't slow (~150 MB download on first run)
    try:
        from app.services.whisper_service import _get_model
        _get_model()
        logger.info("Whisper model ready")
    except Exception as exc:
        logger.warning("Whisper pre-warm failed (will load on first request): %s", exc)
    yield


app = FastAPI(title="DyslexiAID API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(handwriting.router, prefix="/api/handwriting", tags=["handwriting"])
app.include_router(diagnose.router, prefix="/api", tags=["diagnose"])


@app.get("/health")
async def health():
    return {"status": "ok"}

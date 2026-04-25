from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import pdf, audio, handwriting, diagnose

app = FastAPI(title="DyslexiAID API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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

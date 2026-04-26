# Kirana

Kirana is a full-stack assistive learning prototype for Indonesian elementary students, especially children in grades 1-3 who may show early indicators of dyslexia. It combines early screening, handwriting analysis, oral reading analysis, adaptive PDF reading, gaze-aware interventions, and child-friendly Indonesian explanations.

The project is organized as a monorepo with:

- **Backend**: FastAPI service for PDF extraction, audio transcription, handwriting analysis, dyslexia-risk reasoning, and knowledge retrieval.
- **Frontend**: Next.js app for the Kirana landing page, screening flow, Smart Reader upload flow, and adaptive student reading session.
- **Knowledge base**: Indonesian dyslexia guidance, reading-fluency benchmarks, and optional pgvector ingestion.
- **Tests**: Backend unit/integration tests plus frontend unit/e2e test scaffolding.

> **Clinical disclaimer:** This application provides **screening support only**. It is not a clinical diagnosis tool. Children with persistent or disruptive indicators should be referred to qualified professionals such as educational psychologists, neuropsychologists, speech therapists, or other relevant clinicians.

---

## Table of contents

1. [Core capabilities](#core-capabilities)
2. [System architecture](#system-architecture)
3. [Repository structure](#repository-structure)
4. [Tech stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Environment variables](#environment-variables)
7. [Local development](#local-development)
8. [Backend API](#backend-api)
9. [Frontend routes](#frontend-routes)
10. [Screening pipeline](#screening-pipeline)
11. [Smart Reader pipeline](#smart-reader-pipeline)
12. [AI and model behavior](#ai-and-model-behavior)
13. [Knowledge base and RAG](#knowledge-base-and-rag)
14. [Testing](#testing)
15. [Troubleshooting](#troubleshooting)
16. [Production notes](#production-notes)
17. [Roadmap ideas](#roadmap-ideas)

---

## Core capabilities

### 1. Tri-modal dyslexia screening

The screening journey guides a child through:

1. **Handwriting capture**
   - Uploads or captures an image of handwriting.
   - Runs YOLO-based detection for normal, reversal, and corrected writing patterns.
   - Returns classification, confidence, detected boxes, and an annotated image.

2. **Eye-tracking calibration**
   - Uses WebGazer in the browser.
   - Smooths gaze points with exponential moving average.
   - Prepares the child for gaze-aware reading analysis.

3. **Oral reading recording**
   - Records browser microphone audio.
   - Sends audio to the backend.
   - Transcribes Indonesian speech with faster-whisper.
   - Computes words per minute and word-level timestamps.

4. **Risk interpretation**
   - Combines handwriting and transcript signals.
   - Runs a LangGraph-style multi-step backend pipeline:
     - researcher
     - diagnostician
     - critic
     - reporter
   - Produces a low, medium, or high risk result with indicators, reasoning, and recommendations.

### 2. Smart Reader

Smart Reader lets a teacher upload a PDF and generate a student reading link.

The student session:

- Retrieves extracted PDF text and image blocks from the backend.
- Displays readable text blocks.
- Tracks gaze behavior.
- Detects long fixations, regressions, and rereading.
- Adapts font size, line height, letter spacing, and OpenDyslexic font.
- Uses LLM helpers for:
  - word definitions
  - sentence simplification
  - paragraph-to-bullets simplification
- Supports Indonesian browser text-to-speech.

### 3. Indonesian-first dyslexia support

The knowledge base and prompts are written for Indonesian educational context:

- Dyslexia definition and screening guidance.
- Letter reversal interpretation.
- Reading fluency benchmarks for SD grades 1-3.
- Referral criteria.
- Adaptive reading accommodations.

---

## System architecture

```text
                 +-------------------------------+
                 |        Next.js Frontend        |
                 |-------------------------------|
                 | Landing page                  |
                 | Screening flow                |
                 | Smart Reader upload           |
                 | Student read session          |
                 | WebGazer gaze tracking        |
                 | Browser microphone/camera     |
                 | LLM route /api/llm            |
                 +---------------+---------------+
                                 |
                                 | HTTP / multipart / JSON
                                 |
                 +---------------v---------------+
                 |          FastAPI Backend       |
                 |-------------------------------|
                 | /api/pdf/extract              |
                 | /api/pdf/session              |
                 | /api/audio/transcribe         |
                 | /api/handwriting/analyze      |
                 | /api/diagnose                 |
                 | /health                       |
                 +---------------+---------------+
                                 |
          +----------------------+----------------------+
          |                      |                      |
+---------v---------+  +---------v---------+  +---------v---------+
| PyMuPDF PDF       |  | faster-whisper    |  | YOLO handwriting  |
| extraction        |  | transcription     |  | detection         |
+-------------------+  +-------------------+  +-------------------+
                                 |
                 +---------------v---------------+
                 | LangGraph diagnosis pipeline  |
                 | researcher -> diagnostician   |
                 | -> critic -> reporter         |
                 +---------------+---------------+
                                 |
                 +---------------v---------------+
                 | Dyslexia knowledge retrieval  |
                 | in-memory sentence-transformer|
                 | optional PostgreSQL + pgvector|
                 +-------------------------------+
```

---

## Repository structure

```text
.
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── agents/
│   │   │   ├── researcher.py
│   │   │   ├── diagnostician.py
│   │   │   ├── critic.py
│   │   │   ├── reporter.py
│   │   │   ├── graph.py
│   │   │   └── state.py
│   │   ├── api/
│   │   │   ├── audio.py
│   │   │   ├── diagnose.py
│   │   │   ├── handwriting.py
│   │   │   └── pdf.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── services/
│   │       ├── embedding_service.py
│   │       ├── handwriting_analyzer.py
│   │       ├── pdf_extractor.py
│   │       └── whisper_service.py
│   ├── data/
│   │   └── dyslexia_knowledge.json
│   ├── ingest/
│   │   ├── kelancaran_membaca_standar.md
│   │   └── panduan_disleksia_indonesia.md
│   ├── scripts/
│   │   └── ingest_knowledge.py
│   ├── tests/
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── requirements-dev.txt
├── docs/
│   └── api-contracts.md
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx
    │   │   ├── screening/page.tsx
    │   │   ├── smart-reader/page.tsx
    │   │   ├── read/[id]/page.tsx
    │   │   ├── demo/page.tsx
    │   │   └── api/llm/route.ts
    │   ├── components/
    │   │   ├── adaptive-ui/
    │   │   ├── pdf-reader/
    │   │   ├── screening/
    │   │   └── webgazer/
    │   ├── lib/
    │   │   ├── llm/
    │   │   ├── pdf/
    │   │   ├── tts/
    │   │   └── webgazer/
    │   └── types/
    ├── tests/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vitest.config.ts
    └── playwright.config.ts
```

---

## Tech stack

### Backend

- Python 3.11+
- FastAPI
- Uvicorn
- Pydantic v2
- PyMuPDF
- faster-whisper
- LangGraph
- OpenAI SDK
- OpenRouter-compatible API access
- sentence-transformers
- PostgreSQL + pgvector support
- PyTorch / torchvision
- Ultralytics YOLO
- Pillow
- NumPy
- pytest / pytest-asyncio / httpx / ruff

### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- React PDF
- WebGazer
- Zustand
- Groq SDK
- OpenAI SDK
- Claude Agent SDK runtime integration
- Vitest
- Testing Library
- Playwright

---

## Prerequisites

Install the following before running locally:

- **Python 3.11+**
- **Node.js 20+**
- **npm**
- **A browser with camera and microphone permissions**
- Optional but recommended:
  - PostgreSQL with pgvector
  - A GPU-capable Python/PyTorch environment for faster model inference
  - A local YOLO handwriting model file
  - ffmpeg or system media codecs if your environment has trouble decoding uploaded audio

---

## Environment variables

A root `.env.example` is included as a convenience reference, and `backend/.env.example` mirrors backend-related values.

### Backend variables

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Then edit:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/Kirana
OPENROUTER_API_KEY=sk-...
GROQ_API_KEY=gsk_...
PRODUCTION=false
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
HANDWRITING_MODEL_PATH=backend/app/models/handwriting/yolo26n.pt
```

Notes:

- `OPENROUTER_API_KEY` is used by backend diagnosis reasoning.
- If `OPENROUTER_API_KEY` is missing, the backend falls back to a short deterministic reasoning string.
- `WHISPER_MODEL_SIZE` defaults to `large-v3` in code, but examples use `base` for faster local startup.
- `WHISPER_DEVICE` can be `cpu` or a supported accelerator device.
- `HANDWRITING_MODEL_PATH` must point to an actual YOLO `.pt` model file for real handwriting inference.

### Frontend variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_TITLE=Kirana
PRODUCTION=false
```

Notes:

- `NEXT_PUBLIC_BACKEND_URL` is read by browser-side pages.
- `GROQ_API_KEY` is used by the default local LLM provider.
- `PRODUCTION=true` switches the frontend LLM provider to the Claude Agent SDK provider.
- The Claude Agent SDK provider expects a globally available Claude CLI/SDK runtime and authentication.

---

## Local development

Run backend and frontend in separate terminals.

### 1. Backend setup

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements-dev.txt
```

Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --env-file .env
```

Check health:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Frontend setup

```bash
cd frontend

npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend automatically copies `webgazer` into `public/webgazer.js` before `dev` and `build` via the `predev` and `prebuild` scripts.

---

## Backend API

Base URL in local development:

```text
http://localhost:8000
```

### Health

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### Extract a PDF

```http
POST /api/pdf/extract
Content-Type: multipart/form-data
```

Input:

```text
file: .pdf
```

Response shape:

```ts
{
  pages: Array<{
    page_num: number;
    blocks: Array<{
      id: string;
      type: "text" | "image";
      bbox: { x0: number; y0: number; x1: number; y1: number };
      text?: string;
      image_data?: string;
    }>;
  }>;
  total_pages: number;
}
```

Example:

```bash
curl -X POST http://localhost:8000/api/pdf/extract \
  -F "file=@sample.pdf"
```

### Create a PDF reading session

```http
POST /api/pdf/session
Content-Type: multipart/form-data
```

Input:

```text
file: .pdf
```

Response:

```json
{
  "session_id": "uuid",
  "total_pages": 3
}
```

Important:

- Sessions are stored in memory.
- The backend keeps up to 100 sessions.
- Sessions disappear when the backend process restarts.

### Retrieve a PDF reading session

```http
GET /api/pdf/session/{session_id}
```

Response is the same extracted PDF structure used by the reader.

### Transcribe audio

```http
POST /api/audio/transcribe
Content-Type: multipart/form-data
```

Supported extensions:

```text
.wav, .mp3, .m4a, .webm, .ogg
```

Input:

```text
file: audio file
language: id
```

Response shape:

```ts
{
  full_text: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  words_per_minute: number;
  detected_language: string;
  pause_rate?: number;
}
```

Example:

```bash
curl -X POST http://localhost:8000/api/audio/transcribe \
  -F "file=@recording.webm" \
  -F "language=id"
```

### Analyze handwriting

```http
POST /api/handwriting/analyze
Content-Type: multipart/form-data
```

Supported extensions:

```text
.jpg, .jpeg, .png, .webp
```

Response shape:

```ts
{
  classification: "normal" | "reversal" | "corrected";
  confidence: number;
  reversal_chars: string[];
  gradcam_image?: string;
  detected_chars: Array<{
    bbox: [number, number, number, number];
    cls: number;
    conf: number;
    label: string;
    char: string | null;
    is_reversal: boolean;
    is_corrected: boolean;
  }>;
}
```

Class IDs:

```text
0 = Normal
1 = Reversal
2 = Corrected
```

Example:

```bash
curl -X POST http://localhost:8000/api/handwriting/analyze \
  -F "file=@handwriting.png"
```

### Diagnose

```http
POST /api/diagnose
Content-Type: application/json
```

Input shape:

```ts
{
  handwriting?: {
    classification: "normal" | "reversal" | "corrected";
    confidence: number;
    reversal_chars?: string[];
    gradcam_image?: string;
    detected_chars?: unknown[];
  };
  transcript?: {
    full_text: string;
    words: Array<{ word: string; start: number; end: number }>;
    words_per_minute: number;
    detected_language: string;
    pause_rate?: number;
  };
  child_age?: number;
  child_grade?: number;
}
```

At least one of `handwriting` or `transcript` is required.

Response shape:

```ts
{
  risk_level: "low" | "medium" | "high";
  confidence: number;
  indicators: Array<{
    name: string;
    severity: "mild" | "moderate" | "significant";
    evidence: string;
  }>;
  reasoning: string;
  recommendation: string;
}
```

Example:

```bash
curl -X POST http://localhost:8000/api/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "child_age": 8,
    "child_grade": 2,
    "handwriting": {
      "classification": "reversal",
      "confidence": 0.91,
      "reversal_chars": ["b", "d"]
    },
    "transcript": {
      "full_text": "buku ini bagus",
      "words": [
        {"word": "buku", "start": 0.0, "end": 0.5},
        {"word": "ini", "start": 0.6, "end": 0.9},
        {"word": "bagus", "start": 1.0, "end": 1.4}
      ],
      "words_per_minute": 25.0,
      "detected_language": "id"
    }
  }'
```

---

## Frontend routes

### `/`

Landing page for Kirana.

Includes:

- Brand introduction.
- Font toggle for OpenDyslexic preview.
- Entry points to screening and Smart Reader.

### `/screening`

Guided child-friendly screening flow.

Phases:

1. Handwriting upload/capture.
2. Child age and grade input.
3. Eye calibration.
4. Reading aloud and microphone recording.
5. Backend diagnosis.
6. Results dashboard and Smart Reader recommendation.

### `/smart-reader`

Teacher PDF upload page.

Includes:

- Drag-and-drop PDF upload.
- Backend session creation.
- Shareable student link.
- Upload history in `localStorage`.
- Copy/open/delete history controls.

### `/read/[id]`

Student reading session for a PDF session.

Includes:

- Session retrieval from backend.
- WebGazer calibration.
- Text reader.
- Gaze-triggered adaptation.
- Word popup and simplification features.

### `/demo`

Demo wrapper for the adaptive reader component.

### `/api/llm`

Next.js API route for LLM helpers.

Supported actions:

```text
word_definition
simplify_sentence
simplify_paragraph
```

---

## Screening pipeline

### Backend graph

The diagnosis backend compiles a LangGraph `StateGraph` with four ordered nodes:

```text
researcher -> diagnostician -> critic -> reporter
```

### 1. Researcher

Builds contextual evidence from:

- child age
- child grade
- handwriting classification
- reversal characters
- model detection count
- transcript words per minute
- pause rate
- retrieved dyslexia knowledge snippets

It also adds the key limitation that the result is a screening signal, not a clinical diagnosis.

### 2. Diagnostician

Computes risk score from available observations.

Current scoring logic:

- Handwriting reversal: `+0.4`
- Corrected handwriting: `+0.2`
- WPM below 40: `+0.4`
- WPM below 60: `+0.2`

Risk thresholds:

```text
risk_score >= 0.6  -> high
risk_score >= 0.3  -> medium
otherwise          -> low
```

Recommendations:

- High: consult an educational psychologist or speech therapist.
- Medium: monitor development and consider further evaluation.
- Low: no immediate action; continue monitoring.

### 3. Critic

Applies false-positive checks.

Examples:

- If a child is age 6 or younger and the diagnosis is high risk, the critic downgrades to medium because letter reversal can still be developmentally normal.
- If WPM is very low for a young child, it adds a caution that low reading speed may reflect reading unfamiliarity, not only dyslexia.

### 4. Reporter

Combines diagnosis reasoning with critic notes and returns the final report.

---

## Smart Reader pipeline

### Teacher flow

```text
Upload PDF -> backend extracts blocks -> backend stores session -> frontend creates shareable /read/{id} link
```

### Student flow

```text
Open /read/{id}
-> fetch PDF session
-> calibrate gaze
-> render text blocks
-> process gaze points
-> detect reading anomalies
-> adapt reading experience
```

### Gaze events

The frontend detects:

- **Fixation**
  - Long gaze on a word.
  - Triggers word definition popup.

- **Regression**
  - Backward horizontal movement while reading.
  - Triggers sentence simplification.
  - Repeated regressions increase font size and line height.

- **Reread**
  - Repeated visits to the same text block.
  - Triggers paragraph simplification.
  - Repeated rereads can switch to OpenDyslexic settings.

### Adaptive UI changes

The reader can adjust:

- font size
- line height
- letter spacing
- font family
- sentence simplification
- paragraph bullet conversion
- word definition popup
- text-to-speech playback

---

## AI and model behavior

### Backend diagnosis reasoning

The backend diagnostician can call an OpenRouter-compatible API using the OpenAI SDK.

Default backend model string:

```text
anthropic/claude-sonnet-4-6
```

If no backend `OPENROUTER_API_KEY` is configured, the backend returns fallback reasoning.

### Frontend LLM provider

The frontend chooses provider from `PRODUCTION`:

```ts
PRODUCTION === "true" -> ClaudeAgentSDKProvider
otherwise             -> GroqProvider
```

Default local Groq model:

```text
llama-3.3-70b-versatile
```

The LLM helper prompts require JSON-only responses and then parse the response into typed objects.

### OpenRouter frontend provider

An OpenRouter provider also exists and supports:

- configurable API key
- configurable model
- site URL header
- app title header
- JSON response format

### Handwriting YOLO model

The handwriting service expects a YOLO `.pt` file.

Default resolution order:

1. explicit `model_path`
2. `HANDWRITING_MODEL_PATH`
3. `backend/app/models/handwriting/best.pt`

The root and backend `.env.example` reference:

```text
backend/app/models/handwriting/yolo26n.pt
```

If the model file is absent, real handwriting inference will fail. The dedicated YOLO unit test is skipped when the local model file is not present.

### Whisper transcription

The backend uses faster-whisper with:

- configurable model size
- configurable device
- `compute_type="int8"`
- word timestamps enabled
- WPM computed from total audio duration when available

The code saves uploaded audio to a temporary `.webm` file to avoid timestamp parsing issues with WebM content mislabeled as WAV.

---

## Knowledge base and RAG

The backend includes `backend/data/dyslexia_knowledge.json`, which contains short Indonesian guidance snippets about:

- dyslexia definition
- letter reversal
- reading speed benchmarks
- screening protocol
- family history
- phonological awareness
- early intervention
- adaptive reading accommodations
- diagnosis criteria
- co-occurring conditions
- referral criteria

### In-memory retrieval

By default, `embedding_service.py` loads the JSON file and attempts to use:

```text
firqaaa/indo-sentence-bert-base
```

If sentence-transformers or embeddings are unavailable, retrieval falls back gracefully.

### Optional pgvector ingestion

If PostgreSQL and pgvector are available:

```bash
cd backend
source .venv/bin/activate
python scripts/ingest_knowledge.py
```

Behavior:

- If `DATABASE_URL` is missing, the script skips database ingestion.
- If available, it creates a `dyslexia_knowledge` table with a `vector(768)` column.
- Existing rows are upserted.

---

## Testing

### Backend tests

Install dev dependencies:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
```

Run all backend tests:

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=app
```

Run lint:

```bash
ruff check .
```

Backend test coverage includes:

- audio transcription API
- handwriting API
- PDF extraction API
- diagnosis API
- agent pipeline logic
- handwriting analyzer validation
- YOLO model inference when local model exists
- PDF text/image block extraction
- Whisper service behavior

### Frontend tests

```bash
cd frontend
npm test
```

Watch mode:

```bash
npm run test:watch
```

Type checking:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

E2E tests:

```bash
npm run test:e2e
```

Notes:

- Playwright launches the Next.js dev server automatically.
- Some e2e scenarios are placeholders or skipped until mocks are implemented.
- WebGazer-dependent flows need browser camera permissions or mocks.

---

## Troubleshooting

### Backend starts slowly

Whisper is pre-warmed on app startup. The first run may download a model and can be slow.

Use a smaller local model for development:

```env
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
```

### Handwriting analysis fails with model path error

Check that the YOLO model exists:

```bash
ls backend/app/models/handwriting/yolo26n.pt
```

Then confirm:

```env
HANDWRITING_MODEL_PATH=backend/app/models/handwriting/yolo26n.pt
```

### PDF links disappear after restart

PDF sessions are stored in memory. A backend restart clears them.

For production, replace `_sessions` in `backend/app/api/pdf.py` with persistent storage such as:

- PostgreSQL
- Redis
- object storage plus database metadata

### WebGazer fails during SSR/build

The project avoids bundling WebGazer into the server bundle through `next.config.ts`, and the frontend loads `/webgazer.js` as a browser script.

Make sure this command succeeds:

```bash
cd frontend
npm run copy-webgazer
```

### Browser cannot access camera or microphone

Use:

```text
http://localhost:3000
```

or HTTPS in production.

Then allow browser permissions for:

- camera
- microphone

### LLM route fails locally

Check:

```env
GROQ_API_KEY=gsk_...
PRODUCTION=false
```

For `PRODUCTION=true`, ensure Claude Agent SDK/CLI is installed and authenticated in the runtime environment.

### Backend diagnosis returns fallback reasoning

Set:

```env
OPENROUTER_API_KEY=sk-...
```

Then restart the backend.

### CORS behavior

The backend currently allows all origins:

```text
allow_origins=["*"]
```

This is convenient for local development, but should be restricted in production.

---

## Production notes

Before deploying, consider these changes:

### Security

- Restrict CORS origins.
- Add file size limits for PDF, audio, and image uploads.
- Add MIME sniffing beyond file extension checks.
- Store secrets in a managed secrets system.
- Avoid logging sensitive child data or raw transcripts in production.
- Add authentication for teacher/admin flows.
- Add abuse prevention and rate limits.

### Privacy

The app processes sensitive child-related data:

- handwriting images
- audio recordings
- reading behavior
- gaze data
- dyslexia-risk indicators

Recommended production policy:

- minimize retention
- encrypt at rest
- delete raw uploads after processing unless explicitly needed
- separate student identity from screening artifacts
- document parental/guardian consent requirements
- provide clear data deletion workflows

### Persistence

Replace demo/in-memory features with durable services:

- PDF sessions -> database/object storage
- upload history -> authenticated server-side history
- knowledge base -> pgvector or managed vector DB
- model artifacts -> versioned model storage

### Model governance

- Version YOLO model artifacts.
- Track training data provenance.
- Measure false positives/false negatives.
- Validate across Indonesian handwriting samples.
- Calibrate risk thresholds with clinical/educational experts.
- Make all outputs explainable and conservative.

### Accessibility

- Provide keyboard-only flows.
- Provide non-camera fallback reading support.
- Provide non-microphone fallback assessment.
- Avoid over-reliance on gaze tracking for students without camera access.
- Support larger text and high-contrast modes.

---

## Roadmap ideas

- Persistent teacher/student accounts.
- Secure PDF storage and revocable links.
- Screening history dashboard.
- Exportable parent/teacher report PDF.
- Better WCPM calculation using expected reading text and correctness.
- Word omission/substitution detection.
- More robust Indonesian phonological assessment.
- Additional dyslexia indicators beyond handwriting and WPM.
- Calibration quality scoring for WebGazer.
- Offline-friendly TTS and simplified content cache.
- Admin UI for knowledge-base updates.
- Model metrics dashboard.
- Human-in-the-loop professional review workflow.

---

## Development checklist

Before opening a pull request:

```bash
cd backend
pytest
ruff check .
```

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

Also manually verify:

- Landing page loads.
- Screening can upload handwriting.
- Browser asks for camera and microphone permissions.
- Audio transcription endpoint is reachable.
- Diagnosis returns low/medium/high risk.
- Smart Reader can upload a PDF.
- `/read/{session_id}` loads the extracted session.
- Gaze calibration and adaptive reader do not crash.

---

## Maintainer notes

The current project snapshot is a strong demo/prototype architecture. It already separates frontend interaction, backend services, diagnosis agents, knowledge retrieval, and tests. The biggest production gaps are persistence, privacy controls, model artifact management, authentication, and clinical validation.

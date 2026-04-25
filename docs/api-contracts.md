# API Contracts

## POST /api/pdf/extract
**Input**: `multipart/form-data` `{ file: .pdf }`
**Output**: `PDFExtractResponse { pages: PageBlocks[], total_pages: number }`

## POST /api/audio/transcribe
**Input**: `multipart/form-data` `{ file: .wav|.mp3|.webm, language: string }`
**Output**: `TranscriptResult { full_text, words[], words_per_minute, detected_language }`

## POST /api/handwriting/analyze
**Input**: `multipart/form-data` `{ file: .jpg|.png }`
**Output**: `HandwritingResult { classification, confidence, reversal_chars[], gradcam_image? }`

## POST /api/diagnose
**Input**: `DiagnoseRequest { handwriting?, transcript?, child_age?, child_grade? }`
**Output**: `DiagnosisResult { risk_level, confidence, indicators[], reasoning, recommendation }`

## POST /api/llm (Next.js API route)
**Input**: `{ action: "word_definition"|"simplify_sentence"|"simplify_paragraph", payload: {...} }`
**Output**: `WordDefinitionResponse | SimplifiedSentenceResponse | SimplifiedParagraphResponse`

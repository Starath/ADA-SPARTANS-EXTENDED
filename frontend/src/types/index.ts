// Gaze tracking types
export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TextBlock {
  id: string;
  rect: DOMRect;
  text: string;
  pageNum: number;
}

export type GazeEventType =
  | "fixation"
  | "regression"
  | "saccade_backward"
  | "reread";

export interface GazeEvent {
  type: GazeEventType;
  blockId: string;
  wordId?: string;
  duration?: number;
  count?: number;
  timestamp: number;
}

// PDF types
export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PDFBlock {
  id: string;
  type: "text" | "image";
  bbox: BBox;
  text?: string;
  imageData?: string; // base64
}

export interface PDFPage {
  pageNum: number;
  blocks: PDFBlock[];
}

// Diagnosis types
export type RiskLevel = "low" | "medium" | "high";

export interface DiagnosisResult {
  riskLevel: RiskLevel;
  confidence: number;
  indicators: string[];
  reasoning: string;
  recommendation: string;
}

// Adaptive UI types
export interface AdaptationEvent {
  type: "word_popup" | "simplify_sentence" | "simplify_paragraph" | "adjust_font";
  blockId: string;
  wordId?: string;
  payload?: Record<string, unknown>;
}

export interface FontSettings {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: "default" | "opendyslexic";
}

// LLM types
export interface LLMProvider {
  complete(prompt: string, system?: string): Promise<string>;
  stream?(prompt: string, system?: string): AsyncIterable<string>;
}

export interface WordDefinitionResponse {
  definition: string;
}

export interface SimplifiedSentenceResponse {
  simplified: string;
}

export interface SimplifiedParagraphResponse {
  bullets: string[];
}

// Transcription types
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  fullText: string;
  words: TranscriptWord[];
  wordsPerMinute: number;
  detectedLanguage: string;
}

// Handwriting types
export type HandwritingClassification = "normal" | "reversal" | "corrected";

export interface HandwritingResult {
  classification: HandwritingClassification;
  confidence: number;
  reversalChars: string[];
  gradcamImage?: string;
}

// Screening session state
export interface ScreeningSession {
  childAge?: number;
  childGrade?: number;
  handwriting?: HandwritingResult;
  transcript?: TranscriptResult;
  diagnosis?: DiagnosisResult;
}

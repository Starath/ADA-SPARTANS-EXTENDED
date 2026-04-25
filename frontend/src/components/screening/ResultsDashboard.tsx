"use client";

import Link from "next/link";
import type {
  DiagnosisResult,
  HandwritingResult,
  TranscriptResult,
} from "@/types";
import { DetectionCanvas, DetectionLegend } from "./DetectionCanvas";

interface Props {
  diagnosis: DiagnosisResult;
  handwriting?: HandwritingResult;
  handwritingImageUrl?: string;
  transcript?: TranscriptResult;
}

const RISK_CONFIG = {
  low: {
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-800",
    label: "Risiko Rendah",
    icon: "✅",
  },
  medium: {
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    label: "Risiko Sedang",
    icon: "⚠️",
  },
  high: {
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
    label: "Risiko Tinggi",
    icon: "🔴",
  },
} as const;


export function ResultsDashboard({
  diagnosis,
  handwriting,
  handwritingImageUrl,
  transcript,
}: Props) {
  const cfg = RISK_CONFIG[diagnosis.riskLevel];
  const showDemo = diagnosis.riskLevel === "medium" || diagnosis.riskLevel === "high";
  const detections = handwriting?.detectedChars ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Hasil Skrining</h2>

      {/* Risk Level Card */}
      <div className={`rounded-xl border-2 p-6 ${cfg.bg}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{cfg.icon}</span>
          <div>
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <p className={`mt-1 text-sm font-medium ${cfg.color}`}>
              Kepercayaan: {Math.round(diagnosis.confidence * 100)}%
            </p>
          </div>
        </div>

        {diagnosis.indicators && diagnosis.indicators.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Indikator yang ditemukan:</p>
            <ul className="space-y-1">
              {diagnosis.indicators.map((ind, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>
                    {typeof ind === "string"
                      ? ind
                      : `${(ind as { name: string; evidence: string }).name}: ${
                          (ind as { name: string; evidence: string }).evidence
                        }`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Claude Reasoning */}
      {diagnosis.reasoning && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Analisis AI</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{diagnosis.reasoning}</p>
        </div>
      )}

      {/* Recommendation */}
      {diagnosis.recommendation && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800 mb-1">Rekomendasi</p>
          <p className="text-sm text-blue-700">{diagnosis.recommendation}</p>
        </div>
      )}

      {/* Handwriting YOLO Visualization */}
      {handwriting && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Analisis Tulisan Tangan — YOLO Detection
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                handwriting.classification === "reversal"
                  ? "bg-red-100 text-red-800"
                  : handwriting.classification === "corrected"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {handwriting.classification.charAt(0).toUpperCase() +
                handwriting.classification.slice(1)}
            </span>
            <span className="text-xs text-gray-500">
              Confidence: {Math.round(handwriting.confidence * 100)}%
            </span>
            <span className="text-xs text-gray-500">
              {detections.length} deteksi
            </span>
          </div>

          {handwritingImageUrl && detections.length > 0 && (
            <>
              <DetectionCanvas
                imageUrl={handwritingImageUrl}
                detections={detections}
                annotatedB64={handwriting.gradcamImage}
              />
              <DetectionLegend detections={detections} />
            </>
          )}

          {handwritingImageUrl && detections.length === 0 && (
            <img
              src={handwritingImageUrl}
              alt="Tulisan tangan"
              className="rounded-lg w-full max-h-48 object-contain"
            />
          )}

          {handwriting.reversalChars && handwriting.reversalChars.length > 0 && (
            <p className="text-xs text-red-600">
              Huruf terbalik terdeteksi:{" "}
              <strong>{handwriting.reversalChars.join(", ")}</strong>
            </p>
          )}
        </div>
      )}

      {/* Audio Transcript Summary */}
      {transcript && (
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Membaca Lisan</p>
          <div className="flex gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {Math.round(transcript.wordsPerMinute)}
              </p>
              <p className="text-xs text-gray-500">kata/menit</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{transcript.words.length}</p>
              <p className="text-xs text-gray-500">kata terdeteksi</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 uppercase">
                {transcript.detectedLanguage}
              </p>
              <p className="text-xs text-gray-500">bahasa</p>
            </div>
          </div>
          {transcript.fullText && (
            <p className="mt-2 text-xs text-gray-500 line-clamp-3 italic">
              &ldquo;{transcript.fullText}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* CTA to Smart Reader */}
      {showDemo && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-800 mb-2">
            Coba Smart Reader 📖
          </p>
          <p className="text-sm text-green-700 mb-4">
            Berdasarkan hasil skrining, anak mungkin akan mendapat manfaat dari
            fitur membaca adaptif. Upload PDF dan buat link untuk siswa.
          </p>
          <Link
            href="/smart-reader"
            className="inline-block rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            Buka Smart Reader
          </Link>
        </div>
      )}

      <p className="text-xs text-gray-400">
        * Hasil ini adalah skrining awal dan bukan diagnosis klinis. Konsultasikan
        dengan psikolog pendidikan atau terapis wicara bila diperlukan.
      </p>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { HandwritingCapture } from "@/components/screening/HandwritingCapture";
import { CalibrationScreen } from "@/components/webgazer/CalibrationScreen";
import { WebGazerProvider, useWebGazer } from "@/components/webgazer/WebGazerProvider";
import type { DiagnosisResult, HandwritingResult, TranscriptResult } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const READING_TEXT =
  "Budi pergi ke sekolah dengan berjalan kaki. Di jalan ia bertemu dengan teman-temannya. Mereka bermain bersama di halaman sekolah besar.";

type Phase =
  | "handwriting"
  | "handwriting_done"
  | "calibrating"
  | "recording"
  | "recording_done"
  | "diagnosing"
  | "results";

const PHASE_STEP: Record<Phase, number> = {
  handwriting: 0,
  handwriting_done: 0,
  calibrating: 1,
  recording: 2,
  recording_done: 2,
  diagnosing: 3,
  results: 3,
};

// ─── Word-level reading analysis ─────────────────────────────────────────────

type WordStatus = "ok" | "slow" | "missed";
interface WordAnalysis {
  displayWord: string;
  status: WordStatus;
  pause?: number;
}

function analyzeReadingText(transcript: TranscriptResult | undefined): WordAnalysis[] {
  const words = READING_TEXT.split(/\s+/);

  if (!transcript || transcript.words.length === 0) {
    return words.map((w) => ({ displayWord: w, status: "ok" }));
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/gi, "");
  const tw = transcript.words;
  const twNorm = tw.map((w) => normalize(w.word));
  let searchFrom = 0;

  return words.map((word) => {
    const norm = normalize(word);
    let idx = -1;
    for (let i = searchFrom; i < twNorm.length; i++) {
      if (twNorm[i] === norm || twNorm[i].startsWith(norm) || norm.startsWith(twNorm[i])) {
        idx = i;
        break;
      }
    }

    if (idx === -1) return { displayWord: word, status: "missed" };

    searchFrom = idx + 1;
    const prev = idx > 0 ? tw[idx - 1] : null;
    const pause = prev ? tw[idx].start - prev.end : 0;

    return { displayWord: word, status: pause > 0.8 ? "slow" : "ok", pause };
  });
}

// ─── Shared small components ──────────────────────────────────────────────────

function KiranaLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <polygon
          points="11,2 13.5,8 20,8 14.5,12.5 16.5,19 11,15 5.5,19 7.5,12.5 2,8 8.5,8"
          fill="#5AC8C8"
        />
      </svg>
      <span className="font-bold text-base text-slate-800 tracking-tight">KIRANA</span>
    </div>
  );
}

function ScreeningHeader({ onLogoClick }: { onLogoClick?: () => void }) {
  return (
    <>
      <div className="h-1 bg-[#5AC8C8]" />
      <header className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {onLogoClick ? (
            <button onClick={onLogoClick}>
              <KiranaLogo />
            </button>
          ) : (
            <Link href="/">
              <KiranaLogo />
            </Link>
          )}
          <h1 className="text-sm font-semibold text-slate-600">StellarReader Explorer</h1>
          <div className="w-20" />
        </div>
      </header>
    </>
  );
}

function ScreeningFooter() {
  return (
    <footer className="mt-12 border-t border-gray-100 bg-white py-5 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <KiranaLogo />
        <p className="text-xs text-slate-400">
          © 2024 DyslexiAID Indonesia. Pendamping Belajar dengan Kasih Sayang.
        </p>
        <nav className="flex gap-4 text-xs text-slate-400">
          <a href="#" className="hover:text-slate-600">
            Kebijakan Privasi
          </a>
          <a href="#" className="hover:text-slate-600">
            Syarat Ketentuan
          </a>
          <a href="#" className="hover:text-slate-600">
            Pusat Bantuan
          </a>
        </nav>
      </div>
    </footer>
  );
}

function StepIndicator({ phase }: { phase: Phase }) {
  const current = PHASE_STEP[phase];
  const steps = ["✏️ Tulisan", "👁 Kalibrasi", "🎙 Membaca", "📊 Hasil"];
  return (
    <div className="max-w-3xl mx-auto px-6 pt-5 pb-1">
      <div className="flex items-center gap-1">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
            <span
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                i === current
                  ? "bg-[#5AC8C8] text-white shadow-sm"
                  : i < current
                  ? "bg-[#5AC8C8]/20 text-[#5AC8C8]"
                  : "bg-gray-100 text-slate-400"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-gray-200" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Phase 1: Handwriting ─────────────────────────────────────────────────────

function HandwritingPhase({
  onResult,
}: {
  onResult: (result: HandwritingResult, imageUrl: string) => void;
}) {
  return (
    <div className="max-w-xl mx-auto px-6 pt-8 pb-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">✏️</div>
        <h1 className="text-2xl font-bold text-slate-800">Let&apos;s Write!</h1>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Ambil pena favoritmu dan tulis kata-kata ini di kertas.
          <br />
          Santai saja, tidak perlu terburu-buru!
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-[#5AC8C8]/50 bg-white px-8 py-6 text-center mb-6 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Tuliskan kata-kata ini
        </p>
        <p className="text-4xl font-bold text-slate-800 tracking-wider">Ibu · Buku · Dadu</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <HandwritingCapture onResult={onResult} />
      </div>
    </div>
  );
}

// ─── Phase 1 Done: Good Job (Handwriting) ─────────────────────────────────────

function HandwritingDonePhase({
  handwriting,
  handwritingImageUrl,
  childAge,
  childGrade,
  onChildAge,
  onChildGrade,
  onNext,
}: {
  handwriting: HandwritingResult;
  handwritingImageUrl: string;
  childAge: number | undefined;
  childGrade: number | undefined;
  onChildAge: (v: number | undefined) => void;
  onChildGrade: (v: number | undefined) => void;
  onNext: () => void;
}) {
  const detections = handwriting.detectedChars ?? [];
  const total = detections.length;
  const reversalCount = detections.filter((d) => d.cls === 1).length;
  const correctedCount = detections.filter((d) => d.cls === 2).length;
  const normalCount = total - reversalCount - correctedCount;

  return (
    <div className="max-w-xl mx-auto px-6 pt-8 pb-12">
      {/* Good Job banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#5AC8C8] to-[#38a0a0] p-6 text-center text-white mb-6 shadow-md">
        <div className="text-5xl mb-3">🌟</div>
        <h2 className="text-2xl font-bold">Tulisanmu Keren Banget!</h2>
        <p className="mt-2 text-sm opacity-90">Kamu sudah berusaha dengan baik. Lanjutkan ya, kamu hebat!</p>
      </div>

      {/* Handwriting image — no bounding boxes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Foto Tulisanmu</p>
        <img
          src={handwritingImageUrl}
          alt="Tulisan tangan"
          className="w-full rounded-xl object-contain max-h-48 bg-gray-50"
        />
        {total > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 py-2">
              <p className="text-xl font-bold text-green-600">{normalCount}</p>
              <p className="text-[10px] text-slate-500">Normal ✓</p>
            </div>
            <div className="rounded-lg bg-amber-50 py-2">
              <p className="text-xl font-bold text-amber-600">{correctedCount}</p>
              <p className="text-[10px] text-slate-500">Dikoreksi</p>
            </div>
            <div className="rounded-lg bg-slate-50 py-2">
              <p className="text-xl font-bold text-slate-600">{total}</p>
              <p className="text-[10px] text-slate-500">Total</p>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400 text-center">
          Klasifikasi:{" "}
          <span className="font-medium text-slate-600 capitalize">{handwriting.classification}</span>
          {" · "}Kepercayaan model: {Math.round(handwriting.confidence * 100)}%
        </p>
      </div>

      {/* Child info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Info Anak</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Usia</label>
            <input
              type="number"
              min={5}
              max={12}
              value={childAge ?? ""}
              onChange={(e) => onChildAge(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5AC8C8]/40"
              placeholder="mis. 8"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kelas</label>
            <select
              value={childGrade ?? ""}
              onChange={(e) => onChildGrade(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5AC8C8]/40"
            >
              <option value="">Pilih</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-[#5AC8C8] text-white font-bold py-3.5 rounded-2xl hover:bg-[#4ab8b8] transition-colors text-base shadow"
      >
        Selanjutnya: Kalibrasi Mata 👁 →
      </button>
    </div>
  );
}

// ─── Phase 3: Recording + Gaze (must be inside WebGazerProvider) ──────────────

interface TranscriptLog {
  wordsPerMinute: number;
  wordCount: number;
  durationSec: number;
  language: string;
  text: string;
  wordTimings: Array<{ word: string; start: number; end: number; pause: number }>;
}

type RecordState = "idle" | "recording" | "processing" | "done";

function RecordingPhase({
  onTranscriptReady,
}: {
  onTranscriptReady: (result: TranscriptResult) => void;
}) {
  const { latestGaze, isReady } = useWebGazer();
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<TranscriptLog | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show webgazer camera preview while this step is active
  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => {
      window.webgazer?.showVideoPreview(true);
    }, 400);
    return () => {
      clearTimeout(t);
      window.webgazer?.showVideoPreview(false);
    };
  }, [isReady]);

  async function startRecording() {
    setError(null);
    setLogs(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      setDuration(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void submitAudio();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordState("recording");
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Tidak bisa mengakses mikrofon. Izinkan akses mikrofon di browser.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecordState("processing");
  }

  async function submitAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language", "id");

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/audio/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Server error: ${await res.text()}`);

      const data = await res.json();
      const result: TranscriptResult = {
        fullText: data.full_text,
        words: data.words ?? [],
        wordsPerMinute: data.words_per_minute,
        detectedLanguage: data.detected_language,
      };

      // Build debug log
      const wordTimings: TranscriptLog["wordTimings"] = (data.words ?? []).map(
        (w: { word: string; start: number; end: number }, i: number) => {
          const prev = i > 0 ? data.words[i - 1] : null;
          return {
            word: w.word,
            start: w.start,
            end: w.end,
            pause: prev ? w.start - prev.end : 0,
          };
        }
      );

      const durationSec =
        wordTimings.length > 0
          ? wordTimings[wordTimings.length - 1].end - wordTimings[0].start
          : 0;

      setLogs({
        wordsPerMinute: data.words_per_minute,
        wordCount: wordTimings.length,
        durationSec,
        language: data.detected_language,
        text: data.full_text,
        wordTimings,
      });

      setRecordState("done");
      onTranscriptReady(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses rekaman");
      setRecordState("idle");
    }
  }

  return (
    <>
      {/* Red gaze dot overlay */}
      {latestGaze && (
        <div className="pointer-events-none fixed inset-0 z-[9999]">
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow-lg ring-2 ring-red-400/40"
            style={{ left: latestGaze.x, top: latestGaze.y }}
          />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📖</div>
          <h1 className="text-2xl font-bold text-slate-800">Reading Adventure</h1>
          <p className="mt-1 text-sm text-slate-500">
            Bacakan teks berikut dengan suara keras dan jelas
          </p>
          {isReady ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#5AC8C8] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#5AC8C8] animate-pulse" />
              Kamera aktif — mata kamu sedang dilacak
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
              Menunggu kamera…
            </div>
          )}
        </div>

        {/* Reading text — large and clear */}
        <div className="bg-white rounded-2xl border-2 border-[#5AC8C8]/25 p-8 shadow-sm mb-6">
          <p className="text-xl leading-relaxed text-slate-800 font-medium text-center">
            {READING_TEXT}
          </p>
        </div>

        {/* Recording controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="flex items-center justify-center gap-4">
            {recordState === "idle" && (
              <button
                onClick={() => void startRecording()}
                className="flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 text-base font-semibold text-white hover:bg-red-600 transition-colors shadow"
              >
                <span className="h-3 w-3 rounded-full bg-white" />
                Mulai Rekam
              </button>
            )}

            {recordState === "recording" && (
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 text-red-600 font-medium">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  Merekam… {duration}s
                </div>
                <button
                  onClick={stopRecording}
                  className="rounded-full bg-slate-700 px-8 py-3 text-base font-semibold text-white hover:bg-slate-900 transition-colors"
                >
                  Selesai ■
                </button>
              </div>
            )}

            {recordState === "processing" && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses rekaman dengan AI…
              </div>
            )}

            {recordState === "done" && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <span>✅</span> Rekaman berhasil diproses
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 text-center">
              {error}
            </p>
          )}
        </div>

        {/* Debug log — always shown after processing */}
        {logs && (
          <div className="bg-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">
              Debug Log — Audio Transcript
            </p>
            <p>
              <span className="text-green-400">words_per_minute:</span>{" "}
              <span className="text-white font-bold">{logs.wordsPerMinute}</span>
            </p>
            <p>
              <span className="text-green-400">word_count:</span> {logs.wordCount}
            </p>
            <p>
              <span className="text-green-400">word_span_sec:</span> {logs.durationSec.toFixed(2)}s
            </p>
            <p>
              <span className="text-green-400">detected_language:</span> {logs.language}
            </p>
            <p>
              <span className="text-green-400">transcript:</span>{" "}
              <span className="text-yellow-200">&quot;{logs.text}&quot;</span>
            </p>
            {logs.wordTimings.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                  Word timings ({logs.wordTimings.length} words)
                </summary>
                <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto pr-1">
                  {logs.wordTimings.map((w, i) => (
                    <p
                      key={i}
                      className={w.pause > 0.8 ? "text-amber-400" : "text-slate-300"}
                    >
                      [{w.start.toFixed(2)}–{w.end.toFixed(2)}] &quot;{w.word}&quot;
                      {w.pause > 0 ? ` (+${w.pause.toFixed(2)}s jeda)` : ""}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Phase 3 Done: Good Job (Recording) ──────────────────────────────────────

function RecordingDonePhase({
  transcript,
  onNext,
}: {
  transcript: TranscriptResult;
  onNext: () => void;
}) {
  const wpm = Math.round(transcript.wordsPerMinute);

  return (
    <div className="max-w-xl mx-auto px-6 pt-8 pb-12">
      {/* Good Job banner */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-center text-white mb-6 shadow-md">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold">Bacaanmu Bagus Banget!</h2>
        <p className="mt-2 text-sm opacity-90">
          Terima kasih sudah membaca dengan keras. Kamu luar biasa!
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Hasil Rekaman</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-[#f0fafa] py-3">
            <p className="text-2xl font-bold text-slate-800">{wpm}</p>
            <p className="text-xs text-slate-500">kata/menit</p>
          </div>
          <div className="rounded-xl bg-[#f0fafa] py-3">
            <p className="text-2xl font-bold text-slate-800">{transcript.words.length}</p>
            <p className="text-xs text-slate-500">kata</p>
          </div>
          <div className="rounded-xl bg-[#f0fafa] py-3">
            <p className="text-lg font-bold text-slate-800 uppercase">
              {transcript.detectedLanguage}
            </p>
            <p className="text-xs text-slate-500">bahasa</p>
          </div>
        </div>
        {transcript.fullText && (
          <p className="mt-3 text-xs text-slate-400 italic line-clamp-2">
            &ldquo;{transcript.fullText}&rdquo;
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        className="w-full bg-[#5AC8C8] text-white font-bold py-3.5 rounded-2xl hover:bg-[#4ab8b8] transition-colors text-base shadow"
      >
        Lihat Hasil Lengkap →
      </button>
    </div>
  );
}

// ─── Phase: Diagnosing ────────────────────────────────────────────────────────

function DiagnosingPhase() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <svg className="h-10 w-10 animate-spin text-[#5AC8C8]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-slate-600 font-medium">Menganalisis hasil skrining…</p>
      <p className="text-xs text-slate-400">AI sedang memproses data tulisan dan rekaman suara</p>
    </div>
  );
}

// ─── Results Page ─────────────────────────────────────────────────────────────

function ResultsPage({
  diagnosis,
  handwriting,
  handwritingImageUrl,
  transcript,
  onReset,
}: {
  diagnosis: DiagnosisResult;
  handwriting?: HandwritingResult;
  handwritingImageUrl?: string;
  transcript?: TranscriptResult;
  onReset: () => void;
}) {
  const riskPct = Math.round(diagnosis.confidence * 100);
  const showSmartReader = diagnosis.riskLevel === "medium" || diagnosis.riskLevel === "high";
  const wordAnalysis = analyzeReadingText(transcript);

  // Build detailed handwriting explanation for results
  function getHandwritingDetail() {
    if (!handwriting) return null;
    const detections = handwriting.detectedChars ?? [];
    const total = detections.length;
    const reversalCount = detections.filter((d) => d.cls === 1).length;
    const correctedCount = detections.filter((d) => d.cls === 2).length;
    const normalCount = total - reversalCount - correctedCount;

    const lines: string[] = [];

    if (total === 0) {
      if (handwriting.reversalChars && handwriting.reversalChars.length > 0) {
        lines.push(
          `Model mendeteksi kemungkinan reversal pada huruf: ${handwriting.reversalChars.join(", ")}`
        );
      }
      lines.push(`Confidence model: ${Math.round(handwriting.confidence * 100)}%`);
      lines.push("Coba foto ulang dengan pencahayaan lebih baik untuk deteksi lebih akurat.");
    } else {
      lines.push(`${total} huruf terdeteksi`);
      if (normalCount > 0)
        lines.push(`→ ${normalCount} huruf ditulis benar (${Math.round((normalCount / total) * 100)}%)`);
      if (correctedCount > 0)
        lines.push(
          `→ ${correctedCount} huruf dikoreksi sendiri (${Math.round((correctedCount / total) * 100)}%) — anak menyadari ada kesalahan`
        );
      if (reversalCount > 0)
        lines.push(
          `→ ${reversalCount} huruf ditulis terbalik (${Math.round((reversalCount / total) * 100)}%)`
        );
      if (handwriting.reversalChars && handwriting.reversalChars.length > 0)
        lines.push(`Huruf terbalik: ${handwriting.reversalChars.join(", ")}`);
    }

    const riskExplanation =
      handwriting.classification === "reversal"
        ? "Pembalikan huruf (reversal) adalah salah satu ciri utama disleksia. Paling relevan jika konsisten dan terjadi setelah usia 7 tahun. Perlu evaluasi lanjutan oleh profesional."
        : handwriting.classification === "corrected"
        ? "Koreksi berlebihan menunjukkan anak menyadari pola tulisan yang salah, namun masih perlu usaha ekstra. Ini bisa jadi tanda awal yang perlu dipantau."
        : "Pola tulisan tangan terdeteksi dalam batas normal untuk usia ini.";

    return { lines, riskExplanation, total, reversalCount, correctedCount, normalCount };
  }

  const hwDetail = getHandwritingDetail();

  // Build enriched indicator evidence from raw handwriting data
  function enrichIndicatorEvidence(
    indicatorName: string,
    originalEvidence: string
  ): string {
    if (!handwriting) return originalEvidence;
    const name = indicatorName.toLowerCase();
    if (!name.includes("pembalikan") && !name.includes("reversal")) return originalEvidence;

    const detections = handwriting.detectedChars ?? [];
    const total = detections.length;
    const reversalCount = detections.filter((d) => d.cls === 1).length;

    if (total > 0 && reversalCount > 0) {
      let ev = `${reversalCount} dari ${total} huruf ditulis terbalik (${Math.round((reversalCount / total) * 100)}%)`;
      if (handwriting.reversalChars?.length) {
        ev += ` — huruf teridentifikasi: ${handwriting.reversalChars.join(", ")}`;
      }
      return ev;
    }

    if (handwriting.reversalChars?.length) {
      return `Huruf berpotensi terbalik: ${handwriting.reversalChars.join(", ")} (confidence ${Math.round(handwriting.confidence * 100)}%)`;
    }

    if (total === 0) {
      return `Model YOLO mendeteksi pola reversal dengan confidence ${Math.round(handwriting.confidence * 100)}%. Tidak ada karakter spesifik teridentifikasi — coba foto ulang dengan pencahayaan lebih baik untuk deteksi lebih rinci.`;
    }

    return originalEvidence;
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <ScreeningHeader onLogoClick={onReset} />

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-slate-800">Screening Journey Complete!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Berikut profil belajar unik berdasarkan tulisan tangan dan rekaman suara.
          </p>
        </div>

        {/* Learning Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-lg">Learning Profile</h2>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-[#5AC8C8] font-medium hover:underline"
            >
              👤 Screening siswa lain
            </button>
          </div>

          <div className="flex items-start gap-6">
            {/* Circle confidence indicator */}
            <div className="flex-shrink-0 text-center">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8f0fe" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#5AC8C8"
                    strokeWidth="3"
                    strokeDasharray={`${riskPct} ${100 - riskPct}`}
                    strokeDashoffset="25"
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-800">{riskPct}%</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wide">CONFIDENCE</span>
                </div>
              </div>
              <span
                className={`mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                  diagnosis.riskLevel === "high"
                    ? "bg-red-100 text-red-700"
                    : diagnosis.riskLevel === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {diagnosis.riskLevel === "high"
                  ? "Risiko Tinggi"
                  : diagnosis.riskLevel === "medium"
                  ? "Risiko Sedang"
                  : "Risiko Rendah"}
              </span>
            </div>

            {/* AI reasoning */}
            <div className="flex-1">
              <p className="text-sm text-slate-600 leading-relaxed">
                {diagnosis.reasoning ||
                  "Anak Anda memiliki gaya belajar yang unik dan berharga. Otak mereka memproses kata-kata secara berbeda, dan kami memiliki alat yang tepat untuk membantu mereka bersinar."}
              </p>
            </div>
          </div>

          {/* Detailed indicators */}
          {diagnosis.indicators && diagnosis.indicators.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Indikator</p>
              {diagnosis.indicators.map((ind, i) => {
                const indicator =
                  typeof ind === "string"
                    ? { name: ind, evidence: "", severity: "mild" }
                    : (ind as { name: string; evidence: string; severity?: string });

                const evidence = enrichIndicatorEvidence(
                  indicator.name,
                  indicator.evidence ?? ""
                );

                return (
                  <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${
                          indicator.severity === "significant"
                            ? "bg-red-500"
                            : indicator.severity === "moderate"
                            ? "bg-yellow-500"
                            : "bg-blue-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-700">{indicator.name}</span>
                      {indicator.severity && (
                        <span className="text-[10px] text-slate-400 capitalize ml-1">
                          ({indicator.severity})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed pl-4">{evidence}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {/* How They Read — using actual Budi text */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#5AC8C8]">👁</span>
              <h3 className="font-bold text-slate-800">How They Read</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Analisis berdasarkan rekaman suara. Kata yang disorot menunjukkan area yang membutuhkan perhatian ekstra.
            </p>

            {/* Budi text with per-word analysis */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 leading-loose text-sm">
              {wordAnalysis.map((wa, i) => (
                <span
                  key={i}
                  className={`inline-block mr-1 px-0.5 rounded cursor-default ${
                    wa.status === "missed"
                      ? "bg-red-200 text-red-800 font-semibold"
                      : wa.status === "slow"
                      ? "bg-yellow-200 text-yellow-800"
                      : "text-slate-700"
                  }`}
                  title={
                    wa.status === "slow"
                      ? `Jeda ${wa.pause?.toFixed(1)}s sebelum kata ini`
                      : wa.status === "missed"
                      ? "Tidak terdeteksi dalam rekaman"
                      : ""
                  }
                >
                  {wa.displayWord}
                </span>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded bg-yellow-200 inline-block" />
                Jeda panjang (&gt;0.8s)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded bg-red-200 inline-block" />
                Tidak terdeteksi
              </span>
            </div>

            {transcript && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#f0fafa] rounded-lg py-2">
                  <p className="text-lg font-bold text-slate-800">
                    {Math.round(transcript.wordsPerMinute)}
                  </p>
                  <p className="text-xs text-slate-500">kata/menit</p>
                </div>
                <div className="bg-[#f0fafa] rounded-lg py-2">
                  <p className="text-lg font-bold text-slate-800">{transcript.words.length}</p>
                  <p className="text-xs text-slate-500">kata terdeteksi</p>
                </div>
              </div>
            )}
          </div>

          {/* Handwriting Detail — no bounding boxes, with reasoning */}
          {handwriting && handwritingImageUrl && hwDetail && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#5AC8C8]">✍️</span>
                <h3 className="font-bold text-slate-800">Deteksi Tulisan Tangan</h3>
              </div>

              <img
                src={handwritingImageUrl}
                alt="Tulisan tangan"
                className="w-full rounded-xl max-h-32 object-contain bg-gray-50 border border-gray-100 mb-3"
              />

              {/* Breakdown */}
              {hwDetail.total > 0 && (
                <div className="grid grid-cols-3 gap-1.5 text-center mb-3">
                  <div className="rounded-lg bg-green-50 py-2">
                    <p className="text-lg font-bold text-green-600">{hwDetail.normalCount}</p>
                    <p className="text-[10px] text-slate-500">Normal</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 py-2">
                    <p className="text-lg font-bold text-amber-600">{hwDetail.correctedCount}</p>
                    <p className="text-[10px] text-slate-500">Dikoreksi</p>
                  </div>
                  <div className="rounded-lg bg-red-50 py-2">
                    <p className="text-lg font-bold text-red-600">{hwDetail.reversalCount}</p>
                    <p className="text-[10px] text-slate-500">Reversal</p>
                  </div>
                </div>
              )}

              {/* Detail lines */}
              <div className="space-y-1 mb-3">
                {hwDetail.lines.map((line, i) => (
                  <p key={i} className="text-xs text-slate-600">
                    {line}
                  </p>
                ))}
              </div>

              {/* Why explanation */}
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-xs text-amber-800 leading-relaxed">{hwDetail.riskExplanation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation + CTA */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-lg mb-2">Ready to Explore?</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            Smart Reader dirancang khusus untuk membuat membaca terasa seperti petualangan, menyesuaikan kecepatan dan gaya belajar anak.
          </p>

          {diagnosis.recommendation && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Rekomendasi</p>
              <p className="text-sm text-blue-600">{diagnosis.recommendation}</p>
            </div>
          )}

          <div className="space-y-3">
            {showSmartReader ? (
              <a
                href="/smart-reader"
                className="flex items-center justify-center gap-2 w-full bg-[#f0fafa] border-2 border-[#5AC8C8]/30 text-slate-700 font-semibold py-3.5 rounded-2xl hover:bg-[#e4f5f5] transition-colors text-sm"
              >
                🚀 Launch Smart Reader
              </a>
            ) : (
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                <p className="text-sm text-green-700 font-medium">
                  ✅ Tidak ada tindakan segera diperlukan
                </p>
              </div>
            )}
            <button
              onClick={onReset}
              className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
            >
              Screening untuk siswa lain →
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          * Hasil ini adalah skrining awal dan bukan diagnosis klinis. Konsultasikan dengan
          psikolog pendidikan atau terapis wicara bila diperlukan.
        </p>
      </main>

      <ScreeningFooter />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
  const [phase, setPhase] = useState<Phase>("handwriting");
  const [childAge, setChildAge] = useState<number | undefined>();
  const [childGrade, setChildGrade] = useState<number | undefined>();
  const [handwriting, setHandwriting] = useState<HandwritingResult | undefined>();
  const [handwritingImageUrl, setHandwritingImageUrl] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<TranscriptResult | undefined>();
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | undefined>();
  const [diagError, setDiagError] = useState<string | null>(null);

  async function runDiagnosis(
    hw: HandwritingResult | undefined,
    tr: TranscriptResult | undefined
  ) {
    setPhase("diagnosing");
    setDiagError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handwriting: hw
            ? {
                classification: hw.classification,
                confidence: hw.confidence,
                reversal_chars: hw.reversalChars,
              }
            : null,
          transcript: tr
            ? {
                full_text: tr.fullText,
                words: tr.words,
                words_per_minute: tr.wordsPerMinute,
                detected_language: tr.detectedLanguage,
              }
            : null,
          child_age: childAge ?? null,
          child_grade: childGrade ?? null,
        }),
      });
      if (!res.ok) throw new Error(`Diagnosis gagal: ${await res.text()}`);
      const data = await res.json();
      setDiagnosis({
        riskLevel: data.risk_level,
        confidence: data.confidence,
        indicators: data.indicators,
        reasoning: data.reasoning,
        recommendation: data.recommendation,
      });
      setPhase("results");
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : "Terjadi kesalahan saat analisis");
      setPhase("recording_done");
    }
  }

  function handleReset() {
    setPhase("handwriting");
    setHandwriting(undefined);
    setHandwritingImageUrl(undefined);
    setTranscript(undefined);
    setDiagnosis(undefined);
    setDiagError(null);
    setChildAge(undefined);
    setChildGrade(undefined);
  }

  // Results page has its own full layout (header + footer)
  if (phase === "results" && diagnosis) {
    return (
      <ResultsPage
        diagnosis={diagnosis}
        handwriting={handwriting}
        handwritingImageUrl={handwritingImageUrl}
        transcript={transcript}
        onReset={handleReset}
      />
    );
  }

  // Phases that need webgazer (calibration + recording)
  const inGazePhase = phase === "calibrating" || phase === "recording";

  const showStepIndicator = !inGazePhase && phase !== "diagnosing";

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <ScreeningHeader />

      {showStepIndicator && <StepIndicator phase={phase} />}

      {/* Non-gaze phases */}
      {phase === "handwriting" && (
        <HandwritingPhase
          onResult={(result, imageUrl) => {
            setHandwriting(result);
            setHandwritingImageUrl(imageUrl);
            setPhase("handwriting_done");
          }}
        />
      )}

      {phase === "handwriting_done" && handwriting && handwritingImageUrl && (
        <HandwritingDonePhase
          handwriting={handwriting}
          handwritingImageUrl={handwritingImageUrl}
          childAge={childAge}
          childGrade={childGrade}
          onChildAge={setChildAge}
          onChildGrade={setChildGrade}
          onNext={() => setPhase("calibrating")}
        />
      )}

      {/* Gaze phases — wrap with WebGazerProvider so both calibration and recording share state */}
      {inGazePhase && (
        <WebGazerProvider>
          {phase === "calibrating" && (
            <CalibrationScreen onComplete={() => setPhase("recording")} />
          )}
          {phase === "recording" && (
            <RecordingPhase
              onTranscriptReady={(tr) => {
                setTranscript(tr);
                setPhase("recording_done");
              }}
            />
          )}
        </WebGazerProvider>
      )}

      {/* Recording done — good job screen */}
      {phase === "recording_done" && transcript && (
        <RecordingDonePhase
          transcript={transcript}
          onNext={() => void runDiagnosis(handwriting, transcript)}
        />
      )}

      {phase === "diagnosing" && <DiagnosingPhase />}

      {/* Diagnosis error fallback */}
      {diagError && phase === "recording_done" && (
        <div className="max-w-xl mx-auto px-6 pb-4">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{diagError}</p>
          </div>
        </div>
      )}

      <ScreeningFooter />
    </div>
  );
}

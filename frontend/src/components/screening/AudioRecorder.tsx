"use client";

import { useRef, useState } from "react";
import type { TranscriptResult } from "@/types";

interface Props {
  onResult: (result: TranscriptResult) => void;
}

type RecorderState = "idle" | "recording" | "processing" | "done";

const SAMPLE_TEXT =
  "Budi pergi ke sekolah dengan berjalan kaki. Di jalan ia bertemu dengan teman-temannya. Mereka bermain bersama di halaman sekolah.";

export function AudioRecorder({ onResult }: Props) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setError(null);
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
      setState("recording");

      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Tidak bisa mengakses mikrofon. Izinkan akses mikrofon di browser.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setState("processing");
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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${text}`);
      }

      const data = await res.json();
      // Normalize snake_case → camelCase
      const result: TranscriptResult = {
        fullText: data.full_text,
        words: data.words,
        wordsPerMinute: data.words_per_minute,
        detectedLanguage: data.detected_language,
      };

      setState("done");
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses rekaman");
      setState("idle");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Langkah 2: Rekam Suara Membaca</h2>
      <p className="text-sm text-gray-600">
        Minta anak membaca teks berikut dengan suara keras, lalu klik Mulai Rekam.
      </p>

      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
        <p className="text-sm font-medium text-gray-700 leading-relaxed">{SAMPLE_TEXT}</p>
      </div>

      <div className="flex items-center gap-4">
        {state === "idle" && (
          <button
            onClick={() => void startRecording()}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            Mulai Rekam
          </button>
        )}

        {state === "recording" && (
          <>
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              Merekam… {duration}s
            </div>
            <button
              onClick={stopRecording}
              className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
            >
              Selesai
            </button>
          </>
        )}

        {state === "processing" && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memproses rekaman…
          </div>
        )}

        {state === "done" && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <span>✅</span> Rekaman berhasil diproses
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

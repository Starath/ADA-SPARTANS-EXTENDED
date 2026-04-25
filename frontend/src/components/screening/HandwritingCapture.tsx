"use client";

import { useRef, useState } from "react";
import type { HandwritingResult } from "@/types";

interface Props {
  onResult: (result: HandwritingResult, imageUrl: string) => void;
}

export function HandwritingCapture({ onResult }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [annotatedPreview, setAnnotatedPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setAnnotatedPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/handwriting/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${text}`);
      }

      const raw = await res.json();
      console.log("[Handwriting] detected_chars:", raw.detected_chars?.length ?? 0, "gradcam:", !!raw.gradcam_image);

      const data: HandwritingResult = {
        classification: raw.classification,
        confidence: raw.confidence,
        reversalChars: raw.reversal_chars ?? [],
        gradcamImage: raw.gradcam_image ?? undefined,
        detectedChars: raw.detected_chars ?? [],
      };

      if (raw.gradcam_image) {
        setAnnotatedPreview(`data:image/png;base64,${raw.gradcam_image}`);
      }

      onResult(data, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menganalisis gambar");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      void handleFile(file);
    }
  }

  function handleReset() {
    setPreview(null);
    setAnnotatedPreview(null);
    setError(null);
  }

  return (
    <div className="space-y-3">
      {/* Preview area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !preview && fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed border-[#5AC8C8]/40 bg-[#f0fafa] overflow-hidden transition-colors ${!preview ? "cursor-pointer hover:border-[#5AC8C8]" : ""}`}
        style={{ minHeight: 160 }}
      >
        {annotatedPreview ? (
          <img src={annotatedPreview} alt="Deteksi tulisan tangan" className="w-full object-contain max-h-64" />
        ) : preview ? (
          <img src={preview} alt="Foto tulisan tangan" className="w-full object-contain max-h-64" />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-2xl shadow-sm">
              📷
            </div>
            <p className="text-sm text-slate-500 font-medium">Capture Photo</p>
            <p className="text-xs text-slate-400">atau drag foto ke sini</p>
          </div>
        )}
      </div>

      {annotatedPreview && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
          <span className="text-green-600 font-medium">Normal</span>
          <span className="h-2 w-2 rounded-full bg-red-400 inline-block ml-2" />
          <span className="text-red-600 font-medium">Reversal</span>
          <span className="h-2 w-2 rounded-full bg-blue-500 inline-block ml-2" />
          <span className="text-blue-600 font-medium">Corrected</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl bg-[#e4f5f5] border border-[#c8e8e8] py-2.5 text-sm font-semibold text-[#3aabab] hover:bg-[#d4efef] transition-colors flex items-center justify-center gap-2"
        >
          📷 Capture Photo
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReset}
          className="w-full rounded-xl bg-gray-50 border border-gray-200 py-2 text-sm text-slate-500 hover:bg-gray-100 transition-colors"
        >
          ↺ Ganti Foto
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#5AC8C8]">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Menganalisis tulisan tangan…
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

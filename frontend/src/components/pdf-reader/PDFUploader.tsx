"use client";
import { useCallback, useState } from "react";
import type { PDFPage } from "@/types";

interface Props {
  onExtracted: (pages: PDFPage[]) => void;
}

export function PDFUploader({ onExtracted }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pdf")) {
        setError("Hanya file PDF yang diterima.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/pdf/extract`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        onExtracted(data.pages);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [onExtracted]
  );

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
    >
      <input
        type="file"
        accept=".pdf"
        className="hidden"
        id="pdf-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <label htmlFor="pdf-input" className="cursor-pointer">
        <p className="text-gray-500 text-lg">
          {loading ? "Memproses PDF..." : "Seret PDF ke sini atau klik untuk pilih"}
        </p>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </label>
    </div>
  );
}

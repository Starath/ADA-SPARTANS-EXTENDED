"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { BBox, PDFPage } from "@/types";

interface PDFUploaderProps {
  onExtracted: (pages: PDFPage[], file: File) => void;
}

interface RawPDFBlock {
  id?: string;
  type?: "text" | "image";
  bbox: BBox | [number, number, number, number];
  text?: string;
  imageData?: string;
  image_data?: string;
}

interface RawPDFPage {
  pageNum?: number;
  page_num?: number;
  blocks?: RawPDFBlock[];
}

interface PDFExtractResponse {
  pages?: RawPDFPage[];
  data?: RawPDFPage[];
}

export function PDFUploader({ onExtracted }: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("File harus berupa PDF.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
      const response = await fetch(`${backendUrl}/api/pdf/extract`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Gagal mengekstrak PDF.");
      }

      const json = (await response.json()) as PDFExtractResponse | RawPDFPage[];
      const pages = normalizePDFPages(json);

      if (pages.length === 0) {
        throw new Error("Tidak ada halaman yang berhasil diekstrak.");
      }

      onExtracted(pages, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "rounded-xl border-2 border-dashed p-8 text-center transition",
        isDragging ? "border-black bg-gray-50" : "border-gray-300 bg-white",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      <p className="text-sm font-medium">Upload PDF bacaan</p>
      <p className="mt-1 text-xs text-gray-500">
        Tarik file ke sini atau pilih dari perangkat.
      </p>

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? "Memproses..." : "Pilih PDF"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function normalizePDFPages(data: PDFExtractResponse | RawPDFPage[]): PDFPage[] {
  const rawPages = Array.isArray(data) ? data : data.pages ?? data.data ?? [];

  return rawPages.map((page, pageIndex) => {
    const pageNum = page.pageNum ?? page.page_num ?? pageIndex + 1;

    return {
      pageNum,
      blocks: (page.blocks ?? []).map((block, blockIndex) => ({
        id: block.id ?? `page-${pageNum}-block-${blockIndex}`,
        type: block.type ?? (block.text ? "text" : "image"),
        bbox: normalizeBBox(block.bbox),
        text: block.text,
        imageData: block.imageData ?? block.image_data,
      })),
    };
  });
}

function normalizeBBox(bbox: BBox | [number, number, number, number]): BBox {
  if (Array.isArray(bbox)) {
    const [x0, y0, x1, y1] = bbox;
    return { x0, y0, x1, y1 };
  }

  return bbox;
}
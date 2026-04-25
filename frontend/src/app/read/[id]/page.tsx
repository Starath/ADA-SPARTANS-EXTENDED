"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BBox,
  GazeEvent,
  PDFBlock,
  PDFPage,
  SimplifiedParagraphResponse,
  SimplifiedSentenceResponse,
} from "@/types";
import { WordPopup } from "@/components/adaptive-ui/WordPopup";
import {
  FontControllerProvider,
  useFontController,
} from "@/components/adaptive-ui/FontController";
import { AnomalyDetector } from "@/lib/webgazer/anomalyDetector";
import { WebGazerProvider, useWebGazer } from "@/components/webgazer/WebGazerProvider";
import { CalibrationScreen } from "@/components/webgazer/CalibrationScreen";
import { TextReader } from "@/components/pdf-reader/TextReader";

interface WordPopupState {
  wordId: string;
  word: string;
  anchorRect: DOMRect;
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

function normalizeBBox(bbox: BBox | [number, number, number, number]): BBox {
  if (Array.isArray(bbox)) {
    const [x0, y0, x1, y1] = bbox;
    return { x0, y0, x1, y1 };
  }
  return bbox;
}

function normalizePDFPages(pages: RawPDFPage[]): PDFPage[] {
  return pages.map((page, idx) => ({
    pageNum: page.pageNum ?? page.page_num ?? idx + 1,
    blocks: (page.blocks ?? []).map((b, bi) => ({
      id: b.id ?? `page-${idx + 1}-block-${bi}`,
      type: b.type ?? (b.text ? "text" : "image"),
      bbox: normalizeBBox(b.bbox),
      text: b.text,
      imageData: b.imageData ?? b.image_data,
    })),
  }));
}

async function callLLM<T>(
  action: "word_definition" | "simplify_sentence" | "simplify_paragraph",
  payload: Record<string, string>
): Promise<T> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`LLM request failed: ${action}`);
  return (await res.json()) as T;
}

function findWordElement(wordId: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("[data-word-id]")).find(
      (el) => el.dataset.wordId === wordId
    ) ?? null
  );
}

function ReaderContent({ pages }: { pages: PDFPage[] }) {
  const { isCalibrated, latestGaze } = useWebGazer();
  const { fontSize, lineHeight, letterSpacing, fontFamily, increase, applyDyslexicFont, reset } =
    useFontController();

  const fontSettings = useMemo(
    () => ({ fontSize, lineHeight, letterSpacing, fontFamily }),
    [fontSize, lineHeight, letterSpacing, fontFamily]
  );

  const detector = useMemo(() => new AnomalyDetector(), []);
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null);
  const [simplifiedBlocks, setSimplifiedBlocks] = useState<Record<string, string>>({});
  const [bulletBlocks, setBulletBlocks] = useState<Record<string, string[]>>({});
  const fontAdjustedRef = useRef(false);
  const rereadAdjustedRef = useRef(false);
  const rereadCountRef = useRef(0);

  const findBlockById = useCallback(
    (blockId: string): PDFBlock | null => {
      for (const page of pages) {
        const block = page.blocks.find((b) => b.id === blockId);
        if (block) return block;
      }
      return null;
    },
    [pages]
  );

  const showWordPopup = useCallback((event: GazeEvent) => {
    if (!event.wordId) return;
    const el = findWordElement(event.wordId);
    if (!el) return;
    const word = el.dataset.word ?? el.textContent?.trim() ?? "";
    if (!word) return;
    setWordPopup({ wordId: event.wordId, word, anchorRect: el.getBoundingClientRect() });
  }, []);

  const simplifySentence = useCallback(
    async (blockId: string, text: string) => {
      if (simplifiedBlocks[blockId]) return;
      const result = await callLLM<SimplifiedSentenceResponse>("simplify_sentence", { text });
      setSimplifiedBlocks((prev) => ({ ...prev, [blockId]: result.simplified }));
    },
    [simplifiedBlocks]
  );

  const simplifyParagraph = useCallback(
    async (blockId: string, text: string) => {
      if (bulletBlocks[blockId]) return;
      const result = await callLLM<SimplifiedParagraphResponse>("simplify_paragraph", { text });
      setBulletBlocks((prev) => ({ ...prev, [blockId]: result.bullets }));
    },
    [bulletBlocks]
  );

  const handleAnomaly = useCallback(
    (event: GazeEvent) => {
      if (event.type === "fixation") {
        void showWordPopup(event);
        return;
      }
      const block = findBlockById(event.blockId);
      if (!block?.text) return;

      if (event.type === "regression") {
        void simplifySentence(event.blockId, block.text);
        if (detector.getTotalRegressions() >= 5 && !fontAdjustedRef.current) {
          fontAdjustedRef.current = true;
          increase();
        }
        return;
      }

      if (event.type === "reread") {
        rereadCountRef.current += 1;
        void simplifyParagraph(event.blockId, block.text);
        if (rereadCountRef.current >= 3 && !rereadAdjustedRef.current) {
          rereadAdjustedRef.current = true;
          applyDyslexicFont();
        }
      }
    },
    [applyDyslexicFont, detector, findBlockById, increase, showWordPopup, simplifyParagraph, simplifySentence]
  );

  useEffect(() => detector.onAnomaly(handleAnomaly), [detector, handleAnomaly]);

  useEffect(() => {
    if (!isCalibrated || !latestGaze) return;
    const el = document.elementFromPoint(latestGaze.x, latestGaze.y);
    detector.processGazePoint(latestGaze, el);
  }, [detector, isCalibrated, latestGaze]);

  useEffect(() => {
    if (!wordPopup || !latestGaze) return;
    const el = document.elementFromPoint(latestGaze.x, latestGaze.y);
    if (el instanceof HTMLElement && el.dataset.wordId === wordPopup.wordId) return;
    setWordPopup(null);
  }, [latestGaze, wordPopup]);

  useEffect(() => {
    reset();
    fontAdjustedRef.current = false;
    rereadAdjustedRef.current = false;
    rereadCountRef.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <div className="h-1 bg-[#5AC8C8]" />

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <polygon points="11,2 13.5,8 20,8 14.5,12.5 16.5,19 11,15 5.5,19 7.5,12.5 2,8 8.5,8" fill="#5AC8C8" />
            </svg>
            <span className="font-bold text-base text-slate-800 tracking-tight">KIRANA</span>
            <span className="text-slate-300 mx-1">·</span>
            <span className="text-sm text-slate-500">Smart Reader</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${isCalibrated ? "bg-green-400" : "bg-amber-400"}`} />
              <span className="text-xs text-slate-500">
                {isCalibrated ? "Eye tracking aktif" : "Perlu kalibrasi"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {!isCalibrated && <CalibrationScreen />}

      {/* Reading area */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-10 py-12">
          <TextReader
            pages={pages}
            simplifiedBlocks={simplifiedBlocks}
            bulletBlocks={bulletBlocks}
            fontSettings={fontSettings}
          />
        </div>

        {/* Adaptation status bar */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>👁 Gaze tracking {isCalibrated ? "aktif" : "nonaktif"}</span>
          <span>
            Font: {fontSettings.fontSize}px · Spasi: {fontSettings.lineHeight}
          </span>
          <span className="capitalize">Font: {fontSettings.fontFamily}</span>
        </div>
      </div>

      {wordPopup && (
        <WordPopup
          word={wordPopup.word}
          anchorRect={wordPopup.anchorRect}
          onDismiss={() => setWordPopup(null)}
        />
      )}
    </div>
  );
}

export default function ReadingSessionPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [pages, setPages] = useState<PDFPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
    fetch(`${backendUrl}/api/pdf/session/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Sesi tidak ditemukan atau sudah kedaluwarsa.");
        return res.json() as Promise<{ pages: RawPDFPage[] }>;
      })
      .then((data) => setPages(normalizePDFPages(data.pages ?? [])))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat sesi")
      );
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0fafa]">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center max-w-sm shadow-sm">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="font-bold text-slate-800 mb-2">Sesi Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <a href="/smart-reader" className="btn-teal">
            ← Kembali ke Smart Reader
          </a>
        </div>
      </div>
    );
  }

  if (!pages) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0fafa]">
        <div className="text-center space-y-4">
          <svg className="mx-auto h-10 w-10 animate-spin text-[#5AC8C8]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500">Memuat dokumen…</p>
        </div>
      </div>
    );
  }

  return (
    <WebGazerProvider>
      <FontControllerProvider>
        <ReaderContent pages={pages} />
      </FontControllerProvider>
    </WebGazerProvider>
  );
}

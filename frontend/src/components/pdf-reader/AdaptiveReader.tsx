"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FontSettings,
  GazeEvent,
  PDFBlock,
  PDFPage,
  SimplifiedParagraphResponse,
  SimplifiedSentenceResponse,
  WordDefinitionResponse,
} from "@/types";
import { AnomalyDetector } from "@/lib/webgazer/anomalyDetector";
import { WebGazerProvider, useWebGazer } from "@/components/webgazer/WebGazerProvider";
import { CalibrationScreen } from "@/components/webgazer/CalibrationScreen";
import { GazeDebugOverlay } from "@/components/webgazer/GazeDebugOverlay";
import { PDFUploader } from "./PDFUploader";
import { PDFCanvas } from "./PDFCanvas";

interface WordPopupState {
  wordId: string;
  word: string;
  x: number;
  y: number;
  definition: string;
  isLoading: boolean;
}

const DEFAULT_FONT_SETTINGS: FontSettings = {
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  fontFamily: "default",
};

export function AdaptiveReader() {
  return (
    <WebGazerProvider>
      <AdaptiveReaderContent />
    </WebGazerProvider>
  );
}

function AdaptiveReaderContent() {
  const { isCalibrated, latestGaze } = useWebGazer();

  const detector = useMemo(() => new AnomalyDetector(), []);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null);
  const [simplifiedBlocks, setSimplifiedBlocks] = useState<Record<string, string>>({});
  const [bulletBlocks, setBulletBlocks] = useState<Record<string, string[]>>({});
  const [fontSettings, setFontSettings] =
    useState<FontSettings>(DEFAULT_FONT_SETTINGS);

  const fontAdjustedRef = useRef(false);
  const rereadAdjustedRef = useRef(false);
  const rereadEventsRef = useRef(0);

  const findBlockById = useCallback(
    (blockId: string): PDFBlock | null => {
      for (const page of pages) {
        const block = page.blocks.find((item) => item.id === blockId);
        if (block) return block;
      }

      return null;
    },
    [pages]
  );

  const showWordPopup = useCallback(async (event: GazeEvent) => {
    if (!event.wordId) return;

    const element = findWordElement(event.wordId);
    if (!element) return;

    const word = element.dataset.word ?? element.textContent?.trim() ?? "";
    if (!word) return;

    const rect = element.getBoundingClientRect();

    setWordPopup({
      wordId: event.wordId,
      word,
      x: rect.left,
      y: rect.bottom + 8,
      definition: "Memuat penjelasan...",
      isLoading: true,
    });

    try {
      const result = await callLLM<WordDefinitionResponse>("word_definition", {
        word,
      });

      setWordPopup((current) => {
        if (!current || current.wordId !== event.wordId) {
          return current;
        }

        return {
          ...current,
          definition: result.definition,
          isLoading: false,
        };
      });
    } catch {
      setWordPopup((current) => {
        if (!current || current.wordId !== event.wordId) {
          return current;
        }

        return {
          ...current,
          definition: "Penjelasan belum tersedia.",
          isLoading: false,
        };
      });
    }

    window.setTimeout(() => {
      setWordPopup((current) => (current?.wordId === event.wordId ? null : current));
    }, 5000);
  }, []);

  const simplifySentence = useCallback(
    async (blockId: string, text: string) => {
      if (simplifiedBlocks[blockId]) return;

      const result = await callLLM<SimplifiedSentenceResponse>("simplify_sentence", {
        text,
      });

      setSimplifiedBlocks((current) => ({
        ...current,
        [blockId]: result.simplified,
      }));
    },
    [simplifiedBlocks]
  );

  const simplifyParagraph = useCallback(
    async (blockId: string, text: string) => {
      if (bulletBlocks[blockId]) return;

      const result = await callLLM<SimplifiedParagraphResponse>(
        "simplify_paragraph",
        { text }
      );

      setBulletBlocks((current) => ({
        ...current,
        [blockId]: result.bullets,
      }));
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
          setFontSettings((current) => ({
            ...current,
            fontSize: current.fontSize + 2,
            lineHeight: current.lineHeight + 0.2,
          }));
        }

        return;
      }

      if (event.type === "reread") {
        rereadEventsRef.current += 1;
        void simplifyParagraph(event.blockId, block.text);

        if (rereadEventsRef.current >= 3 && !rereadAdjustedRef.current) {
          rereadAdjustedRef.current = true;
          setFontSettings((current) => ({
            ...current,
            letterSpacing: Math.max(current.letterSpacing, 1),
            fontFamily: "opendyslexic",
          }));
        }
      }
    },
    [detector, findBlockById, showWordPopup, simplifyParagraph, simplifySentence]
  );

  useEffect(() => {
    return detector.onAnomaly(handleAnomaly);
  }, [detector, handleAnomaly]);

  useEffect(() => {
    if (!isCalibrated || !latestGaze) return;

    const elementAtGaze = document.elementFromPoint(latestGaze.x, latestGaze.y);
    detector.processGazePoint(latestGaze, elementAtGaze);
  }, [detector, isCalibrated, latestGaze]);

  function handleExtracted(nextPages: PDFPage[], file: File) {
    detector.reset();
    setPdfFile(file);
    setPages(nextPages);
    setWordPopup(null);
    setSimplifiedBlocks({});
    setBulletBlocks({});
    setFontSettings(DEFAULT_FONT_SETTINGS);
    fontAdjustedRef.current = false;
    rereadAdjustedRef.current = false;
    rereadEventsRef.current = 0;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      {!isCalibrated && <CalibrationScreen />}
      <GazeDebugOverlay />

      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Demo Membaca PDF</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload PDF, lalu baca teks di layar. Sistem akan menyesuaikan bantuan
            berdasarkan pola pandangan.
          </p>
        </div>

        <PDFUploader onExtracted={handleExtracted} />

        {pdfFile && pages.length > 0 && (
          <PDFCanvas
            file={pdfFile}
            pages={pages}
            simplifiedBlocks={simplifiedBlocks}
            bulletBlocks={bulletBlocks}
            fontSettings={fontSettings}
          />
        )}
      </div>

      {wordPopup && (
        <div
          className="fixed z-[9998] max-w-xs rounded-lg border bg-white p-3 text-sm shadow-lg"
          style={{
            left: wordPopup.x,
            top: wordPopup.y,
          }}
        >
          <p className="font-semibold">{wordPopup.word}</p>
          <p className="mt-1 text-gray-700">{wordPopup.definition}</p>
        </div>
      )}
    </main>
  );
}

function findWordElement(wordId: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("[data-word-id]")).find(
      (element) => element.dataset.wordId === wordId
    ) ?? null
  );
}

async function callLLM<T>(
  action: "word_definition" | "simplify_sentence" | "simplify_paragraph",
  payload: Record<string, string>
): Promise<T> {
  const response = await fetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${action}`);
  }

  return (await response.json()) as T;
}

export default AdaptiveReader;

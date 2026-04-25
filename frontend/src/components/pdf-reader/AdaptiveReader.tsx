"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
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
import { GazeDebugOverlay } from "@/components/webgazer/GazeDebugOverlay";
import { PDFUploader } from "./PDFUploader";
import { PDFCanvas } from "./PDFCanvas";

interface WordPopupState {
  wordId: string;
  word: string;
  anchorRect: DOMRect;
}

export function AdaptiveReader() {
  return (
    <WebGazerProvider>
      <FontControllerProvider>
        <AdaptiveReaderContent />
      </FontControllerProvider>
    </WebGazerProvider>
  );
}

function AdaptiveReaderContent() {
  const { isCalibrated, latestGaze } = useWebGazer();
  const {
    fontSize,
    lineHeight,
    letterSpacing,
    fontFamily,
    increase,
    applyDyslexicFont,
    reset,
  } = useFontController();

  const fontSettings = useMemo(
    () => ({
      fontSize,
      lineHeight,
      letterSpacing,
      fontFamily,
    }),
    [fontSize, lineHeight, letterSpacing, fontFamily]
  );  

  const detector = useMemo(() => new AnomalyDetector(), []);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null);
  const [simplifiedBlocks, setSimplifiedBlocks] = useState<Record<string, string>>({});
  const [bulletBlocks, setBulletBlocks] = useState<Record<string, string[]>>({});

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

  const showWordPopup = useCallback((event: GazeEvent) => {
    if (!event.wordId) return;
  
    const element = findWordElement(event.wordId);
    if (!element) return;
  
    const word = element.dataset.word ?? element.textContent?.trim() ?? "";
    if (!word) return;
  
    setWordPopup({
      wordId: event.wordId,
      word,
      anchorRect: element.getBoundingClientRect(),
    });
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
          increase();
        }

        return;
      }

      if (event.type === "reread") {
        rereadEventsRef.current += 1;
        void simplifyParagraph(event.blockId, block.text);

        if (rereadEventsRef.current >= 3 && !rereadAdjustedRef.current) {
          rereadAdjustedRef.current = true;
          applyDyslexicFont();
        }
      }
    },
    [
      applyDyslexicFont,
      detector,
      findBlockById,
      increase,
      showWordPopup,
      simplifyParagraph,
      simplifySentence,
    ]
  );

  useEffect(() => {
    return detector.onAnomaly(handleAnomaly);
  }, [detector, handleAnomaly]);

  useEffect(() => {
    if (!isCalibrated || !latestGaze) return;

    const elementAtGaze = document.elementFromPoint(latestGaze.x, latestGaze.y);
    detector.processGazePoint(latestGaze, elementAtGaze);
  }, [detector, isCalibrated, latestGaze]);

  useEffect(() => {
    if (!wordPopup || !latestGaze) return;
  
    const elementAtGaze = document.elementFromPoint(latestGaze.x, latestGaze.y);
  
    if (
      elementAtGaze instanceof HTMLElement &&
      elementAtGaze.dataset.wordId === wordPopup.wordId
    ) {
      return;
    }
  
    setWordPopup(null);
  }, [latestGaze, wordPopup]);

  function handleExtracted(nextPages: PDFPage[], file: File) {
    detector.reset();
    setPdfFile(file);
    setPages(nextPages);
    setWordPopup(null);
    setSimplifiedBlocks({});
    setBulletBlocks({});
    reset();
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
          <WordPopup
            word={wordPopup.word}
            anchorRect={wordPopup.anchorRect}
            onDismiss={() => setWordPopup(null)}
          />
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

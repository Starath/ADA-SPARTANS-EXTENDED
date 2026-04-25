"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { WebGazerProvider, useWebGazer } from "@/components/webgazer/WebGazerProvider";
import { CalibrationScreen } from "@/components/webgazer/CalibrationScreen";
import { AnomalyDetector } from "@/lib/webgazer/anomalyDetector";
import { WordPopup } from "@/components/adaptive-ui/WordPopup";
import { TextSimplifier } from "@/components/adaptive-ui/TextSimplifier";
import { useFontController } from "@/components/adaptive-ui/FontController";
import type { PDFPage, GazeEvent } from "@/types";

interface BlockState {
  simplified?: string;
  bullets?: string[];
}

interface Props {
  pages: PDFPage[];
}

function ReaderContent({ pages }: Props) {
  const { isCalibrated, setCalibrated, latestGaze } = useWebGazer();
  const { fontSize, lineHeight, letterSpacing, fontFamily, increase, applyDyslexicFont } =
    useFontController();
  const detector = useRef(new AnomalyDetector());
  const [popup, setPopup] = useState<{ word: string; rect: DOMRect } | null>(null);
  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>({});
  const totalRegressions = useRef(0);

  // Feed gaze points to anomaly detector
  useEffect(() => {
    if (!latestGaze || !isCalibrated) return;
    const el = document.elementFromPoint(latestGaze.x, latestGaze.y);
    detector.current.processGazePoint(latestGaze, el);
  }, [latestGaze, isCalibrated]);

  // Subscribe to anomaly events
  useEffect(() => {
    return detector.current.onAnomaly(async (event: GazeEvent) => {
      if (event.type === "fixation" && event.wordId) {
        const wordEl = document.querySelector(`[data-word-id="${event.wordId}"]`);
        if (wordEl) {
          setPopup({ word: wordEl.textContent ?? "", rect: wordEl.getBoundingClientRect() });
        }
      }

      if (event.type === "regression") {
        totalRegressions.current += 1;
        if (totalRegressions.current > 5) increase();
        if (totalRegressions.current > 8) applyDyslexicFont();

        const blockEl = document.querySelector(`[data-block-id="${event.blockId}"]`);
        const text = blockEl?.textContent ?? "";
        if (text) {
          const res = await fetch("/api/llm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "simplify_sentence", payload: { text } }),
          });
          const data: { simplified: string } = await res.json();
          setBlockStates((prev) => ({
            ...prev,
            [event.blockId]: { simplified: data.simplified },
          }));
        }
      }

      if (event.type === "reread") {
        const blockEl = document.querySelector(`[data-block-id="${event.blockId}"]`);
        const text = blockEl?.textContent ?? "";
        if (text) {
          const res = await fetch("/api/llm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "simplify_paragraph", payload: { text } }),
          });
          const data: { bullets: string[] } = await res.json();
          setBlockStates((prev) => ({
            ...prev,
            [event.blockId]: { bullets: data.bullets },
          }));
        }
      }
    });
  }, [increase, applyDyslexicFont]);

  if (!isCalibrated) {
    return <CalibrationScreen onComplete={() => setCalibrated(true)} />;
  }

  const textStyle = {
    fontSize,
    lineHeight,
    letterSpacing: `${letterSpacing}em`,
    fontFamily: fontFamily === "opendyslexic" ? "'OpenDyslexic', sans-serif" : "inherit",
  };

  return (
    <div className="max-w-3xl mx-auto">
      {popup && (
        <WordPopup
          word={popup.word}
          anchorRect={popup.rect}
          onDismiss={() => setPopup(null)}
        />
      )}
      {pages.map((page) => (
        <div key={page.pageNum} className="mb-8">
          {page.blocks
            .filter((b) => b.type === "text")
            .map((block) => {
              const state = blockStates[block.id];
              return (
                <p
                  key={block.id}
                  data-block-id={block.id}
                  className="mb-4 text-gray-800"
                  style={textStyle}
                >
                  {state ? (
                    <TextSimplifier
                      original={block.text ?? ""}
                      simplified={state.simplified}
                      bullets={state.bullets}
                    />
                  ) : (
                    block.text
                      ?.split(/\s+/)
                      .map((word, i) => (
                        <span
                          key={i}
                          data-word={word}
                          data-word-id={`${block.id}-${i}`}
                          data-block-id={block.id}
                          className="hover:bg-yellow-100 rounded cursor-default"
                        >
                          {word}{" "}
                        </span>
                      ))
                  )}
                </p>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export function AdaptiveReader({ pages }: Props) {
  return (
    <WebGazerProvider>
      <ReaderContent pages={pages} />
    </WebGazerProvider>
  );
}

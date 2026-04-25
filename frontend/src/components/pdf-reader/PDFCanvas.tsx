"use client";

import { useCallback, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FontSettings, PDFBlock, PDFPage } from "@/types";
import { bboxToPixelRect, tokenizeBlock } from "@/lib/pdf/blockMapper";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PDFCanvasProps {
  file: File;
  pages: PDFPage[];
  simplifiedBlocks?: Record<string, string>;
  bulletBlocks?: Record<string, string[]>;
  fontSettings?: FontSettings;
}

interface PageCanvasProps {
  page: PDFPage;
  simplifiedBlocks: Record<string, string>;
  bulletBlocks: Record<string, string[]>;
  fontSettings: FontSettings;
}

const DEFAULT_FONT_SETTINGS: FontSettings = {
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  fontFamily: "default",
};

export function PDFCanvas({
  file,
  pages,
  simplifiedBlocks = {},
  bulletBlocks = {},
  fontSettings = DEFAULT_FONT_SETTINGS,
}: PDFCanvasProps) {
  return (
    <Document
      file={file}
      loading={<p className="text-sm text-gray-500">Memuat PDF...</p>}
      error={<p className="text-sm text-red-600">Gagal memuat PDF.</p>}
    >
      <div className="space-y-8">
        {pages.map((page) => (
          <PDFPageCanvas
            key={page.pageNum}
            page={page}
            simplifiedBlocks={simplifiedBlocks}
            bulletBlocks={bulletBlocks}
            fontSettings={fontSettings}
          />
        ))}
      </div>
    </Document>
  );
}

function PDFPageCanvas({
  page,
  simplifiedBlocks,
  bulletBlocks,
  fontSettings,
}: PageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(
    null
  );

  const updateCanvasSize = useCallback(() => {
    window.requestAnimationFrame(() => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      setCanvasSize({
        width: rect.width,
        height: rect.height,
      });
    });
  }, []);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} className="relative inline-block shadow">
        <Page
          pageNumber={page.pageNum}
          width={800}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={updateCanvasSize}
        />

        {canvasSize && (
          <div className="absolute inset-0">
            {page.blocks.map((block) => (
              <TextBlockOverlay
                key={block.id}
                block={block}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                simplifiedText={simplifiedBlocks[block.id]}
                bullets={bulletBlocks[block.id]}
                fontSettings={fontSettings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TextBlockOverlayProps {
  block: PDFBlock;
  canvasWidth: number;
  canvasHeight: number;
  simplifiedText?: string;
  bullets?: string[];
  fontSettings: FontSettings;
}

function TextBlockOverlay({
  block,
  canvasWidth,
  canvasHeight,
  simplifiedText,
  bullets,
  fontSettings,
}: TextBlockOverlayProps) {
  const rect = bboxToPixelRect(block.bbox, canvasWidth, canvasHeight);

  if (block.type !== "text" || !block.text) {
    return null;
  }

  const hasOverride = Boolean(simplifiedText || bullets);
  const displayText = simplifiedText ?? block.text;
  const words = tokenizeBlock(displayText);

  return (
    <div
      data-block-id={block.id}
      className="absolute overflow-hidden rounded-sm"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        fontSize: fontSettings.fontSize,
        lineHeight: fontSettings.lineHeight,
        letterSpacing: fontSettings.letterSpacing,
        fontFamily:
          fontSettings.fontFamily === "opendyslexic"
            ? "OpenDyslexic, Arial, sans-serif"
            : "inherit",
        color: hasOverride ? "#111827" : "transparent",
        backgroundColor: hasOverride ? "rgba(255, 255, 255, 0.96)" : "transparent",
      }}
    >
      {bullets ? (
        <ul className="list-disc space-y-1 pl-5">
          {bullets.map((bullet, index) => (
            <li key={`${block.id}-bullet-${index}`}>{bullet}</li>
          ))}
        </ul>
      ) : (
        words.map((word, index) => (
          <span
            key={`${block.id}-word-${index}`}
            data-word={word}
            data-block-id={block.id}
            data-word-id={`${block.id}-word-${index}`}
          >
            {word}{" "}
          </span>
        ))
      )}
    </div>
  );
}
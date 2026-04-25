"use client";

import type { FontSettings, PDFPage } from "@/types";
import { tokenizeBlock } from "@/lib/pdf/blockMapper";

interface TextReaderProps {
  pages: PDFPage[];
  simplifiedBlocks?: Record<string, string>;
  bulletBlocks?: Record<string, string[]>;
  fontSettings?: FontSettings;
}

const DEFAULT_FONT: FontSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.02,
  fontFamily: "default",
};

export function TextReader({
  pages,
  simplifiedBlocks = {},
  bulletBlocks = {},
  fontSettings = DEFAULT_FONT,
}: TextReaderProps) {
  const fontStyle: React.CSSProperties = {
    fontSize: fontSettings.fontSize,
    lineHeight: fontSettings.lineHeight,
    letterSpacing: `${fontSettings.letterSpacing}em`,
    fontFamily:
      fontSettings.fontFamily === "opendyslexic"
        ? "OpenDyslexic, Arial, sans-serif"
        : "Georgia, serif",
  };

  return (
    <div className="space-y-10" style={fontStyle}>
      {pages.map((page) => (
        <div key={page.pageNum}>
          <div className="space-y-5">
            {page.blocks.map((block) => {
              if (block.type === "image" && block.imageData) {
                return (
                  <img
                    key={block.id}
                    src={`data:image/png;base64,${block.imageData}`}
                    alt="Gambar dari dokumen"
                    className="rounded-lg max-w-full"
                  />
                );
              }

              if (block.type !== "text" || !block.text) return null;

              const bullets = bulletBlocks[block.id];
              const simplified = simplifiedBlocks[block.id];
              const displayText = simplified ?? block.text;
              const words = tokenizeBlock(displayText);

              if (bullets) {
                return (
                  <ul
                    key={block.id}
                    data-block-id={block.id}
                    className="list-disc space-y-2 pl-6 text-gray-800 bg-yellow-50 rounded-lg p-4"
                  >
                    {bullets.map((b, i) => (
                      <li key={`${block.id}-b-${i}`}>{b}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <p
                  key={block.id}
                  data-block-id={block.id}
                  className={`text-gray-800 leading-relaxed ${
                    simplified ? "bg-blue-50 rounded-lg px-3 py-2" : ""
                  }`}
                >
                  {words.map((word, i) => (
                    <span
                      key={`${block.id}-w-${i}`}
                      data-word={word}
                      data-block-id={block.id}
                      data-word-id={`${block.id}-word-${i}`}
                      className="hover:bg-blue-100 rounded transition-colors"
                    >
                      {word}{" "}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

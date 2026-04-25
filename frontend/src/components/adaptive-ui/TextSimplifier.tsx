"use client";

import { useEffect, useState } from "react";
import { TTSPlayer } from "./TTSPlayer";

interface Props {
  original: string;
  simplified?: string;
  bullets?: string[];
}

type DisplayMode = "original" | "adaptive";

export function TextSimplifier({ original, simplified, bullets }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("original");
  const [visible, setVisible] = useState(true);

  const hasBullets = Boolean(bullets?.length);
  const hasReplacement = Boolean(simplified || hasBullets);

  useEffect(() => {
    if (!hasReplacement) {
      setDisplayMode("original");
      setVisible(true);
      return;
    }

    setDisplayMode("original");
    setVisible(false);

    let fadeIn: number | undefined;

    const fadeOut = window.setTimeout(() => {
      setDisplayMode("adaptive");
      fadeIn = window.setTimeout(() => setVisible(true), 20);
    }, 150);

    return () => {
      clearTimeout(fadeOut);
      if (fadeIn) clearTimeout(fadeIn);
    };
  }, [hasReplacement, simplified, bullets]);

  const fadeClass = `transition-opacity duration-150 ease-in-out ${
    visible ? "opacity-100" : "opacity-0"
  }`;

  if (showOriginal || !hasReplacement || displayMode === "original") {
    return (
      <span className={hasReplacement ? fadeClass : undefined}>
        {original}
        {showOriginal && hasReplacement && (
          <button
            onClick={() => setShowOriginal(false)}
            className="ml-2 text-xs text-blue-500 underline"
            type="button"
          >
            Tampilkan versi mudah
          </button>
        )}
      </span>
    );
  }

  if (hasBullets && bullets) {
    const joined = bullets.join(". ");

    return (
      <span className={`block bg-blue-50 border-l-4 border-blue-400 pl-3 py-2 rounded-r-lg ${fadeClass}`}>
        <ul className="list-disc list-inside space-y-1">
          {bullets.map((b, i) => (
            <li key={`${b}-${i}`} className="text-sm text-gray-800">
              {b}
            </li>
          ))}
        </ul>

        <TTSPlayer text={joined} autoPlay />

        <button
          onClick={() => setShowOriginal(true)}
          className="mt-1 text-xs text-gray-400 underline"
          type="button"
        >
          Lihat asli
        </button>
      </span>
    );
  }

  if (simplified) {
    return (
      <span className={`bg-green-50 border-l-4 border-green-400 pl-2 py-1 rounded-r ${fadeClass}`}>
        {simplified}

        <TTSPlayer text={simplified} autoPlay />

        <button
          onClick={() => setShowOriginal(true)}
          className="ml-2 text-xs text-gray-400 underline"
          type="button"
        >
          Lihat asli
        </button>
      </span>
    );
  }

  return <span>{original}</span>;
}
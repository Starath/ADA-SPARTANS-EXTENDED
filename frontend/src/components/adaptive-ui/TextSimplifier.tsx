"use client";
import { useState } from "react";
import { TTSPlayer } from "./TTSPlayer";

interface Props {
  original: string;
  simplified?: string;
  bullets?: string[];
}

export function TextSimplifier({ original, simplified, bullets }: Props) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (showOriginal) {
    return (
      <span>
        {original}
        <button
          onClick={() => setShowOriginal(false)}
          className="ml-2 text-xs text-blue-500 underline"
        >
          Tampilkan versi mudah
        </button>
      </span>
    );
  }

  if (bullets && bullets.length > 0) {
    const joined = bullets.join(". ");
    return (
      <span className="block bg-blue-50 border-l-4 border-blue-400 pl-3 py-2 rounded-r-lg">
        <ul className="list-disc list-inside space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-gray-800">{b}</li>
          ))}
        </ul>
        <TTSPlayer text={joined} autoPlay />
        <button
          onClick={() => setShowOriginal(true)}
          className="mt-1 text-xs text-gray-400 underline"
        >
          Lihat teks asli
        </button>
      </span>
    );
  }

  if (simplified) {
    return (
      <span className="bg-green-50 border-l-4 border-green-400 pl-2 py-1 rounded-r">
        {simplified}
        <TTSPlayer text={simplified} autoPlay />
        <button
          onClick={() => setShowOriginal(true)}
          className="ml-2 text-xs text-gray-400 underline"
        >
          Lihat teks asli
        </button>
      </span>
    );
  }

  return <span>{original}</span>;
}

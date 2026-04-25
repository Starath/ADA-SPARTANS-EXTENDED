"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  word: string;
  anchorRect: DOMRect;
  onDismiss: () => void;
}

export function WordPopup({ word, anchorRect, onDismiss }: Props) {
  const [definition, setDefinition] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "word_definition", payload: { word } }),
    })
      .then((r) => r.json())
      .then((d: { definition: string }) => setDefinition(d.definition))
      .catch(() => setDefinition("Maaf, tidak bisa memuat definisi."));

    // Auto-dismiss after 6s
    timer.current = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer.current);
  }, [word, onDismiss]);

  const top = anchorRect.bottom + 8;
  const left = anchorRect.left;

  return (
    <div
      style={{ position: "fixed", top, left, zIndex: 9999, maxWidth: 280 }}
      className="bg-yellow-50 border border-yellow-300 rounded-xl shadow-lg p-3"
    >
      <div className="flex justify-between items-start gap-2">
        <strong className="text-sm text-yellow-800">{word}</strong>
        <button onClick={onDismiss} className="text-yellow-500 hover:text-yellow-700 text-xs">✕</button>
      </div>
      {definition ? (
        <p className="text-sm text-gray-700 mt-1">{definition}</p>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Memuat...</p>
      )}
    </div>
  );
}

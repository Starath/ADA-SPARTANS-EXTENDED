"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  word: string;
  anchorRect: DOMRect;
  onDismiss: () => void;
}

export function WordPopup({ word, anchorRect, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDefinition(null);

    fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "word_definition", payload: { word } }),
    })
      .then((r) => r.json())
      .then((d: { definition: string }) => setDefinition(d.definition))
      .catch(() => setDefinition("Maaf, tidak bisa memuat definisi."));

    timer.current = setTimeout(onDismiss, 5000);

    return () => clearTimeout(timer.current);
  }, [word, onDismiss]);

  if (!mounted) return null;

  const top = anchorRect.bottom + 8;
  const left = Math.min(anchorRect.left, window.innerWidth - 300);

  return createPortal(
    <div
      style={{
        position: "fixed",
        top,
        left: Math.max(8, left),
        zIndex: 9999,
        maxWidth: 280,
      }}
      className="bg-yellow-50 border border-yellow-300 rounded-xl shadow-lg p-3"
    >
      <div className="flex justify-between items-start gap-2">
        <strong className="text-sm text-yellow-800">{word}</strong>
        <button
          onClick={onDismiss}
          className="text-yellow-500 hover:text-yellow-700 text-xs"
          type="button"
        >
          ✕
        </button>
      </div>

      {definition ? (
        <p className="text-sm text-gray-700 mt-1">{definition}</p>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-300 border-t-yellow-700" />
          Memuat penjelasan...
        </div>
      )}
    </div>,
    document.body
  );
}
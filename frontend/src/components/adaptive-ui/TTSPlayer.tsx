"use client";

import { useCallback, useEffect, useState } from "react";
import { speak, stop } from "@/lib/tts/speechSynthesis";

interface Props {
  text: string;
  autoPlay?: boolean;
}

export function TTSPlayer({ text, autoPlay = true }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const play = useCallback(async () => {
    setSpeaking(true);

    try {
      await speak(text);
    } finally {
      setSpeaking(false);
    }
  }, [text]);

  const handleStop = () => {
    stop();
    setSpeaking(false);
  };

  useEffect(() => {
    if (autoPlay) void play();

    return () => stop();
  }, [autoPlay, play]);

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={speaking ? handleStop : () => void play()}
        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
        type="button"
      >
        {speaking ? "⏸ Berhenti" : "▶ Dengarkan"}
      </button>

      {speaking && (
        <span className="flex items-end gap-0.5" aria-label="Sedang membaca">
          <span className="h-2 w-1 animate-pulse rounded bg-blue-500" />
          <span className="h-3 w-1 animate-pulse rounded bg-blue-500" />
          <span className="h-2 w-1 animate-pulse rounded bg-blue-500" />
        </span>
      )}
    </div>
  );
}
"use client";
import { useEffect, useRef, useState } from "react";
import { speak, stop } from "@/lib/tts/speechSynthesis";

interface Props {
  text: string;
  autoPlay?: boolean;
}

export function TTSPlayer({ text, autoPlay = true }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const play = async () => {
    setSpeaking(true);
    try {
      await speak(text);
    } finally {
      setSpeaking(false);
    }
  };

  useEffect(() => {
    if (autoPlay) play();
    return () => stop();
  }, [text]);

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={speaking ? stop : play}
        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
      >
        {speaking ? "⏸ Berhenti" : "▶ Dengarkan"}
      </button>
      {speaking && (
        <span className="text-xs text-blue-500 animate-pulse">Membaca...</span>
      )}
    </div>
  );
}

"use client";
import { useState, useCallback } from "react";
import { useWebGazer } from "./WebGazerProvider";

type CalibrationState = "idle" | "calibrating" | "validating" | "done" | "retry";

const CALIBRATION_POINTS = [
  { x: "10%", y: "10%" }, { x: "50%", y: "10%" }, { x: "90%", y: "10%" },
  { x: "10%", y: "50%" }, { x: "50%", y: "50%" }, { x: "90%", y: "50%" },
  { x: "10%", y: "90%" }, { x: "50%", y: "90%" }, { x: "90%", y: "90%" },
];

const CLICKS_PER_POINT = 5;

interface Props {
  onComplete: () => void;
}

export function CalibrationScreen({ onComplete }: Props) {
  const { isReady } = useWebGazer();
  const [phase, setPhase] = useState<CalibrationState>("idle");
  const [currentPoint, setCurrentPoint] = useState(0);
  const [clicksOnPoint, setClicksOnPoint] = useState(0);

  const handlePointClick = useCallback(() => {
    const nextClicks = clicksOnPoint + 1;

    if (nextClicks >= CLICKS_PER_POINT) {
      const nextPoint = currentPoint + 1;
      if (nextPoint >= CALIBRATION_POINTS.length) {
        setPhase("validating");
      } else {
        setCurrentPoint(nextPoint);
        setClicksOnPoint(0);
      }
    } else {
      setClicksOnPoint(nextClicks);
    }
  }, [clicksOnPoint, currentPoint]);

  const handleValidationClick = useCallback(() => {
    // In real impl, compare prediction vs click position, compute error
    // For now, accept calibration
    onComplete();
    setPhase("done");
  }, [onComplete]);

  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <p className="text-white text-lg">Memuat WebGazer...</p>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 gap-6">
        <h2 className="text-white text-2xl font-bold">Kalibrasi Pelacak Mata</h2>
        <p className="text-gray-300 text-center max-w-md">
          Klik setiap titik yang muncul sebanyak 5 kali. Pastikan wajah Anda
          terlihat jelas oleh kamera.
        </p>
        <button
          onClick={() => setPhase("calibrating")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg"
        >
          Mulai Kalibrasi
        </button>
      </div>
    );
  }

  if (phase === "calibrating") {
    const point = CALIBRATION_POINTS[currentPoint];
    return (
      <div className="fixed inset-0 bg-black/90 z-50">
        <p className="text-white text-center pt-8 text-sm opacity-60">
          Titik {currentPoint + 1} dari {CALIBRATION_POINTS.length} — klik {CLICKS_PER_POINT - clicksOnPoint} kali lagi
        </p>
        <button
          onClick={handlePointClick}
          style={{ position: "absolute", left: point.x, top: point.y, transform: "translate(-50%,-50%)" }}
          className="w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-transform active:scale-90 flex items-center justify-center"
        >
          <span className="text-black font-bold">{clicksOnPoint}</span>
        </button>
      </div>
    );
  }

  if (phase === "validating") {
    return (
      <div className="fixed inset-0 bg-black/90 z-50">
        <p className="text-white text-center pt-8">
          Validasi: klik titik hijau ini
        </p>
        <button
          onClick={handleValidationClick}
          style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)" }}
          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-400"
        />
      </div>
    );
  }

  return null;
}

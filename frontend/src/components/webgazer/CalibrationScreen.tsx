"use client";

import { useEffect, useMemo, useState } from "react";
import { useWebGazer } from "./WebGazerProvider";

type CalibrationState =
  | "idle"
  | "webcam_check"
  | "calibrating"
  | "validating"
  | "done"
  | "retry";

interface CalibrationScreenProps {
  onComplete?: () => void;
}

const REQUIRED_CLICKS = 5;
const PASS_DISTANCE_PX = 100;

const CALIBRATION_POINTS = [
  { x: 10, y: 10 },
  { x: 50, y: 10 },
  { x: 90, y: 10 },
  { x: 10, y: 50 },
  { x: 50, y: 50 },
  { x: 90, y: 50 },
  { x: 10, y: 90 },
  { x: 50, y: 90 },
  { x: 50, y: 90 },
  { x: 90, y: 90 },
];

export function CalibrationScreen({ onComplete }: CalibrationScreenProps) {
  const { isReady, latestGaze, setCalibrated } = useWebGazer();

  const [state, setState] = useState<CalibrationState>("idle");
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [clickCounts, setClickCounts] = useState<number[]>(
    () => Array(CALIBRATION_POINTS.length).fill(0) as number[]
  );
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const validationPoint = useMemo(() => {
    const index = Math.floor(Math.random() * CALIBRATION_POINTS.length);
    return CALIBRATION_POINTS[index];
  }, []);

  const activePoint = CALIBRATION_POINTS[activePointIndex];
  const activeClicks = clickCounts[activePointIndex] ?? 0;

  useEffect(() => {
    if (state === "webcam_check" && isReady) {
      setState("calibrating");
    }
  }, [state, isReady]);

  function resetCalibration() {
    window.webgazer?.clearData?.();
    setActivePointIndex(0);
    setClickCounts(Array(CALIBRATION_POINTS.length).fill(0) as number[]);
    setAccuracy(null);
    setState("calibrating");
  }

  function recordCalibrationClick() {
    if (!activePoint) return;

    const screenX = (window.innerWidth * activePoint.x) / 100;
    const screenY = (window.innerHeight * activePoint.y) / 100;

    window.webgazer?.recordScreenPosition?.(screenX, screenY, "click");

    setClickCounts((previous) => {
      const next = [...previous];
      const nextCount = Math.min((next[activePointIndex] ?? 0) + 1, REQUIRED_CLICKS);
      next[activePointIndex] = nextCount;

      if (nextCount >= REQUIRED_CLICKS) {
        if (activePointIndex + 1 >= CALIBRATION_POINTS.length) {
          setState("validating");
        } else {
          setActivePointIndex((index) => index + 1);
        }
      }

      return next;
    });
  }

  function validateCalibration() {
    if (!latestGaze) {
      setAccuracy(0);
      setState("retry");
      return;
    }

    const targetX = (window.innerWidth * validationPoint.x) / 100;
    const targetY = (window.innerHeight * validationPoint.y) / 100;
    const distance = Math.hypot(latestGaze.x - targetX, latestGaze.y - targetY);
    const nextAccuracy = Math.max(
      0,
      Math.min(100, Math.round(100 - (distance / PASS_DISTANCE_PX) * 100))
    );

    setAccuracy(nextAccuracy);
    setState(distance <= PASS_DISTANCE_PX ? "done" : "retry");
  }

  function finishCalibration() {
    setCalibrated(true);
    onComplete?.();
  }

  if (state === "idle") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-lg">
          <h2 className="text-xl font-semibold">Kalibrasi Mata</h2>
          <p className="mt-2 text-sm text-gray-600">
            Klik setiap titik sebanyak 5 kali agar sistem dapat membaca arah
            pandangan dengan lebih akurat.
          </p>
          <button
            type="button"
            onClick={() => setState("webcam_check")}
            className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Mulai Kalibrasi
          </button>
        </div>
      </div>
    );
  }

  if (state === "webcam_check") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-lg">
          <h2 className="text-xl font-semibold">Memeriksa Kamera</h2>
          <p className="mt-2 text-sm text-gray-600">
            Izinkan akses kamera agar WebGazer dapat membaca arah pandangan.
          </p>
        </div>
      </div>
    );
  }

  if (state === "validating") {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-lg border bg-white px-4 py-3 text-center shadow">
          <p className="text-sm font-medium">Validasi Akurasi</p>
          <p className="text-xs text-gray-600">
            Lihat titik merah, lalu klik tombol validasi.
          </p>
          <button
            type="button"
            onClick={validateCalibration}
            className="mt-3 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white"
          >
            Validasi Pandangan
          </button>
        </div>

        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600"
          style={{
            left: `${validationPoint.x}%`,
            top: `${validationPoint.y}%`,
          }}
        />
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-lg">
          <h2 className="text-xl font-semibold">Kalibrasi Berhasil</h2>
          <p className="mt-2 text-sm text-gray-600">
            Akurasi: {accuracy ?? 0}% — Cukup baik!
          </p>
          <button
            type="button"
            onClick={finishCalibration}
            className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Lanjut Membaca
          </button>
        </div>
      </div>
    );
  }

  if (state === "retry") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-lg">
          <h2 className="text-xl font-semibold">Kalibrasi Belum Akurat</h2>
          <p className="mt-2 text-sm text-gray-600">
            Akurasi: {accuracy ?? 0}% — Coba lagi.
          </p>
          <button
            type="button"
            onClick={resetCalibration}
            className="mt-5 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Ulangi Kalibrasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-lg border bg-white px-4 py-3 text-center shadow">
        <p className="text-sm font-medium">
          Titik {activePointIndex + 1}/{CALIBRATION_POINTS.length}
        </p>
        <p className="text-xs text-gray-600">
          Klik: {activeClicks}/{REQUIRED_CLICKS}
        </p>
      </div>

      <button
        type="button"
        onClick={recordCalibrationClick}
        className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 text-xs font-bold text-white"
        style={{
          left: `${activePoint.x}%`,
          top: `${activePoint.y}%`,
        }}
        aria-label={`Calibration point ${activePointIndex + 1}`}
      >
        {activeClicks}
      </button>
    </div>
  );
}
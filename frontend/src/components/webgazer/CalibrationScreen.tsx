"use client";

import { useEffect, useRef, useState } from "react";
import { useWebGazer } from "./WebGazerProvider";

type CalibrationState = "idle" | "webcam_check" | "calibrating" | "done";

interface CalibrationScreenProps {
  onComplete?: () => void;
}

const REQUIRED_CLICKS = 5;
// 80 px click-tolerance radius — clicking anywhere near a dot counts
const CLICK_TOLERANCE_PX = 80;

// 15%/85% instead of 10%/90% so the 120×90 webcam at bottom-right:16px
// never overlaps the corner dots (verified for screens ≥ 1280×720).
const CALIBRATION_POINTS = [
  { x: 15, y: 15 },
  { x: 50, y: 15 },
  { x: 85, y: 15 },
  { x: 15, y: 50 },
  { x: 50, y: 50 },
  { x: 85, y: 50 },
  { x: 15, y: 85 },
  { x: 50, y: 85 },
  { x: 85, y: 85 },
];

export function CalibrationScreen({ onComplete }: CalibrationScreenProps) {
  const { isReady, setCalibrated } = useWebGazer();

  const [state, setState] = useState<CalibrationState>("idle");
  const [activePointIndex, setActivePointIndex] = useState(0);
  const [clickCounts, setClickCounts] = useState<number[]>(
    () => Array(CALIBRATION_POINTS.length).fill(0) as number[]
  );

  // Blocks new clicks for 400 ms when advancing to prevent click-through
  // (last click on finished dot triggering the newly-rendered next dot).
  const advancingRef = useRef(false);

  // Shrink webcam to 120×90 during calibration — small enough not to cover
  // the 85% corner dots, but still visible for face-position feedback.
  useEffect(() => {
    const id = "cal-cam-shrink";
    document.getElementById(id)?.remove();

    if (state === "calibrating") {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = `
        #webgazerVideoContainer {
          width: 120px !important; height: 90px !important;
        }
        #webgazerVideoFeed, #webgazerVideoCanvas, #webgazerFaceOverlay {
          width: 120px !important; height: 90px !important;
        }
      `;
      document.head.appendChild(s);
    }

    return () => { document.getElementById(id)?.remove(); };
  }, [state]);

  useEffect(() => {
    if (state === "webcam_check" && isReady) setState("calibrating");
  }, [state, isReady]);

  function doClick() {
    const point = CALIBRATION_POINTS[activePointIndex];
    if (!point || advancingRef.current) return;

    window.webgazer?.recordScreenPosition?.(
      (window.innerWidth * point.x) / 100,
      (window.innerHeight * point.y) / 100,
      "click"
    );

    const nextCount = Math.min((clickCounts[activePointIndex] ?? 0) + 1, REQUIRED_CLICKS);
    const next = [...clickCounts];
    next[activePointIndex] = nextCount;
    setClickCounts(next);

    if (nextCount >= REQUIRED_CLICKS) {
      advancingRef.current = true;
      const nextIndex = activePointIndex + 1;
      setTimeout(() => {
        advancingRef.current = false;
        if (nextIndex >= CALIBRATION_POINTS.length) {
          setState("done");
        } else {
          setActivePointIndex(nextIndex);
        }
      }, 400);
    }
  }

  // Proximity detection — clicking anywhere within CLICK_TOLERANCE_PX of the
  // active dot counts, not just the exact button pixels.
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (advancingRef.current) return;
    const point = CALIBRATION_POINTS[activePointIndex];
    if (!point) return;
    const dotX = (window.innerWidth * point.x) / 100;
    const dotY = (window.innerHeight * point.y) / 100;
    if (Math.hypot(e.clientX - dotX, e.clientY - dotY) <= CLICK_TOLERANCE_PX) {
      doClick();
    }
  }

  function resetCalibration() {
    window.webgazer?.clearData?.();
    setActivePointIndex(0);
    setClickCounts(Array(CALIBRATION_POINTS.length).fill(0) as number[]);
    setState("calibrating");
  }

  const card = "max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg";
  const btn  = "mt-6 rounded-full bg-[#5AC8C8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4ab8b8] transition-colors";

  if (state === "idle") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0fafa]">
        <div className={card}>
          <div className="mb-4 text-4xl">👁</div>
          <h2 className="text-xl font-bold text-slate-800">Kalibrasi Mata</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Tatap setiap titik berkedip lalu klik (atau klik di dekatnya) sebanyak{" "}
            <strong>5 kali</strong>. Pastikan wajah terlihat jelas di kamera kanan bawah.
          </p>
          <button type="button" onClick={() => setState("webcam_check")} className={btn}>
            Mulai Kalibrasi
          </button>
        </div>
      </div>
    );
  }

  if (state === "webcam_check") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0fafa]">
        <div className={card}>
          <div className="mb-4 text-4xl">📷</div>
          <h2 className="text-xl font-bold text-slate-800">Mengaktifkan Kamera</h2>
          <p className="mt-2 text-sm text-slate-500">
            Izinkan akses kamera di browser agar sistem dapat membaca arah pandangan.
          </p>
          <div className="mt-6 flex justify-center">
            <svg className="h-6 w-6 animate-spin text-[#5AC8C8]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0fafa]">
        <div className={card}>
          <div className="mb-4 text-4xl">✅</div>
          <h2 className="text-xl font-bold text-slate-800">Kalibrasi Selesai!</h2>
          <p className="mt-2 text-sm text-slate-500">
            Semua 9 titik telah dikalibrasi. Sistem siap membaca arah pandangan.
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button type="button" onClick={resetCalibration}
              className="rounded-full border border-[#5AC8C8] px-5 py-2.5 text-sm font-semibold text-[#5AC8C8] hover:bg-[#5AC8C8]/10 transition-colors">
              Kalibrasi Ulang
            </button>
            <button type="button" onClick={() => { setCalibrated(true); onComplete?.(); }}
              className="rounded-full bg-[#5AC8C8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4ab8b8] transition-colors">
              Mulai Membaca →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Calibrating state ────────────────────────────────────────────────────
  const activeClicks = clickCounts[activePointIndex] ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm cursor-crosshair"
      onClick={handleOverlayClick}
    >
      {/* Compact progress bar — top edge, max 55px tall, clears 15% dots on all screens */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100002] flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          Titik {activePointIndex + 1}/{CALIBRATION_POINTS.length}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: REQUIRED_CLICKS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < activeClicks ? "bg-[#5AC8C8]" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          klik {REQUIRED_CLICKS - activeClicks}x lagi
        </span>
      </div>

      {/* All calibration dots */}
      {CALIBRATION_POINTS.map((point, index) => {
        const isDone   = index < activePointIndex;
        const isActive = index === activePointIndex;

        if (isDone) {
          return (
            <div
              key={index}
              className="pointer-events-none absolute z-[100001] -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-green-400 shadow-md"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          );
        }

        if (isActive) {
          return (
            <div
              key={index}
              className="pointer-events-none absolute z-[100001] -translate-x-1/2 -translate-y-1/2 h-16 w-16"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              {/* Outer pulse ring */}
              <span className="absolute inset-0 rounded-full bg-[#5AC8C8] animate-ping opacity-50" />
              {/* Tolerance ring — shows the clickable area */}
              <span
                className="absolute rounded-full border-2 border-white/20"
                style={{
                  width: CLICK_TOLERANCE_PX * 2,
                  height: CLICK_TOLERANCE_PX * 2,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* Main dot */}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#5AC8C8] text-white text-base font-bold shadow-2xl ring-4 ring-white/70">
                {REQUIRED_CLICKS - activeClicks}
              </span>
            </div>
          );
        }

        // Upcoming dots — solid white, clearly visible
        return (
          <div
            key={index}
            className="pointer-events-none absolute z-[100000] -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/70 border-2 border-white shadow"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          />
        );
      })}
    </div>
  );
}

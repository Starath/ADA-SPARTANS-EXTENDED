"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GazePoint } from "@/types";

interface WebGazerData {
  x: number;
  y: number;
}

interface WebGazerApi {
  begin: () => Promise<void> | WebGazerApi;
  setGazeListener: (
    listener: (data: WebGazerData | null, elapsedTime?: number) => void
  ) => WebGazerApi;
  saveDataAcrossSessions: (value: boolean) => WebGazerApi;
  showVideoPreview: (value: boolean) => WebGazerApi;
  showPredictionPoints: (value: boolean) => WebGazerApi;
  recordScreenPosition?: (x: number, y: number, eventType: string) => void;
  clearData?: () => void;
}

declare global {
  interface Window {
    webgazer?: WebGazerApi;
  }
}

interface WebGazerContextValue {
  isReady: boolean;
  isCalibrated: boolean;
  setCalibrated: (value: boolean) => void;
  latestGaze: GazePoint | null;
  gazeStream: GazePoint[];
}

const WebGazerContext = createContext<WebGazerContextValue | null>(null);

const GAZE_HISTORY_MS = 2000;

let webgazerLoadPromise: Promise<WebGazerApi> | null = null;

function loadWebGazer(): Promise<WebGazerApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("WebGazer can only run in the browser."));
  }

  if (window.webgazer) {
    return Promise.resolve(window.webgazer);
  }

  if (webgazerLoadPromise) {
    return webgazerLoadPromise;
  }

  // Load the pre-built dist via <script> tag to bypass webpack's module bundling.
  // Webgazer bundles two incompatible TF.js versions internally (facemesh needs
  // v1.7.4, tfjs needs v3.x). Importing via webpack creates two separate
  // @tensorflow/tfjs-core instances → "forwardFunc is not a function" at runtime.
  // Loading as a plain script tag makes the browser execute it outside webpack's
  // module graph: the IIFE sets window.webgazer directly.
  // The dist file is copied to public/webgazer.js by the predev/prebuild script.
  webgazerLoadPromise = new Promise<WebGazerApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/webgazer.js";
    script.async = true;
    script.onload = () => {
      if (window.webgazer) {
        resolve(window.webgazer);
      } else {
        reject(new Error("window.webgazer not set after script load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load /webgazer.js"));
    document.head.appendChild(script);
  });

  return webgazerLoadPromise;
}

// Smoothing factor for exponential moving average — lower = smoother but more lag.
// 0.2 removes most jitter while staying responsive enough for reading detection.
const EMA_ALPHA = 0.3;

export function WebGazerProvider({ children }: { children: ReactNode }) {
  const [isReady, setReady] = useState(false);
  const [isCalibrated, setCalibrated] = useState(false);
  const [latestGaze, setLatestGaze] = useState<GazePoint | null>(null);
  const [gazeStream, setGazeStream] = useState<GazePoint[]>([]);

  // EMA state lives in a ref so it persists between listener calls without
  // causing re-renders or stale-closure issues.
  const emaRef = useRef<{ x: number; y: number; ready: boolean }>({
    x: 0,
    y: 0,
    ready: false,
  });

  useEffect(() => {
    let mounted = true;

    async function initWebGazer() {
      const webgazer = await loadWebGazer();

      if (!mounted) return;

      webgazer
        .saveDataAcrossSessions(true)
        .showVideoPreview(true)
        .showPredictionPoints(false) // hide webgazer's raw jittery dot; we render our own below
        .setGazeListener((data) => {
          if (!mounted || !data) return;

          const ema = emaRef.current;
          if (!ema.ready) {
            ema.x = data.x;
            ema.y = data.y;
            ema.ready = true;
          } else {
            ema.x = EMA_ALPHA * data.x + (1 - EMA_ALPHA) * ema.x;
            ema.y = EMA_ALPHA * data.y + (1 - EMA_ALPHA) * ema.y;
          }

          const point: GazePoint = {
            x: ema.x,
            y: ema.y,
            timestamp: performance.now(),
          };

          setLatestGaze(point);
          setGazeStream((previous) => [
            ...previous.filter(
              (oldPoint) => point.timestamp - oldPoint.timestamp <= GAZE_HISTORY_MS
            ),
            point,
          ]);
        });

      await Promise.resolve(webgazer.begin());

      // Position webgazer's injected video to bottom-right corner.
      // Default is top: 0, left: 0 with no z-index.
      // Gaze dot has z-index: 99999 — our calibration UI uses z-[100001] to stay on top.
      if (!document.getElementById("wg-position-override")) {
        const s = document.createElement("style");
        s.id = "wg-position-override";
        s.textContent = `
          #webgazerVideoContainer {
            top: auto !important; left: auto !important;
            bottom: 16px !important; right: 16px !important;
            width: 320px !important; height: 240px !important;
            border-radius: 12px !important; overflow: hidden !important;
            border: 2px solid rgba(90,200,200,0.7) !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.35) !important;
            z-index: 60 !important;
          }
          #webgazerVideoFeed, #webgazerVideoCanvas, #webgazerFaceOverlay {
            width: 320px !important; height: 240px !important;
          }
          #webgazerFaceFeedbackBox {
            display: none !important;
          }
        `;
        document.head.appendChild(s);
      }

      if (mounted) {
        setReady(true);
      }
    }

    initWebGazer().catch(() => {
      if (mounted) {
        setReady(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<WebGazerContextValue>(
    () => ({
      isReady,
      isCalibrated,
      setCalibrated,
      latestGaze,
      gazeStream,
    }),
    [isReady, isCalibrated, latestGaze, gazeStream]
  );

  return (
    <WebGazerContext.Provider value={value}>
      {children}
      {/* Smooth gaze dot — EMA-smoothed + CSS transition hides residual jitter.
          pointer-events: none so it never blocks clicks. z-index matches webgazer's
          original gazeDot (99999) so it appears on top of page content. */}
      {isReady && latestGaze && (
        <div
          style={{
            position: "fixed",
            left: latestGaze.x,
            top: latestGaze.y,
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.85)",
            pointerEvents: "none",
            zIndex: 99999,
            transition: "left 80ms linear, top 80ms linear",
            boxShadow:
              "0 0 0 2px rgba(255,255,255,0.9), 0 0 8px rgba(239,68,68,0.5)",
          }}
        />
      )}
    </WebGazerContext.Provider>
  );
}

export function useWebGazer() {
  const context = useContext(WebGazerContext);

  if (!context) {
    throw new Error("useWebGazer must be used inside WebGazerProvider.");
  }

  return context;
}
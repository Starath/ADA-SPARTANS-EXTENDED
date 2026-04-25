"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

const WEBGAZER_SRC = "https://webgazer.cs.brown.edu/webgazer.js";
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

  webgazerLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${WEBGAZER_SRC}"]`
    );

    const resolveWhenReady = () => {
      if (window.webgazer) {
        resolve(window.webgazer);
        return;
      }

      reject(new Error("WebGazer script loaded, but window.webgazer is missing."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", resolveWhenReady, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load WebGazer.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WEBGAZER_SRC;
    script.async = true;
    script.onload = resolveWhenReady;
    script.onerror = () => reject(new Error("Failed to load WebGazer."));
    document.body.appendChild(script);
  });

  return webgazerLoadPromise;
}

export function WebGazerProvider({ children }: { children: ReactNode }) {
  const [isReady, setReady] = useState(false);
  const [isCalibrated, setCalibrated] = useState(false);
  const [latestGaze, setLatestGaze] = useState<GazePoint | null>(null);
  const [gazeStream, setGazeStream] = useState<GazePoint[]>([]);

  useEffect(() => {
    let mounted = true;

    async function initWebGazer() {
      const webgazer = await loadWebGazer();

      if (!mounted) return;

      webgazer
        .saveDataAcrossSessions(true)
        .showVideoPreview(false)
        .showPredictionPoints(false)
        .setGazeListener((data) => {
          if (!mounted || !data) return;

          const point: GazePoint = {
            x: data.x,
            y: data.y,
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
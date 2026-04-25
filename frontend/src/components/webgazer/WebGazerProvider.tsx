"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GazePoint } from "@/types";

interface WebGazerContextValue {
  isReady: boolean;
  isCalibrated: boolean;
  setCalibrated: (v: boolean) => void;
  latestGaze: GazePoint | null;
}

type WebGazerData = {
  x: number;
  y: number;
};

type WebGazerApi = {
  setRegression: (regression: string) => WebGazerApi;
  setTracker: (tracker: string) => WebGazerApi;
  saveDataAcrossSessions: (enabled: boolean) => WebGazerApi;
  showVideoPreview: (enabled: boolean) => WebGazerApi;
  showPredictionPoints: (enabled: boolean) => WebGazerApi;
  setGazeListener: (
    listener: (data: WebGazerData | null, timestamp: number) => void
  ) => WebGazerApi;
  begin: () => Promise<void> | void;
  end: () => void;
};

type WindowWithWebGazer = typeof window & {
  webgazer: WebGazerApi;
};

const WebGazerContext = createContext<WebGazerContextValue>({
  isReady: false,
  isCalibrated: false,
  setCalibrated: () => {},
  latestGaze: null,
});

export function useWebGazer() {
  return useContext(WebGazerContext);
}

export function WebGazerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isCalibrated, setCalibrated] = useState(false);
  const [latestGaze, setLatestGaze] = useState<GazePoint | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // webgazer must be loaded client-side; it attaches to window
    const script = document.createElement("script");
    script.src = "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;
    script.onload = () => {
      const wg: WebGazerApi = (window as WindowWithWebGazer).webgazer;
      wg
        .setGazeListener((data: WebGazerData | null, ts: number) => {
          if (data) setLatestGaze({ x: data.x, y: data.y, timestamp: ts });
        })
        .saveDataAcrossSessions(true)
        .showVideoPreview(false)
        .showPredictionPoints(false)
        .begin();
      setIsReady(true);
    };
    document.head.appendChild(script);

    return () => {
      try {
        (window as typeof window & { webgazer?: { end?: () => void } }).webgazer?.end?.();
      } catch {}
    };
  }, []);

  return (
    <WebGazerContext.Provider value={{ isReady, isCalibrated, setCalibrated, latestGaze }}>
      {children}
    </WebGazerContext.Provider>
  );
}

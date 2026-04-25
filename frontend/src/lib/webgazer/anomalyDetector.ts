import type { GazePoint, GazeEvent } from "@/types";
import {
  FixationDetector,
  RegressionDetector,
  RereadTracker,
} from "./gazeAnalyzer";

type AnomalyListener = (event: GazeEvent) => void;

const DEBOUNCE_MS = 3000;

export class AnomalyDetector {
  private fixation = new FixationDetector();
  private regression = new RegressionDetector();
  private reread = new RereadTracker();
  private listeners: AnomalyListener[] = [];
  private lastEmitted = new Map<string, number>(); // `${type}:${blockId}` → timestamp

  onAnomaly(listener: AnomalyListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  processGazePoint(point: GazePoint, elementAtGaze: Element | null) {
    const blockId = elementAtGaze?.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;
    const wordId = elementAtGaze?.closest("[data-word-id]")?.getAttribute("data-word-id") ?? null;

    // Fixation detection
    const fixResult = this.fixation.addPoint(point);
    if (fixResult.isFixation && wordId && blockId) {
      this.emit({
        type: "fixation",
        blockId,
        wordId,
        duration: fixResult.durationMs,
        timestamp: point.timestamp,
      });
    }

    // Regression detection
    const regEvent = this.regression.addPoint(point, blockId);
    if (regEvent) {
      this.emit(regEvent);
    }

    // Reread tracking
    if (blockId) {
      const rereadEvent = this.reread.recordVisit(blockId, point.timestamp);
      if (rereadEvent) {
        this.emit(rereadEvent);
      }
    }
  }

  getTotalRegressions() {
    return this.regression.getTotalRegressions();
  }

  reset() {
    this.fixation.reset();
    this.regression.reset();
    this.reread.reset();
    this.lastEmitted.clear();
  }

  private emit(event: GazeEvent) {
    const key = `${event.type}:${event.blockId}`;
    const last = this.lastEmitted.get(key) ?? 0;
    if (event.timestamp - last < DEBOUNCE_MS) return; // Apply debounce
    this.lastEmitted.set(key, event.timestamp);
    this.listeners.forEach((l) => l(event));
  }
}

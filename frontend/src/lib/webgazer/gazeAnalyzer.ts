import type { GazePoint, GazeEvent } from "@/types";

const FIXATION_RADIUS_PX = 40;
const FIXATION_MIN_DURATION_MS = 1500;
const REGRESSION_THRESHOLD_PX = 120;
const REREAD_MIN_VISITS = 3;
const BUFFER_SIZE = 50;

export class FixationDetector {
  private buffer: GazePoint[] = [];

  addPoint(point: GazePoint): { isFixation: boolean; durationMs: number } {
    this.buffer.push(point);
    if (this.buffer.length > BUFFER_SIZE) this.buffer.shift();
    if (this.buffer.length < 5) return { isFixation: false, durationMs: 0 };

    const xs = this.buffer.map((p) => p.x);
    const ys = this.buffer.map((p) => p.y);
    const stdX = standardDeviation(xs);
    const stdY = standardDeviation(ys);

    if (stdX < FIXATION_RADIUS_PX && stdY < FIXATION_RADIUS_PX) {
      const durationMs =
        this.buffer[this.buffer.length - 1].timestamp - this.buffer[0].timestamp;
      return { isFixation: durationMs >= FIXATION_MIN_DURATION_MS, durationMs };
    }
    return { isFixation: false, durationMs: 0 };
  }

  reset() {
    this.buffer = [];
  }
}

export class RegressionDetector {
  private maxXPerLine = new Map<number, number>(); // y-bucket → max x seen
  private regressionCount = new Map<string, number>(); // blockId → count

  private yBucket(y: number) {
    return Math.floor(y / 30) * 30;
  }

  addPoint(point: GazePoint, blockId: string | null): GazeEvent | null {
    const bucket = this.yBucket(point.y);
    const prevMax = this.maxXPerLine.get(bucket) ?? point.x;

    if (point.x > prevMax) {
      this.maxXPerLine.set(bucket, point.x);
      return null;
    }

    if (prevMax - point.x >= REGRESSION_THRESHOLD_PX && blockId) {
      const count = (this.regressionCount.get(blockId) ?? 0) + 1;
      this.regressionCount.set(blockId, count);
      return {
        type: "regression",
        blockId,
        count,
        timestamp: point.timestamp,
      };
    }
    return null;
  }

  getTotalRegressions(): number {
    let total = 0;
    for (const v of this.regressionCount.values()) total += v;
    return total;
  }

  reset() {
    this.maxXPerLine.clear();
    this.regressionCount.clear();
  }
}

export class RereadTracker {
  private visits = new Map<string, number[]>(); // blockId → timestamps

  recordVisit(blockId: string, timestamp: number): GazeEvent | null {
    const visits = this.visits.get(blockId) ?? [];

    // Only count a new visit if gaze left and came back (gap > 2s)
    const lastVisit = visits[visits.length - 1];
    if (lastVisit && timestamp - lastVisit < 2000) {
      visits[visits.length - 1] = timestamp;
      this.visits.set(blockId, visits);
      return null;
    }

    visits.push(timestamp);
    this.visits.set(blockId, visits);

    if (visits.length >= REREAD_MIN_VISITS) {
      return {
        type: "reread",
        blockId,
        count: visits.length,
        timestamp,
      };
    }
    return null;
  }

  reset() {
    this.visits.clear();
  }
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

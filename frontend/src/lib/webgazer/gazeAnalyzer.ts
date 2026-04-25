import type { GazeEvent, GazePoint } from "@/types";

export const FIXATION_RADIUS_PX = 40;
export const FIXATION_MIN_DURATION_MS = 1500;
export const REGRESSION_THRESHOLD_PX = 120;
export const REREAD_MIN_VISITS = 3;
export const GAZE_BUFFER_SIZE = 50;

export interface FixationResult {
  isFixation: boolean;
  durationMs: number;
  centroid?: { x: number; y: number };
}

export class FixationDetector {
  private buffer: GazePoint[] = [];

  addPoint(point: GazePoint): FixationResult {
    this.buffer.push(point);

    if (this.buffer.length > GAZE_BUFFER_SIZE) {
      this.buffer.shift();
    }

    if (this.buffer.length < 2) {
      return { isFixation: false, durationMs: 0 };
    }

    const durationMs =
      this.buffer[this.buffer.length - 1].timestamp - this.buffer[0].timestamp;

    if (durationMs < FIXATION_MIN_DURATION_MS) {
      return { isFixation: false, durationMs };
    }

    const centroid = meanPoint(this.buffer);
    const maxDistanceFromCentroid = Math.max(
      ...this.buffer.map((p) => distance(p, centroid))
    );

    return {
      isFixation: maxDistanceFromCentroid <= FIXATION_RADIUS_PX,
      durationMs,
      centroid,
    };
  }

  reset(): void {
    this.buffer = [];
  }
}

export class RegressionDetector {
  private maxXPerLine = new Map<number, number>();
  private regressionCount = new Map<string, number>();

  constructor(private readonly lineHeightPx = 30) {}

  addPoint(point: GazePoint, blockId: string | null): GazeEvent | null {
    const bucket = this.yBucket(point.y);
    const previousMaxX = this.maxXPerLine.get(bucket);

    if (previousMaxX === undefined) {
      this.maxXPerLine.set(bucket, point.x);
      return null;
    }

    if (point.x > previousMaxX) {
      this.maxXPerLine.set(bucket, point.x);
      return null;
    }

    if (blockId && previousMaxX - point.x >= REGRESSION_THRESHOLD_PX) {
      const count = (this.regressionCount.get(blockId) ?? 0) + 1;
      this.regressionCount.set(blockId, count);

      // Reset the line maximum to avoid emitting duplicate regressions for the
      // same backward jump on every following low-x point.
      this.maxXPerLine.set(bucket, point.x);

      return {
        type: "regression",
        blockId,
        count,
        timestamp: point.timestamp,
      };
    }

    return null;
  }

  getRegressionCount(blockId: string): number {
    return this.regressionCount.get(blockId) ?? 0;
  }

  getTotalRegressions(): number {
    return Array.from(this.regressionCount.values()).reduce(
      (sum, count) => sum + count,
      0
    );
  }

  reset(): void {
    this.maxXPerLine.clear();
    this.regressionCount.clear();
  }

  private yBucket(y: number): number {
    return Math.floor(y / this.lineHeightPx) * this.lineHeightPx;
  }
}

export class RereadTracker {
  private visitCounts = new Map<string, number>();
  private currentBlockId: string | null = null;

  recordVisit(blockId: string | null, timestamp: number): GazeEvent | null {
    if (!blockId) {
      this.currentBlockId = null;
      return null;
    }

    // A continuous stream over the same block is still one visit. A new visit
    // starts only after gaze moves to another block or leaves all blocks.
    if (blockId === this.currentBlockId) {
      return null;
    }

    this.currentBlockId = blockId;
    const count = (this.visitCounts.get(blockId) ?? 0) + 1;
    this.visitCounts.set(blockId, count);

    if (count >= REREAD_MIN_VISITS) {
      return {
        type: "reread",
        blockId,
        count,
        timestamp,
      };
    }

    return null;
  }

  getVisitCount(blockId: string): number {
    return this.visitCounts.get(blockId) ?? 0;
  }

  reset(): void {
    this.visitCounts.clear();
    this.currentBlockId = null;
  }
}

function meanPoint(points: GazePoint[]): { x: number; y: number } {
  const totals = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );

  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

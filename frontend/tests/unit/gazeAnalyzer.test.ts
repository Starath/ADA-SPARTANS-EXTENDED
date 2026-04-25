import { describe, it, expect } from "vitest";
import {
  FixationDetector,
  RegressionDetector,
  RereadTracker,
} from "@/lib/webgazer/gazeAnalyzer";
import type { GazePoint } from "@/types";

function makePoint(x: number, y: number, timestamp: number): GazePoint {
  return { x, y, timestamp };
}

describe("FixationDetector", () => {
  it("detects fixation when points cluster within 40px for >1500ms", () => {
    const detector = new FixationDetector();
    const base = Date.now();
    // Add 50 points clustered within 20px radius over 2000ms
    for (let i = 0; i < 50; i++) {
      detector.addPoint(makePoint(100 + (i % 5), 100 + (i % 3), base + i * 40));
    }
    const result = detector.addPoint(makePoint(102, 101, base + 2100));
    expect(result.isFixation).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(1500);
  });

  it("does not detect fixation when points spread >40px", () => {
    const detector = new FixationDetector();
    const base = Date.now();
    for (let i = 0; i < 50; i++) {
      detector.addPoint(makePoint(i * 10, 100, base + i * 30));
    }
    const result = detector.addPoint(makePoint(500, 100, base + 1600));
    expect(result.isFixation).toBe(false);
  });

  it("does not detect fixation when duration <1500ms even if clustered", () => {
    const detector = new FixationDetector();
    const base = Date.now();
    for (let i = 0; i < 20; i++) {
      detector.addPoint(makePoint(100, 100, base + i * 20));
    }
    const result = detector.addPoint(makePoint(101, 100, base + 450));
    expect(result.isFixation).toBe(false);
  });
});

describe("RegressionDetector", () => {
  it("detects regression when x drops by ≥120px after reaching max", () => {
    const detector = new RegressionDetector();
    const base = Date.now();
    // Simulate reading left to right
    for (let i = 0; i < 10; i++) {
      detector.addPoint(makePoint(i * 30, 100, base + i * 100), "block-1");
    }
    // Regression: jump back 150px
    const event = detector.addPoint(makePoint(30, 100, base + 1100), "block-1");
    expect(event).not.toBeNull();
    expect(event!.type).toBe("regression");
    expect(event!.blockId).toBe("block-1");
  });

  it("does not detect regression when x drops by <120px", () => {
    const detector = new RegressionDetector();
    const base = Date.now();
    for (let i = 0; i < 5; i++) {
      detector.addPoint(makePoint(i * 30, 100, base + i * 100), "block-1");
    }
    // Small drop of 50px — not a regression
    const event = detector.addPoint(makePoint(70, 100, base + 600), "block-1");
    expect(event).toBeNull();
  });

  it("increments count per blockId on repeated regressions", () => {
    const detector = new RegressionDetector();
    const base = Date.now();

    // First regression
    for (let i = 0; i < 5; i++)
      detector.addPoint(makePoint(i * 40, 100, base + i * 100), "block-1");
    const e1 = detector.addPoint(makePoint(10, 100, base + 600), "block-1");
    expect(e1!.count).toBe(1);

    // Second regression
    for (let i = 5; i < 10; i++)
      detector.addPoint(makePoint(i * 40, 100, base + i * 100), "block-1");
    const e2 = detector.addPoint(makePoint(20, 100, base + 1200), "block-1");
    expect(e2!.count).toBe(2);
  });
});

describe("RereadTracker", () => {
  it("emits reread event on 3rd distinct visit to same block", () => {
    const tracker = new RereadTracker();
    const base = Date.now();

    tracker.recordVisit("block-1", base);
    tracker.recordVisit("block-1", base + 5000); // 2nd visit
    const event = tracker.recordVisit("block-1", base + 10000); // 3rd visit
    expect(event).not.toBeNull();
    expect(event!.type).toBe("reread");
    expect(event!.count).toBe(3);
  });

  it("does not emit when same visit continues (gap <2s)", () => {
    const tracker = new RereadTracker();
    const base = Date.now();

    tracker.recordVisit("block-1", base);
    tracker.recordVisit("block-1", base + 500);
    const event = tracker.recordVisit("block-1", base + 1000);
    expect(event).toBeNull();
  });

  it("does not emit on 2nd visit", () => {
    const tracker = new RereadTracker();
    const base = Date.now();
    tracker.recordVisit("block-1", base);
    const event = tracker.recordVisit("block-1", base + 5000);
    expect(event).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  FixationDetector,
  RegressionDetector,
  RereadTracker,
} from "@/lib/webgazer/gazeAnalyzer";
import type { GazePoint } from "@/types";

function point(x: number, y: number, timestamp: number): GazePoint {
  return { x, y, timestamp };
}

describe("FixationDetector", () => {
  it("detects fixation when points cluster within 40px for more than 1500ms", () => {
    const detector = new FixationDetector();
    const base = 1_000;

    for (let i = 0; i <= 30; i += 1) {
      detector.addPoint(point(300 + (i % 5), 240 + (i % 4), base + i * 50));
    }

    const result = detector.addPoint(point(302, 241, base + 1_600));

    expect(result.isFixation).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(1500);
  });

  it("does not detect fixation when points move more than 40px", () => {
    const detector = new FixationDetector();
    const base = 1_000;

    for (let i = 0; i <= 30; i += 1) {
      detector.addPoint(point(100 + i * 8, 200, base + i * 50));
    }

    const result = detector.addPoint(point(360, 200, base + 1_600));

    expect(result.isFixation).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(1500);
  });
});

describe("RegressionDetector", () => {
  it("detects regression when x drops by 120px after reaching max", () => {
    const detector = new RegressionDetector();
    const base = 2_000;

    detector.addPoint(point(100, 120, base), "block-1");
    detector.addPoint(point(180, 120, base + 100), "block-1");
    detector.addPoint(point(260, 120, base + 200), "block-1");

    const event = detector.addPoint(point(140, 120, base + 300), "block-1");

    expect(event).toMatchObject({
      type: "regression",
      blockId: "block-1",
      count: 1,
      timestamp: base + 300,
    });
  });

  it("does not detect regression when x drop is below 120px", () => {
    const detector = new RegressionDetector();
    const base = 2_000;

    detector.addPoint(point(100, 120, base), "block-1");
    detector.addPoint(point(260, 120, base + 100), "block-1");

    const event = detector.addPoint(point(141, 120, base + 200), "block-1");

    expect(event).toBeNull();
  });
});

describe("RereadTracker", () => {
  it("counts reread when same blockId is visited 3 times non-consecutively", () => {
    const tracker = new RereadTracker();
    const base = 3_000;

    tracker.recordVisit("block-1", base);
    tracker.recordVisit("block-2", base + 100);
    tracker.recordVisit("block-1", base + 200);
    tracker.recordVisit("block-3", base + 300);

    const event = tracker.recordVisit("block-1", base + 400);

    expect(event).toMatchObject({
      type: "reread",
      blockId: "block-1",
      count: 3,
      timestamp: base + 400,
    });
  });

  it("does not count consecutive samples on the same block as separate visits", () => {
    const tracker = new RereadTracker();
    const base = 3_000;

    tracker.recordVisit("block-1", base);
    tracker.recordVisit("block-1", base + 100);
    const event = tracker.recordVisit("block-1", base + 200);

    expect(event).toBeNull();
    expect(tracker.getVisitCount("block-1")).toBe(1);
  });
});

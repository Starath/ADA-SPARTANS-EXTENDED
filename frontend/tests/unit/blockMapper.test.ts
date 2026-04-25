import { describe, it, expect } from "vitest";
import { bboxToPixelRect, findBlockAtPoint } from "@/lib/pdf/blockMapper";
import type { PDFBlock } from "@/types";

describe("bboxToPixelRect", () => {
  it("maps normalized bbox to correct pixel rect", () => {
    const rect = bboxToPixelRect(
      { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.2 },
      1000,
      800
    );
    expect(rect.left).toBe(100);
    expect(rect.top).toBe(80);
    expect(rect.width).toBeCloseTo(400);
    expect(rect.height).toBeCloseTo(80);
  });

  it("handles full-page block (0 to 1)", () => {
    const rect = bboxToPixelRect({ x0: 0, y0: 0, x1: 1, y1: 1 }, 1000, 800);
    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(800);
  });
});

describe("findBlockAtPoint", () => {
  const blocks: PDFBlock[] = [
    {
      id: "block-1",
      type: "text",
      bbox: { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.2 },
      text: "Hello world",
    },
    {
      id: "block-2",
      type: "text",
      bbox: { x0: 0.1, y0: 0.3, x1: 0.9, y1: 0.4 },
      text: "Another paragraph",
    },
  ];

  it("returns the block containing the gaze point", () => {
    // Point at 200px, 120px on 1000×800 canvas → normalized 0.2, 0.15 → in block-1
    const block = findBlockAtPoint(200, 120, blocks, 1000, 800);
    expect(block?.id).toBe("block-1");
  });

  it("returns null when gaze point is outside all blocks", () => {
    const block = findBlockAtPoint(900, 600, blocks, 1000, 800);
    expect(block).toBeNull();
  });

  it("returns the second block when point is in that range", () => {
    // Point at 500px, 280px on 1000×800 → normalized 0.5, 0.35 → in block-2
    const block = findBlockAtPoint(500, 280, blocks, 1000, 800);
    expect(block?.id).toBe("block-2");
  });
});

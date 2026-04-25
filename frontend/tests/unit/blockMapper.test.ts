import { describe, expect, it } from "vitest";
import {
  bboxToPixelRect,
  findBlockAtPoint,
  findBlockIdAtPoint,
} from "@/lib/pdf/blockMapper";
import type { PDFBlock } from "@/types";

const blocks: PDFBlock[] = [
  {
    id: "block-1",
    type: "text",
    bbox: { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.2 },
    text: "Paragraf pertama",
  },
  {
    id: "block-2",
    type: "text",
    bbox: { x0: 0.6, y0: 0.5, x1: 0.9, y1: 0.7 },
    text: "Paragraf kedua",
  },
];

describe("bboxToPixelRect", () => {
  it("maps relative bbox [0.1, 0.1, 0.5, 0.2] to correct px rect for 1000x800 canvas", () => {
    const rect = bboxToPixelRect(
      { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.2 },
      1000,
      800
    );

    expect(rect.left).toBe(100);
    expect(rect.top).toBe(80);
    expect(rect.width).toBe(400);
    expect(rect.height).toBe(80);
    expect(rect.right).toBe(500);
    expect(rect.bottom).toBe(160);
  });
});

describe("findBlockAtPoint", () => {
  it("returns matching blockId when gaze point is inside a rect", () => {
    const block = findBlockAtPoint(200, 120, blocks, 1000, 800);

    expect(block?.id).toBe("block-1");
  });

  it("returns matching blockId through findBlockIdAtPoint helper", () => {
    const blockId = findBlockIdAtPoint(700, 480, blocks, 1000, 800);

    expect(blockId).toBe("block-2");
  });

  it("returns null when gaze point is outside all rects", () => {
    const block = findBlockAtPoint(950, 760, blocks, 1000, 800);

    expect(block).toBeNull();
  });
});

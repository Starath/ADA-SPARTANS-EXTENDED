import type { BBox, PDFBlock } from "@/types";

export function bboxToPixelRect(
  bbox: BBox,
  canvasWidth: number,
  canvasHeight: number
): DOMRect {
  const x = bbox.x0 * canvasWidth;
  const y = bbox.y0 * canvasHeight;
  const width = (bbox.x1 - bbox.x0) * canvasWidth;
  const height = (bbox.y1 - bbox.y0) * canvasHeight;

  if (typeof DOMRect !== "undefined") {
    return new DOMRect(x, y, width, height);
  }

  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({
      x,
      y,
      width,
      height,
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
    }),
  } as DOMRect;
}

export function findBlockAtPoint(
  x: number,
  y: number,
  blocks: PDFBlock[],
  canvasWidth: number,
  canvasHeight: number
): PDFBlock | null {
  return (
    blocks.find((block) => {
      const rect = bboxToPixelRect(block.bbox, canvasWidth, canvasHeight);

      return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      );
    }) ?? null
  );
}

export function findBlockIdAtPoint(
  x: number,
  y: number,
  blocks: PDFBlock[],
  canvasWidth: number,
  canvasHeight: number
): string | null {
  return findBlockAtPoint(x, y, blocks, canvasWidth, canvasHeight)?.id ?? null;
}

export function tokenizeBlock(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

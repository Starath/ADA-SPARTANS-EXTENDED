import type { PDFBlock, BBox } from "@/types";

export function bboxToPixelRect(
  bbox: BBox,
  canvasWidth: number,
  canvasHeight: number
): DOMRect {
  return new DOMRect(
    bbox.x0 * canvasWidth,
    bbox.y0 * canvasHeight,
    (bbox.x1 - bbox.x0) * canvasWidth,
    (bbox.y1 - bbox.y0) * canvasHeight
  );
}

export function findBlockAtPoint(
  x: number,
  y: number,
  blocks: PDFBlock[],
  canvasWidth: number,
  canvasHeight: number
): PDFBlock | null {
  for (const block of blocks) {
    const rect = bboxToPixelRect(block.bbox, canvasWidth, canvasHeight);
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return block;
    }
  }
  return null;
}

export function tokenizeBlock(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

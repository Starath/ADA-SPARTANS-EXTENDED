"use client";

import { useEffect, useRef } from "react";
import type { HandwritingDetection } from "@/types";

const CLS_COLORS = ["#22c55e", "#ef4444", "#f59e0b"] as const; // Normal, Reversal, Corrected
const CLS_LABELS = ["Normal", "Reversal", "Corrected"] as const;

interface Props {
  imageUrl: string;
  detections: HandwritingDetection[];
  annotatedB64?: string; // base64 PNG from backend — shown directly if present
  maxHeight?: number;
}

export function DetectionCanvas({ imageUrl, detections, annotatedB64, maxHeight = 400 }: Props) {
  // If backend already drew the boxes, just show that image
  if (annotatedB64) {
    return (
      <img
        src={`data:image/png;base64,${annotatedB64}`}
        alt="Annotated detection"
        className="rounded-xl w-full border border-gray-100 bg-gray-50"
        style={{ maxHeight, objectFit: "contain" }}
      />
    );
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const maxW = canvas.parentElement?.clientWidth ?? 640;
      const scaleW = Math.min(1, maxW / img.naturalWidth);
      const scaleH = Math.min(1, maxHeight / img.naturalHeight);
      const scale = Math.min(scaleW, scaleH);

      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const det of detections) {
        const [x0, y0, x1, y1] = det.bbox;
        const bx = x0 * scale;
        const by = y0 * scale;
        const bw = (x1 - x0) * scale;
        const bh = (y1 - y0) * scale;
        const color = CLS_COLORS[det.cls] ?? "#6366f1";
        const clsLabel = CLS_LABELS[det.cls] ?? det.label;

        // Box border
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.strokeRect(bx, by, bw, bh);

        // Label: char + class + confidence
        const charPart = det.char ? `${det.char.toUpperCase()} · ` : "";
        const labelText = `${charPart}${clsLabel} ${Math.round(det.conf * 100)}%`;

        const fontSize = Math.max(9, Math.min(13, 12 * scale));
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        const textMetrics = ctx.measureText(labelText);
        const padX = 4;
        const padY = 3;
        const tagW = textMetrics.width + padX * 2;
        const tagH = fontSize + padY * 2;

        // Tag background — sits above box, clamp to canvas top
        const tagY = by >= tagH ? by - tagH : by + bh;

        ctx.fillStyle = color;
        // Rounded pill effect via path
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(bx + r, tagY);
        ctx.lineTo(bx + tagW - r, tagY);
        ctx.quadraticCurveTo(bx + tagW, tagY, bx + tagW, tagY + r);
        ctx.lineTo(bx + tagW, tagY + tagH - r);
        ctx.quadraticCurveTo(bx + tagW, tagY + tagH, bx + tagW - r, tagY + tagH);
        ctx.lineTo(bx + r, tagY + tagH);
        ctx.quadraticCurveTo(bx, tagY + tagH, bx, tagY + tagH - r);
        ctx.lineTo(bx, tagY + r);
        ctx.quadraticCurveTo(bx, tagY, bx + r, tagY);
        ctx.closePath();
        ctx.fill();

        // Tag text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, bx + padX, tagY + padY + fontSize - 2);
      }
    };
  }, [imageUrl, detections, maxHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl w-full border border-gray-100 bg-gray-50"
    />
  );
}

export function DetectionLegend({ detections }: { detections: HandwritingDetection[] }) {
  const counts = [0, 0, 0];
  for (const d of detections) {
    if (d.cls >= 0 && d.cls <= 2) counts[d.cls]++;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {CLS_LABELS.map((label, i) => (
        <div key={label} className="rounded-xl border border-gray-100 bg-white p-2.5 text-center">
          <div
            className="mx-auto h-3 w-3 rounded-full mb-1"
            style={{ backgroundColor: CLS_COLORS[i] }}
          />
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <p className="text-xl font-bold" style={{ color: CLS_COLORS[i] }}>
            {counts[i]}
          </p>
          <p className="text-[10px] text-slate-400">huruf</p>
        </div>
      ))}
    </div>
  );
}

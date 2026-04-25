"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { WebGazerProvider, useWebGazer } from "@/components/webgazer/WebGazerProvider";
import { CalibrationScreen } from "@/components/webgazer/CalibrationScreen";
import type { DiagnosisResult, HandwritingResult, TranscriptResult } from "@/types";

const HANDWRITING_WORDS = ["rumah", "bola", "meja"] as const;

const READING_TEXT =
  "Budi pergi ke sekolah dengan berjalan kaki. Di jalan ia bertemu dengan teman-temannya. Mereka bermain bersama di halaman sekolah besar.";


type Phase = "handwriting" | "recording" | "analyzing" | "results";
type RecordState = "idle" | "recording" | "processing" | "done";
type AnalysisStatus = "done" | "active" | "waiting";

interface UploadState {
  previewUrl?: string;
  fileName?: string;
  loading: boolean;
  error?: string;
}

interface AnalysisStep {
  title: string;
  helper?: string;
  status: AnalysisStatus;
  progress?: number;
  icon: "check" | "brain" | "clock" | "spark";
}

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function mergeTranscripts(items: TranscriptResult[]): TranscriptResult | undefined {
  if (items.length === 0) return undefined;

  const words = items.flatMap((item) => item.words ?? []);
  const first = words.at(0);
  const last = words.at(-1);
  const duration = first && last ? Math.max(last.end - first.start, 1) : 1;

  return {
    fullText: items.map((item) => item.fullText).filter(Boolean).join(" "),
    words,
    wordsPerMinute:
      words.length > 0
        ? Math.round((words.length / duration) * 60)
        : Math.round(
            items.reduce((total, item) => total + (item.wordsPerMinute || 0), 0) /
              Math.max(items.length, 1)
          ),
    detectedLanguage: items.find((item) => item.detectedLanguage)?.detectedLanguage ?? "id",
  };
}

function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z]/gi, "");
}

function analyzeReadingText(transcript: TranscriptResult | undefined) {
  const sourceWords = READING_TEXT.split(/\s+/);

  if (!transcript || transcript.words.length === 0) {
    return sourceWords.map((word) => ({ word, status: "ok" as const }));
  }

  const spoken = transcript.words;
  const spokenNorm = spoken.map((item) => normalizeWord(item.word));
  let searchFrom = 0;

  return sourceWords.map((word) => {
    const norm = normalizeWord(word);
    let foundIndex = -1;

    for (let index = searchFrom; index < spokenNorm.length; index += 1) {
      if (
        spokenNorm[index] === norm ||
        spokenNorm[index].startsWith(norm) ||
        norm.startsWith(spokenNorm[index])
      ) {
        foundIndex = index;
        break;
      }
    }

    if (foundIndex === -1) return { word, status: "missed" as const };

    searchFrom = foundIndex + 1;
    const previous = foundIndex > 0 ? spoken[foundIndex - 1] : null;
    const pause = previous ? spoken[foundIndex].start - previous.end : 0;

    return {
      word,
      status: pause > 0.8 ? ("slow" as const) : ("ok" as const),
      pause,
    };
  });
}

function CloudBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#cceaff_0%,#eaf6ff_46%,#d9efff_100%)]" />
      <div className="absolute left-[-90px] top-[110px] h-56 w-56 rounded-full bg-white/65 blur-xl" />
      <div className="absolute left-[34px] top-[135px] h-44 w-44 rounded-full bg-white/55 blur-lg" />
      <div className="absolute right-[-65px] top-[155px] h-48 w-48 rounded-full bg-white/70 blur-xl" />
      <div className="absolute right-[65px] top-[205px] h-32 w-32 rounded-full bg-white/55 blur-lg" />
      <div className="absolute bottom-[-120px] left-[-30px] h-72 w-72 rounded-full bg-white/70 blur-xl" />
      <div className="absolute bottom-[-135px] left-[165px] h-72 w-72 rounded-full bg-white/60 blur-xl" />
      <div className="absolute bottom-[-145px] right-[-45px] h-80 w-80 rounded-full bg-white/75 blur-xl" />
      <div className="absolute bottom-[70px] right-[155px] h-28 w-28 rounded-full bg-white/45 blur-lg" />
      <div className="absolute inset-x-10 top-24 bottom-24 rounded-[36px] border border-white/40 bg-white/10 backdrop-blur-[1px]" />
    </div>
  );
}

function KiranaMark() {
  return (
    <div className="flex items-center gap-3">
      <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden>
        <path d="M17.5 2.6c2.5 3.2 2.2 6.2-.9 8.9 5.7 2 9.1 6.7 9.1 12.8 0 1.5-.3 3.1-.8 4.5-4.2-.8-7.4-2.4-9.8-4.8-2.2 2.3-5.1 4-8.8 5.1a16.5 16.5 0 0 1-.9-5.2c0-6.2 3.3-10.8 8.8-12.7-.8-1.4-.6-3.1.5-5l2.8-3.6Z" fill="#17336F" />
        <path d="M3.7 25.8c5.6-1.3 9.6-4.5 11.9-9.5 2.5 5.3 6.3 8.4 11.5 9.4-1.9 3.6-6.2 6-11.4 6-5.8 0-10.4-2.4-12-5.9Z" fill="#254889" />
        <path d="M8.6 8.2 6.9 4.6 10.7 6l3.1-4.1.2 5.1 4.8.5-4.5 2.1.9 4.9-3.5-3.6-4.6 2 1.5-4.7Z" fill="#9BD9FF" />
      </svg>
      <span className="text-[28px] font-extrabold tracking-[0.16em] text-[#17336f]">KIRANA</span>
    </div>
  );
}

function TopBar({ onBack }: { onBack?: () => void }) {
  const backClass =
    "inline-flex h-11 items-center gap-2 rounded-lg bg-[#17336f] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#10285b]";

  return (
    <header className="relative z-10 mx-auto w-full max-w-[1160px] px-4 pt-4">
      <div className="flex h-[76px] items-center justify-between rounded-3xl bg-white px-5 shadow-[0_14px_35px_rgba(23,51,111,0.08)]">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            <span aria-hidden>←</span>
            Kembali
          </button>
        ) : (
          <Link href="/" className={backClass}>
            <span aria-hidden>←</span>
            Kembali
          </Link>
        )}
        <KiranaMark />
      </div>
    </header>
  );
}

function ScreeningFooter() {
  return (
    <footer className="relative z-10 pb-7 pt-10 text-center text-sm text-slate-400">
      © 2026 KIRANA. Semua hak dilindungi.
    </footer>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Tes Menulis" },
    { id: 2, label: "Tes Membaca" },
    { id: 3, label: "Ringkasan" },
  ] as const;

  return (
    <div className="mx-auto mt-7 flex w-full max-w-[360px] items-start justify-center">
      {steps.map((step, index) => {
        const isActive = current === step.id;
        const isDone = current > step.id;

        return (
          <div key={step.id} className="flex flex-1 items-start">
            <div className="flex min-w-[78px] flex-col items-center">
              <div
                className={classNames(
                  "grid h-[52px] w-[52px] place-items-center rounded-full border-2 text-base font-bold transition",
                  isActive || isDone
                    ? "border-[#17336f] bg-[#17336f] text-white"
                    : "border-[#8aa5cf] bg-white/70 text-[#6f89b4]"
                )}
              >
                {step.id}
              </div>
              <span
                className={classNames(
                  "mt-1.5 text-xs font-semibold",
                  isActive || isDone ? "text-[#17336f]" : "text-[#8aa5cf]"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={classNames(
                  "mt-[25px] h-0.5 flex-1 border-t-2",
                  current > step.id ? "border-[#17336f]" : "border-dashed border-[#8aa5cf]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PageTitle({
  title,
  description,
  step,
  compact = false,
}: {
  title?: string;
  description?: string;
  step: 1 | 2 | 3;
  compact?: boolean;
}) {
  return (
    <section className={classNames("relative z-10 mx-auto max-w-4xl text-center", compact ? "mt-8" : "mt-20")}>
      {title && <h1 className="text-5xl font-extrabold tracking-tight text-[#17336f] md:text-6xl">{title}</h1>}
      {description && (
        <p className="mx-auto mt-4 max-w-3xl text-2xl leading-tight text-[#3d4656]/90 md:text-[28px]">
          {description}
        </p>
      )}
      <Stepper current={step} />
    </section>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("rounded-[22px] bg-white shadow-[0_20px_45px_rgba(23,51,111,0.08)]", className)}>
      {children}
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg className="h-24 w-24 text-[#6db8ff]" viewBox="0 0 96 96" fill="none" aria-hidden>
      <path
        d="M35.4 72H27c-10.5 0-19-8.3-19-18.4 0-9.3 7.3-17.2 16.7-18.3C28.3 22.1 39.8 13 53 13c15.2 0 27.7 11.4 29 26.1 7.4 2.5 12.5 9.2 12.5 16.8 0 9.9-8.3 16.1-18.4 16.1H61"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M48 72V40m0 0L34.5 53.5M48 40l13.5 13.5" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DetectionLike = {
  cls?: number;
  class?: number;
  label?: string;
  char?: string;
  character?: string;
  confidence?: number;
  conf?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  xmin?: number;
  ymin?: number;
  xmax?: number;
  ymax?: number;
  bbox?: unknown;
  box?: unknown;
  xyxy?: unknown;
  xywh?: unknown;
  bbox_xywh?: unknown;
};

type BoxRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  cls?: number;
  label: string;
  confidence?: number;
};

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function scaleCoordinate(value: number, axisSize: number) {
  return Math.abs(value) <= 1 ? value * axisSize : value;
}

function getClassNameForDetection(cls: number | undefined) {
  if (cls === 1) return "Reversal";
  if (cls === 2) return "Corrected";
  return "Normal";
}

function getStrokeColor(cls: number | undefined) {
  if (cls === 1) return "#ef4444";
  if (cls === 2) return "#f59e0b";
  return "#22c55e";
}

function formatConfidence(confidence: number) {
  return Math.round(confidence <= 1 ? confidence * 100 : confidence);
}

function objectRectFromDetection(detection: DetectionLike, imageWidth: number, imageHeight: number): BoxRect | null {
  const x1 = toNumber(detection.x1 ?? detection.xmin);
  const y1 = toNumber(detection.y1 ?? detection.ymin);
  const x2 = toNumber(detection.x2 ?? detection.xmax);
  const y2 = toNumber(detection.y2 ?? detection.ymax);

  const x = toNumber(detection.x);
  const y = toNumber(detection.y);
  const width = toNumber(detection.width ?? detection.w);
  const height = toNumber(detection.height ?? detection.h);

  const cls = toNumber(detection.cls ?? detection.class);
  const label =
    detection.char ?? detection.character ?? detection.label ?? getClassNameForDetection(cls);
  const confidence = toNumber(detection.confidence ?? detection.conf);

  if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
    const sx1 = scaleCoordinate(x1, imageWidth);
    const sy1 = scaleCoordinate(y1, imageHeight);
    const sx2 = scaleCoordinate(x2, imageWidth);
    const sy2 = scaleCoordinate(y2, imageHeight);
    return {
      x: Math.min(sx1, sx2),
      y: Math.min(sy1, sy2),
      width: Math.abs(sx2 - sx1),
      height: Math.abs(sy2 - sy1),
      cls,
      label: String(label),
      confidence,
    };
  }

  if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
    return {
      x: scaleCoordinate(x, imageWidth),
      y: scaleCoordinate(y, imageHeight),
      width: scaleCoordinate(width, imageWidth),
      height: scaleCoordinate(height, imageHeight),
      cls,
      label: String(label),
      confidence,
    };
  }

  return null;
}

function rectFromBoxValue(
  value: unknown,
  detection: DetectionLike,
  imageWidth: number,
  imageHeight: number,
  format: "xyxy" | "xywh" = "xyxy"
): BoxRect | null {
  const cls = toNumber(detection.cls ?? detection.class);
  const label =
    detection.char ?? detection.character ?? detection.label ?? getClassNameForDetection(cls);
  const confidence = toNumber(detection.confidence ?? detection.conf);

  if (Array.isArray(value) && value.length >= 4) {
    const [rawA, rawB, rawC, rawD] = value;
    const a = toNumber(rawA);
    const b = toNumber(rawB);
    const c = toNumber(rawC);
    const d = toNumber(rawD);
    if (a === undefined || b === undefined || c === undefined || d === undefined) return null;

    const x = scaleCoordinate(a, imageWidth);
    const y = scaleCoordinate(b, imageHeight);
    const wOrX2 = scaleCoordinate(c, imageWidth);
    const hOrY2 = scaleCoordinate(d, imageHeight);

    if (format === "xywh") {
      return {
        x,
        y,
        width: wOrX2,
        height: hOrY2,
        cls,
        label: String(label),
        confidence,
      };
    }

    return {
      x: Math.min(x, wOrX2),
      y: Math.min(y, hOrY2),
      width: Math.abs(wOrX2 - x),
      height: Math.abs(hOrY2 - y),
      cls,
      label: String(label),
      confidence,
    };
  }

  if (value && typeof value === "object") {
    return objectRectFromDetection(
      {
        ...(value as DetectionLike),
        cls,
        label: detection.label,
        char: detection.char,
        character: detection.character,
        confidence,
      },
      imageWidth,
      imageHeight
    );
  }

  return null;
}

function getDetectionRect(detection: DetectionLike, imageWidth: number, imageHeight: number): BoxRect | null {
  const explicitXywh = rectFromBoxValue(
    detection.xywh ?? detection.bbox_xywh,
    detection,
    imageWidth,
    imageHeight,
    "xywh"
  );
  if (explicitXywh) return explicitXywh;

  const explicitXyxy = rectFromBoxValue(detection.xyxy, detection, imageWidth, imageHeight, "xyxy");
  if (explicitXyxy) return explicitXyxy;

  const nestedBox = rectFromBoxValue(detection.bbox ?? detection.box, detection, imageWidth, imageHeight, "xyxy");
  if (nestedBox) return nestedBox;

  return objectRectFromDetection(detection, imageWidth, imageHeight);
}

function HandwritingPreviewWithBoxes({
  imageUrl,
  handwriting,
  className,
  alt = "Preview tulisan tangan",
}: {
  imageUrl?: string;
  handwriting?: HandwritingResult;
  className?: string;
  alt?: string;
}) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const detections = (handwriting?.detectedChars ?? []) as DetectionLike[];
  const imageSource = imageUrl ?? handwriting?.gradcamImage;

  const boxes = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return [];
    return detections
      .map((detection) => getDetectionRect(detection, imageSize.width, imageSize.height))
      .filter((box): box is BoxRect => Boolean(box && box.width > 0 && box.height > 0));
  }, [detections, imageSize.height, imageSize.width]);

  return (
    <div className={classNames("overflow-hidden rounded-[20px] bg-[#d7d7d7]", className)}>
      {imageSource ? (
        /* Inner div sizes to the image — SVG overlays exactly this area */
        <div className="relative">
          <img
            src={imageSource}
            alt={alt}
            className="block w-full"
            onLoad={(event) => {
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
            }}
          />

          {boxes.length > 0 && imageSize.width > 0 && imageSize.height > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
              aria-hidden
            >
              {boxes.map((box, index) => {
                const stroke = getStrokeColor(box.cls);
                const yLabel = Math.max(box.y - 8, 16);

                return (
                  <g key={`${box.label}-${index}`}>
                    <rect
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill="transparent"
                      stroke={stroke}
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      rx="6"
                    />
                    <text
                      x={box.x}
                      y={yLabel}
                      fill={stroke}
                      fontSize="18"
                      fontWeight="800"
                      paintOrder="stroke"
                      stroke="white"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                    >
                      {box.label}
                      {box.confidence !== undefined ? ` ${formatConfidence(box.confidence)}%` : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {boxes.length > 0 && (
            <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold text-[#17336f] shadow-sm">
              {boxes.length} bounding box terdeteksi
            </div>
          )}
        </div>
      ) : (
        <div className="h-full w-full" />
      )}
    </div>
  );
}


function PredictionPanel({
  upload,
  handwriting,
  onNext,
}: {
  upload: UploadState;
  handwriting?: HandwritingResult;
  onNext: () => void;
}) {
  return (
    <Card className="w-full max-w-[400px] p-6">
      <h2 className="text-center text-[26px] font-extrabold text-[#17336f]">Hasil Prediksi</h2>

      <HandwritingPreviewWithBoxes
        imageUrl={upload.previewUrl}
        handwriting={handwriting}
        className="mt-4 h-[262px]"
      />

      <div className="mt-4 min-h-[170px] rounded-[20px] bg-[#d7d7d7] p-5">
        {upload.loading && (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
            Menganalisis tulisan...
          </div>
        )}

        {!upload.loading && !handwriting && (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
            Unggah foto tulisan untuk melihat prediksi.
          </div>
        )}

        {!upload.loading && handwriting && (
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#4bb75c]">
              <svg className="h-9 w-9 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 12.5 4 4L18.5 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-xl font-extrabold text-[#17336f]">Kerja bagus!</p>
            <p className="text-center text-sm text-slate-500">
              Tulisan berhasil dianalisis. Lanjutkan ke tes membaca.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!handwriting}
        onClick={onNext}
        className="mt-5 h-12 w-full rounded-xl bg-[#17336f] text-sm font-extrabold text-white transition hover:bg-[#10285b] disabled:bg-gray-300"
      >
        Lanjut ke Tes Membaca
      </button>
    </Card>
  );
}

function HandwritingScreen({
  upload,
  handwriting,
  onFile,
  onBack,
  onNext,
}: {
  upload: UploadState;
  handwriting?: HandwritingResult;
  onFile: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) onFile(file);
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <CloudBackdrop />
      <TopBar onBack={onBack} />
      <PageTitle
        step={1}
        title="Tes Menulis"
        description="Langkah pertama, minta anak menuliskan 3 kata sederhana seperti biasa."
      />

      <section className="relative z-10 mx-auto mt-9 grid w-full max-w-[950px] grid-cols-1 gap-6 px-4 md:grid-cols-[1fr_400px]">
        <Card className="p-10">
          <h2 className="text-center text-[25px] font-extrabold leading-tight text-[#17336f]">
            Langkah Pertama:
            <br />
            Tuliskan 3 Kata
          </h2>
          <p className="mt-4 text-center text-sm font-semibold text-[#a7b4ce]">Tuliskan dengan cara biasa anak menulis</p>

          <div className="mt-3 flex justify-center gap-4">
            {HANDWRITING_WORDS.map((word) => (
              <div
                key={word}
                className="grid h-14 min-w-[118px] place-items-center rounded-xl border border-gray-200 bg-white px-6 text-xl font-extrabold text-[#33343a] shadow-sm"
              >
                {word}
              </div>
            ))}
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="mt-7 grid min-h-[208px] cursor-pointer place-items-center rounded-[18px] border-2 border-dashed border-[#2b9dff] bg-[#f8fbff] p-6 text-center transition hover:bg-white"
          >
            <div className="flex flex-col items-center">
              <UploadCloudIcon />
              <p className="text-lg font-extrabold text-[#33343a]">
                Drag & drop atau <span className="text-[#2b9dff]">pilih file</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">Format JPG, PNG, atau PDF (maks. 10MB)</p>
              {upload.fileName && <p className="mt-3 text-xs font-bold text-[#17336f]">{upload.fileName}</p>}
              {upload.error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{upload.error}</p>}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);
              if (file) onFile(file);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.item(0);
              if (file) onFile(file);
            }}
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white text-base font-extrabold text-[#33343a] transition hover:border-[#17336f]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M8.5 7.5 10 5h4l1.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="2" />
            </svg>
            Gunakan Kamera
          </button>
        </Card>

        <PredictionPanel upload={upload} handwriting={handwriting} onNext={onNext} />
      </section>

      <div className="mt-auto">
        <ScreeningFooter />
      </div>
    </main>
  );
}


function ReadingInner({
  transcripts,
  onTranscriptReady,
  onGoAnalysis,
  onBack,
}: {
  transcripts: TranscriptResult[];
  onTranscriptReady: (result: TranscriptResult) => void;
  onGoAnalysis: () => void;
  onBack: () => void;
}) {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string>();

  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasTranscript = transcripts.length > 0 || recordState === "done";

  useEffect(() => {
    const timer = setTimeout(() => window.webgazer?.showVideoPreview(true), 500);
    return () => {
      clearTimeout(timer);
      window.webgazer?.showVideoPreview(false);
    };
  }, []);

  async function startRecording() {
    setError(undefined);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      chunksRef.current = [];
      setDuration(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void submitAudio();
      };

      recorder.start(250);
      recorderRef.current = recorder;
      setRecordState("recording");
      timerRef.current = setInterval(() => setDuration((value) => value + 1), 1000);
    } catch {
      setError("Tidak bisa mengakses mikrofon. Izinkan akses mikrofon di browser.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecordState("processing");
  }

  async function submitAudio() {
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();

      formData.append("file", blob, "reading.webm");
      formData.append("language", "id");

      const response = await fetch(`${getBackendUrl()}/api/audio/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());

      const raw = await response.json();
      const result: TranscriptResult = {
        fullText: raw.full_text ?? "",
        words: raw.words ?? [],
        wordsPerMinute: raw.words_per_minute ?? 0,
        detectedLanguage: raw.detected_language ?? "id",
      };

      onTranscriptReady(result);
      setRecordState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses rekaman.");
      setRecordState("idle");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <CloudBackdrop />
      <TopBar onBack={onBack} />
      <PageTitle
        step={2}
        title="Tes Membaca"
        description="Langkah kedua, minta anak membaca satu paragraf sederhana. Sistem akan memantau pola baca dan pemahaman."
        compact
      />

      <section className="relative z-10 mx-auto mt-8 w-full max-w-[980px] px-4">
        <Card className="px-14 py-9">
          <h2 className="text-center text-[25px] font-extrabold text-[#17336f]">Silahkan Membaca Teks</h2>
          <p className="mt-2 text-center text-sm font-semibold text-[#a7b4ce]">Baca teks pada layar dengan suara yang nyaman & tempo biasa</p>

          <div className="mt-5 flex items-center gap-8">
            <span className="text-base font-semibold text-[#17336f]">Satu proses rekaman</span>
            <div className="h-4 flex-1 rounded-full bg-[#e8edf4]">
              <div className="h-full rounded-full bg-[#17336f] transition-all" style={{ width: hasTranscript ? "100%" : "0%" }} />
            </div>
            <button
              type="button"
              disabled={!hasTranscript || recordState === "processing"}
              onClick={onGoAnalysis}
              className="inline-flex h-12 min-w-[112px] items-center justify-center gap-3 rounded-xl bg-[#17336f] px-5 text-base font-extrabold text-white transition hover:bg-[#10285b] disabled:bg-gray-300"
            >
              Analisis
              <span aria-hidden>›</span>
            </button>
          </div>

          <div className="relative mt-6 rounded-[28px] border border-[#bcd9f6] bg-[#f3f8ff] px-8 py-16 text-center">
            <p className="mx-auto max-w-[760px] text-[32px] font-medium leading-tight text-[#17336f] md:text-[36px]">{READING_TEXT}</p>

            <button
              type="button"
              onClick={() => {
                if (recordState === "recording") stopRecording();
                else if (recordState === "idle" || recordState === "done") void startRecording();
              }}
              disabled={recordState === "processing"}
              className={classNames(
                "absolute -bottom-9 left-1/2 grid h-[82px] w-[82px] -translate-x-1/2 place-items-center rounded-full text-white shadow-lg transition",
                recordState === "recording" ? "bg-red-500 hover:bg-red-600" : "bg-[#17336f] hover:bg-[#10285b]",
                recordState === "processing" && "bg-gray-300"
              )}
              aria-label={recordState === "recording" ? "Stop recording" : "Start recording"}
            >
              {recordState === "processing" ? (
                <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 0 0-4 4H4Z" />
                </svg>
              ) : (
                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 14a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" fill="currentColor" />
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-12 min-h-6 text-center text-sm font-semibold">
            {recordState === "recording" && <span className="text-red-500">Merekam... {duration}s. Klik mikrofon untuk selesai.</span>}
            {recordState === "processing" && <span className="text-[#259dff]">Memproses rekaman...</span>}
            {recordState === "done" && <span className="text-green-600">Rekaman berhasil diproses. Kamu bisa langsung lanjut analisis.</span>}
            {error && <span className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</span>}
          </div>
        </Card>

      </section>

      <div className="mt-auto">
        <ScreeningFooter />
      </div>
    </main>
  );
}

function CalibrationInner({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <CloudBackdrop />
      <TopBar onBack={onBack} />
      <PageTitle
        step={2}
        title="Kalibrasi Mata"
        description="Sebelum tes membaca, kalibrasi kamera agar sistem dapat melacak pola baca secara akurat."
        compact
      />
      <div className="relative z-10 mx-auto mt-8 w-full max-w-[760px] px-4">
        <CalibrationScreen onComplete={onComplete} />
      </div>
      <div className="mt-auto">
        <ScreeningFooter />
      </div>
    </main>
  );
}

function ReadingScreen(props: {
  transcripts: TranscriptResult[];
  onTranscriptReady: (result: TranscriptResult) => void;
  onGoAnalysis: () => void;
  onBack: () => void;
}) {
  const [calibrated, setCalibrated] = useState(false);

  return (
    <WebGazerProvider>
      {!calibrated ? (
        <CalibrationInner onComplete={() => setCalibrated(true)} onBack={props.onBack} />
      ) : (
        <ReadingInner {...props} />
      )}
    </WebGazerProvider>
  );
}

function StatusIcon({ step }: { step: AnalysisStep }) {
  if (step.status === "done" || step.icon === "check") {
    return (
      <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#4bb75c] text-white">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m6 12.5 4 4L18.5 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (step.status === "active") {
    return (
      <div className="grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-[#259dff] bg-white text-sm font-extrabold text-[#259dff]">
        {step.progress ?? 0}%
      </div>
    );
  }

  return (
    <div className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dashed border-gray-300 bg-white text-gray-400">
      {step.icon === "brain" ? (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M9 3a4 4 0 0 0-4 4v1.1A4 4 0 0 0 6.2 16 4 4 0 0 0 14 18h1a4 4 0 0 0 2-7.46V7a4 4 0 0 0-8 0v.2A4.2 4.2 0 0 0 9 3Z" />
        </svg>
      ) : (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

function AnalysisScreen({ progress }: { progress: number }) {
  const steps: AnalysisStep[] = [
    { title: "Handwriting", status: "done", icon: "check" },
    { title: "Reading pattern", status: "active", progress, icon: "clock" },
    { title: "Pemahaman awal", status: progress >= 100 ? "active" : "waiting", progress: progress >= 100 ? 45 : undefined, icon: "brain" },
    { title: "Menyusun rekomendasi", status: "waiting", icon: "clock" },
  ];

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <CloudBackdrop />
      <TopBar />
      <section className="relative z-10 mx-auto mt-24 w-full max-w-[360px]">
        <Stepper current={2} />
      </section>

      <Card className="relative z-10 mx-auto mt-10 w-full max-w-[540px] p-8">
        <h1 className="text-center text-[24px] font-extrabold text-[#17336f]">Progress analisis</h1>
        <p className="mt-1 text-center text-sm font-medium text-gray-400">Kami memeriksa hasil tes satu per satu.</p>

        <div className="relative mt-7 space-y-4">
          <div className="absolute bottom-16 left-[26px] top-9 w-px border-l-2 border-dashed border-gray-300" />

          {steps.map((step) => (
            <div
              key={step.title}
              className={classNames(
                "relative flex items-center gap-4 rounded-xl border p-3 transition",
                step.status === "done" && "border-green-100 bg-green-50",
                step.status === "active" && "border-[#cde7ff] bg-[#edf7ff]",
                step.status === "waiting" && "border-gray-100 bg-gray-50 opacity-55"
              )}
            >
              <StatusIcon step={step} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-[#17336f]">{step.title}</p>
                {step.status === "active" && (
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-[#259dff]" style={{ width: `${step.progress ?? 0}%` }} />
                  </div>
                )}
              </div>
              <span
                className={classNames(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  step.status === "done" && "bg-green-100 text-green-600",
                  step.status === "active" && "text-[#259dff]",
                  step.status === "waiting" && "text-gray-400"
                )}
              >
                {step.status === "done" ? "Selesai" : step.status === "active" ? "" : "Menunggu"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-[#e8f5ff] p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden>
              ☆
            </span>
            <div>
              <p className="text-sm font-extrabold text-[#17336f]">Tahukah Kamu?</p>
              <p className="mt-1 text-sm leading-snug text-[#4d5564]">
                Disleksia bukan tanda kurang cerdas. Banyak anak dengan disleksia memiliki potensi besar dalam kreativitas,
                pemecahan masalah, dan berpikir visual.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-auto">
        <ScreeningFooter />
      </div>
    </main>
  );
}

const RISK_CONFIG = {
  high: {
    label: "Risiko Tinggi",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    dot: "bg-red-500",
    cardBorder: "border-red-200",
    cardBg: "bg-red-50",
    icon: (
      <svg className="h-9 w-9 text-red-500" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  medium: {
    label: "Risiko Sedang",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-700",
    dot: "bg-yellow-500",
    cardBorder: "border-yellow-200",
    cardBg: "bg-yellow-50",
    icon: (
      <svg className="h-9 w-9 text-yellow-500" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  low: {
    label: "Risiko Rendah",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    dot: "bg-green-500",
    cardBorder: "border-green-200",
    cardBg: "bg-green-50",
    icon: (
      <svg className="h-9 w-9 text-green-500" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m9 11 3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
} as const;

function ResultsScreen({
  diagnosis,
  handwriting,
  handwritingImageUrl,
  transcript,
  onReset,
}: {
  diagnosis?: DiagnosisResult;
  handwriting?: HandwritingResult;
  handwritingImageUrl?: string;
  transcript?: TranscriptResult;
  onReset: () => void;
}) {
  const level = diagnosis?.riskLevel ?? "low";
  const risk = RISK_CONFIG[level];
  const wordAnalysis = useMemo(() => analyzeReadingText(transcript), [transcript]);
  const [imageExpanded, setImageExpanded] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <CloudBackdrop />
      <TopBar onBack={onReset} />
      <PageTitle
        step={3}
        title="Ringkasan"
        description="Hasil awal skrining sudah siap. Gunakan hasil ini sebagai panduan awal, bukan diagnosis klinis."
        compact
      />

      <section className="relative z-10 mx-auto mt-9 grid w-full max-w-[980px] gap-6 px-4 pb-10 md:grid-cols-[340px_1fr]">

        {/* LEFT — Risk summary */}
        <div className="space-y-4">
          <Card className={classNames("border-2 p-7 text-center", risk.cardBorder, risk.cardBg)}>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow-md">
              {risk.icon}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-[#17336f]">Skrining Selesai!</h2>
            <div className={classNames("mx-auto mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5", risk.badgeBg)}>
              <span className={classNames("h-2 w-2 rounded-full", risk.dot)} />
              <span className={classNames("text-sm font-extrabold", risk.badgeText)}>{risk.label}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {diagnosis?.reasoning ??
                "Sistem berhasil membaca pola tulisan dan pola pembacaan. Lanjutkan observasi dengan aktivitas membaca yang nyaman."}
            </p>
          </Card>

          {diagnosis?.recommendation && (
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8f5ff]" aria-hidden>
                  <svg className="h-4 w-4 text-[#17336f]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#17336f]">Rekomendasi</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{diagnosis.recommendation}</p>
                </div>
              </div>
            </Card>
          )}

          <button
            type="button"
            onClick={onReset}
            className="h-12 w-full rounded-xl bg-[#17336f] text-sm font-extrabold text-white transition hover:bg-[#10285b]"
          >
            Screening siswa lain
          </button>
        </div>

        {/* RIGHT — Detail cards */}
        <div className="space-y-6">

          {/* Handwriting */}
          {(() => {
            const detectedChars = (handwriting?.detectedChars ?? []) as DetectionLike[];
            const reversalCount = detectedChars.filter((d) => toNumber(d.cls ?? d.class) === 1).length;
            const correctedCount = detectedChars.filter((d) => toNumber(d.cls ?? d.class) === 2).length;
            const normalCount = detectedChars.filter((d) => {
              const cls = toNumber(d.cls ?? d.class);
              return cls !== 1 && cls !== 2;
            }).length;
            const totalDetected = detectedChars.length;
            const dyslexiaRisk =
              totalDetected > 0
                ? Math.round(((reversalCount + correctedCount * 0.5) / totalDetected) * 100)
                : Math.round((handwriting?.confidence ?? 0) * 100);

            return (
              <Card className="p-7">
                <div className="flex items-center gap-3 mb-5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf7ff]" aria-hidden>
                    <svg className="h-5 w-5 text-[#17336f]" viewBox="0 0 24 24" fill="none">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h3 className="text-xl font-extrabold text-[#17336f]">Deteksi Tulisan Tangan</h3>
                </div>

                <div className="grid gap-5 md:grid-cols-[200px_1fr]">
                  {/* Thumbnail — click to expand */}
                  <button
                    type="button"
                    onClick={() => setImageExpanded(true)}
                    className="group relative cursor-zoom-in"
                    aria-label="Perbesar gambar tulisan tangan"
                  >
                    <HandwritingPreviewWithBoxes
                      imageUrl={handwritingImageUrl}
                      handwriting={handwriting}
                      className="h-36 rounded-xl"
                      alt="Tulisan tangan"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition group-hover:bg-black/20">
                      <svg className="h-8 w-8 text-white opacity-0 drop-shadow transition group-hover:opacity-100" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M15 3h6m0 0v6m0-6-7 7M9 21H3m0 0v-6m0 6 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  {/* Lightbox */}
                  {imageExpanded && (
                    <div
                      className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                      onClick={() => setImageExpanded(false)}
                    >
                      <div
                        className="relative mx-4 max-h-[90vh] w-full max-w-3xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HandwritingPreviewWithBoxes
                          imageUrl={handwritingImageUrl}
                          handwriting={handwriting}
                          className="max-h-[85vh] w-full rounded-2xl shadow-2xl"
                          alt="Tulisan tangan (diperbesar)"
                        />
                        <button
                          type="button"
                          onClick={() => setImageExpanded(false)}
                          className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow-lg transition hover:bg-gray-100"
                          aria-label="Tutup"
                        >
                          <svg className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Risk percentage */}
                    <div className="flex items-center gap-4 rounded-xl bg-[#f3f8ff] px-4 py-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Indikasi Disleksia</p>
                        <p className="mt-0.5 text-3xl font-extrabold text-[#17336f]">{dyslexiaRisk}%</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={classNames(
                              "h-full rounded-full transition-all",
                              dyslexiaRisk >= 60 ? "bg-red-500" : dyslexiaRisk >= 30 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${dyslexiaRisk}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">dari total {totalDetected} karakter terdeteksi</p>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl border border-red-100 bg-red-50 px-2 py-3">
                        <p className="text-2xl font-extrabold text-red-600">{reversalCount}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-red-400">Reversal</p>
                      </div>
                      <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-2 py-3">
                        <p className="text-2xl font-extrabold text-yellow-600">{correctedCount}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-yellow-400">Corrected</p>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-green-50 px-2 py-3">
                        <p className="text-2xl font-extrabold text-green-600">{normalCount}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-green-400">Normal</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div className="mt-4 rounded-xl bg-[#f8fafc] px-4 py-3 font-mono text-xs text-slate-500">
                  <span className="font-bold text-slate-600">Perhitungan: </span>
                  ({reversalCount} reversal + {correctedCount} corrected × 0.5) ÷ {totalDetected || 1} total
                  {" = "}
                  <span className="font-bold text-[#17336f]">{dyslexiaRisk}%</span>
                  {totalDetected === 0 && (
                    <span className="ml-1 text-slate-400">(fallback: confidence model)</span>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Reading pattern */}
          <Card className="p-7">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf7ff]" aria-hidden>
                <svg className="h-5 w-5 text-[#17336f]" viewBox="0 0 24 24" fill="none">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="text-xl font-extrabold text-[#17336f]">Pola Membaca</h3>
            </div>

            <div className="rounded-xl bg-[#f3f8ff] p-4 text-sm leading-8 text-[#17336f]">
              {wordAnalysis.map((item, index) => (
                <span
                  key={`${item.word}-${index}`}
                  className={classNames(
                    "mr-1.5 rounded px-1 py-0.5",
                    item.status === "slow" && "bg-yellow-200 text-yellow-800",
                    item.status === "missed" && "bg-red-200 font-bold text-red-800"
                  )}
                >
                  {item.word}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-yellow-200" />
                <span className="text-xs font-semibold text-yellow-700">Lambat</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-200" />
                <span className="text-xs font-semibold text-red-700">Terlewat</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#edf7ff] p-4 text-center">
                <p className="text-2xl font-extrabold text-[#17336f]">{Math.round(transcript?.wordsPerMinute ?? 0)}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">kata/menit</p>
              </div>
              <div className="rounded-xl bg-[#edf7ff] p-4 text-center">
                <p className="text-2xl font-extrabold text-[#17336f]">{transcript?.words.length ?? 0}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">kata terdeteksi</p>
              </div>
            </div>
          </Card>

        </div>
      </section>

      <div className="mt-auto">
        <ScreeningFooter />
      </div>
    </main>
  );
}

export default function ScreeningPage() {
  const [phase, setPhase] = useState<Phase>("handwriting");
  const [upload, setUpload] = useState<UploadState>({ loading: false });
  const [handwriting, setHandwriting] = useState<HandwritingResult>();
  const [handwritingImageUrl, setHandwritingImageUrl] = useState<string>();
  const [transcripts, setTranscripts] = useState<TranscriptResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult>();
  const [analysisProgress, setAnalysisProgress] = useState(92);

  const mergedTranscript = useMemo(() => mergeTranscripts(transcripts), [transcripts]);

  useEffect(() => {
    if (phase !== "analyzing") return;

    setAnalysisProgress(28);
    const progressTimer = setInterval(() => {
      setAnalysisProgress((value) => Math.min(value + 8, 100));
    }, 180);

    const finishTimer = setTimeout(() => {
      void runDiagnosis();
    }, 1500);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleBack() {
    if (phase === "handwriting") {
      window.history.back();
      return;
    }

    if (phase === "recording") setPhase("handwriting");
    else if (phase === "results") setPhase("recording");
  }

  function handleReset() {
    setPhase("handwriting");
    setUpload({ loading: false });
    setHandwriting(undefined);
    setHandwritingImageUrl(undefined);
    setTranscripts([]);
    setDiagnosis(undefined);
    setAnalysisProgress(92);
  }

  async function handleHandwritingFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setUpload({ loading: false, fileName: file.name, error: "Saat ini analisis otomatis hanya mendukung gambar JPG/PNG." });
      return;
    }

    if (handwritingImageUrl) URL.revokeObjectURL(handwritingImageUrl);

    const previewUrl = URL.createObjectURL(file);
    setUpload({ previewUrl, fileName: file.name, loading: true, error: undefined });
    setHandwritingImageUrl(previewUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${getBackendUrl()}/api/handwriting/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());

      const raw = await response.json();
      const result: HandwritingResult = {
        classification: raw.classification ?? "normal",
        confidence: raw.confidence ?? 0,
        reversalChars: raw.reversal_chars ?? [],
        gradcamImage: raw.gradcam_image ?? undefined,
        detectedChars: raw.detected_chars ?? [],
      };

      setHandwriting(result);
      setUpload({ previewUrl, fileName: file.name, loading: false });
    } catch (err) {
      setUpload({
        previewUrl,
        fileName: file.name,
        loading: false,
        error: err instanceof Error ? err.message : "Gagal menganalisis tulisan tangan.",
      });
    }
  }

  function handleTranscriptReady(result: TranscriptResult) {
    setTranscripts([result]);
  }

  async function runDiagnosis() {
    try {
      const response = await fetch(`${getBackendUrl()}/api/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handwriting: handwriting
            ? {
                classification: handwriting.classification,
                confidence: handwriting.confidence,
                reversal_chars: handwriting.reversalChars,
              }
            : null,
          transcript: mergedTranscript
            ? {
                full_text: mergedTranscript.fullText,
                words: mergedTranscript.words,
                words_per_minute: mergedTranscript.wordsPerMinute,
                detected_language: mergedTranscript.detectedLanguage,
              }
            : null,
          child_age: null,
          child_grade: null,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const raw = await response.json();
      setDiagnosis({
        riskLevel: raw.risk_level ?? "low",
        confidence: raw.confidence ?? handwriting?.confidence ?? 0,
        indicators: Array.isArray(raw.indicators) ? raw.indicators : [],
        reasoning: raw.reasoning ?? "",
        recommendation: raw.recommendation ?? "",
      });
    } catch {
      setDiagnosis({
        riskLevel: handwriting?.classification === "reversal" ? "medium" : "low",
        confidence: handwriting?.confidence ?? 0.7,
        indicators: [],
        reasoning: "Analisis backend belum tersedia, sehingga ringkasan sementara dibuat dari hasil tulisan dan rekaman yang sudah masuk.",
        recommendation: "Ulangi skrining dengan pencahayaan baik dan lingkungan membaca yang tenang.",
      });
    } finally {
      setAnalysisProgress(100);
      setTimeout(() => setPhase("results"), 650);
    }
  }

  if (phase === "handwriting") {
    return (
      <HandwritingScreen
        upload={upload}
        handwriting={handwriting}
        onFile={(file) => void handleHandwritingFile(file)}
        onBack={handleBack}
        onNext={() => setPhase("recording")}
      />
    );
  }

  if (phase === "recording") {
    return (
      <ReadingScreen
        transcripts={transcripts}
        onTranscriptReady={handleTranscriptReady}
        onGoAnalysis={() => setPhase("analyzing")}
        onBack={handleBack}
      />
    );
  }

  if (phase === "analyzing") {
    return <AnalysisScreen progress={analysisProgress} />;
  }

  return (
    <ResultsScreen
      diagnosis={diagnosis}
      handwriting={handwriting}
      handwritingImageUrl={handwritingImageUrl}
      transcript={mergedTranscript}
      onReset={handleReset}
    />
  );
}

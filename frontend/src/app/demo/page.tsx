"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { PDFUploader } from "@/components/pdf-reader/PDFUploader";
import { FontControllerProvider } from "@/components/adaptive-ui/FontController";
import type { PDFPage } from "@/types";

// webgazer and AdaptiveReader are client-only (access window)
const AdaptiveReader = dynamic(
  () => import("@/components/pdf-reader/AdaptiveReader").then((m) => m.AdaptiveReader),
  { ssr: false }
);

export default function DemoPage() {
  return <AdaptiveReader />;
}

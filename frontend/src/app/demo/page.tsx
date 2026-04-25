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
  const [pages, setPages] = useState<PDFPage[] | null>(null);

  return (
    <FontControllerProvider>
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Demo Membaca Adaptif — DyslexiAID
        </h1>
        {!pages ? (
          <PDFUploader onExtracted={setPages} />
        ) : (
          <AdaptiveReader pages={pages} />
        )}
      </main>
    </FontControllerProvider>
  );
}

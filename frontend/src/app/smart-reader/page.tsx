"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";

const HISTORY_KEY = "kirana_pdf_history";
const MAX_HISTORY = 20;

interface PDFHistoryEntry {
  sessionId: string;
  filename: string;
  uploadedAt: string;
  totalPages: number;
}

function loadHistory(): PDFHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as PDFHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: PDFHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function KiranaLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
        <polygon points="11,2 13.5,8 20,8 14.5,12.5 16.5,19 11,15 5.5,19 7.5,12.5 2,8 8.5,8" fill="#5AC8C8" />
      </svg>
      <span className="font-bold text-base text-slate-800 tracking-tight">KIRANA</span>
    </div>
  );
}

export default function SmartReaderPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentFilename, setCurrentFilename] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<PDFHistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const readUrl = sessionId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/read/${sessionId}`
    : null;

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("File harus berupa PDF.");
      return;
    }
    setUploading(true);
    setError(null);
    setSessionId(null);
    setCurrentFilename(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/pdf/session`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Gagal memproses PDF.");
      const data = (await res.json()) as { session_id: string; total_pages: number };
      setSessionId(data.session_id);
      setTotalPages(data.total_pages);

      const entry: PDFHistoryEntry = {
        sessionId: data.session_id,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        totalPages: data.total_pages,
      };
      const updated = [entry, ...loadHistory().filter((e) => e.sessionId !== data.session_id)];
      saveHistory(updated);
      setHistory(updated.slice(0, MAX_HISTORY));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUploading(false);
    }
  }

  async function copyLink() {
    if (!readUrl) return;
    await navigator.clipboard.writeText(readUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyHistoryLink(sid: string) {
    const url = `${window.location.origin}/read/${sid}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(sid);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function deleteEntry(sid: string) {
    const updated = history.filter((e) => e.sessionId !== sid);
    setHistory(updated);
    saveHistory(updated);
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  return (
    <div className="min-h-screen bg-[#f0fafa]">
      <div className="h-1 bg-[#5AC8C8]" />
      <header className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/"><KiranaLogo /></Link>
          <h1 className="text-sm font-semibold text-slate-600">Smart Reader</h1>
          <span />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#e4f5f5] border border-[#c8e8e8] mb-4">
            <span className="text-3xl">📖</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Upload PDF Bacaan</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Upload PDF materi bacaan, lalu bagikan link unik kepada siswa. Teks akan beradaptasi dengan pola pandangan mata mereka.
          </p>
        </div>

        {/* Upload or Result */}
        {!sessionId ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault(); setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-all bg-white ${
              isDragging ? "border-[#5AC8C8] bg-[#f0fafa]" : "border-gray-200 hover:border-[#5AC8C8]/60"
            }`}
          >
            <input
              ref={inputRef} type="file" accept="application/pdf" className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
            {isUploading ? (
              <div className="space-y-3">
                <svg className="mx-auto h-8 w-8 animate-spin text-[#5AC8C8]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-500">Mengekstrak teks dan gambar dari PDF…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-5xl">📄</div>
                <p className="font-semibold text-slate-700">Klik atau drag PDF ke sini</p>
                <p className="text-xs text-slate-400">Hanya file PDF — teks dan gambar akan diekstrak otomatis</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 bg-[#5AC8C8] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#4ab8b8] transition-colors"
                >
                  Pilih PDF
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-[#5AC8C8]/30 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="font-semibold text-slate-800">PDF siap! {totalPages} halaman diekstrak</p>
                <p className="text-sm text-slate-500 truncate max-w-xs">{currentFilename}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Link Siswa</label>
              <div className="flex gap-2">
                <input
                  readOnly value={readUrl ?? ""}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono text-slate-600 bg-gray-50 focus:outline-none"
                />
                <button
                  onClick={() => void copyLink()}
                  className="bg-[#5AC8C8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#4ab8b8] transition-colors whitespace-nowrap"
                >
                  {copied ? "✓ Tersalin" : "Salin"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`/read/${sessionId}`} target="_blank"
                className="flex-1 bg-[#5AC8C8] text-white text-sm font-semibold py-3 rounded-xl text-center hover:bg-[#4ab8b8] transition-colors"
              >
                🚀 Buka Sebagai Siswa
              </a>
              <button
                onClick={() => { setSessionId(null); setError(null); }}
                className="px-4 rounded-xl border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Upload Baru
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* PDF History */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-slate-700">Riwayat Upload</h3>
              <button
                onClick={clearHistory}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Hapus Semua
              </button>
            </div>
            <ul className="divide-y divide-gray-50">
              {history.map((entry) => (
                <li key={entry.sessionId} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#e4f5f5] flex items-center justify-center text-base">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{entry.filename}</p>
                    <p className="text-xs text-slate-400">
                      {entry.totalPages} hal · {formatDate(entry.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <a
                      href={`/read/${entry.sessionId}`}
                      target="_blank"
                      className="text-xs font-semibold text-[#5AC8C8] hover:text-[#4ab8b8] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#e4f5f5]"
                    >
                      Buka
                    </a>
                    <button
                      onClick={() => void copyHistoryLink(entry.sessionId)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
                      title="Salin link"
                    >
                      {copiedId === entry.sessionId ? "✓" : "Salin"}
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.sessionId)}
                      className="text-xs text-slate-300 hover:text-red-400 transition-colors px-1.5 py-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
                      title="Hapus dari riwayat"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="px-5 py-3 text-xs text-slate-400 border-t border-gray-100 bg-gray-50/50">
              Link mungkin tidak aktif setelah server di-restart (sesi disimpan di memori).
            </p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Cara Kerja Smart Reader</h3>
          <ol className="space-y-3">
            {[
              ["📄", "Guru upload PDF dan mendapatkan link unik"],
              ["🔗", "Guru bagikan link ke siswa (WhatsApp, email, dll.)"],
              ["📷", "Siswa buka link — kamera aktif untuk melacak pandangan"],
              ["🧠", "Teks otomatis menyesuaikan ukuran, jarak, dan simplifikasi"],
            ].map(([icon, text], i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e4f5f5] text-sm">
                  {icon}
                </div>
                <span className="text-sm text-slate-600 pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white py-5 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <KiranaLogo />
          <p className="text-xs text-slate-400">© 2024 DyslexiAID Indonesia.</p>
          <nav className="flex gap-4 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-600">Kebijakan Privasi</a>
            <a href="#" className="hover:text-slate-600">Syarat Ketentuan</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

"use client"

import { useState, useEffect, useRef, type ChangeEvent, type DragEvent } from "react"
import { useRouter } from "next/navigation"

interface PDFHistoryEntry {
  sessionId: string
  filename: string
  uploadedAt: string
  totalPages: number
  title?: string
  grade?: string
}

const HISTORY_KEY = "kirana_pdf_history"
const MAX_HISTORY = 20

function loadHistory(): PDFHistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as PDFHistoryEntry[]
  } catch {
    return []
  }
}

function saveHistory(entry: PDFHistoryEntry) {
  const prev = loadHistory()
  const deduped = prev.filter((e) => e.sessionId !== entry.sessionId)
  const updated = [entry, ...deduped].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

export default function SmartReaderPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [isDragging, setDragging] = useState(false)
  const [isUploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)

  const [title, setTitle] = useState("")
  const [grade, setGrade] = useState("Kelas 3 SD")

  const [history, setHistory] = useState<PDFHistoryEntry[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setUploadError("File harus berupa PDF.")
      return
    }

    setUploading(true)
    setUploadError(null)
    setSessionId(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""
      const res = await fetch(`${backendUrl}/api/pdf/session`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) throw new Error("Gagal mengunggah PDF.")

      const json = (await res.json()) as { session_id: string; total_pages: number }

      setSessionId(json.session_id)
      setFilename(file.name)
      setTotalPages(json.total_pages)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setUploading(false)
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function handleLanjutkan() {
    if (!sessionId || !filename) return

    const entry: PDFHistoryEntry = {
      sessionId,
      filename,
      uploadedAt: new Date().toISOString(),
      totalPages,
      title: title.trim() || undefined,
      grade,
    }

    const updated = saveHistory(entry)
    setHistory(updated)
    router.push(`/read/${sessionId}`)
  }

  function handleDeleteEntry(id: string) {
    const updated = history.filter((e) => e.sessionId !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
    setHistory(updated)
  }

  function handleClearAll() {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  async function handleCopy(id: string) {
    const url = `${window.location.origin}/read/${id}`
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-100 to-white p-6">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto text-center mt-10">
        <h1 className="text-4xl font-bold text-blue-900">
          Unggah Materi Pembelajaran
        </h1>
        <p className="text-gray-600 mt-3">
          Guru dapat mengunggah dokumen pembelajaran, menyiapkan materi baca,
          dan membuat pengalaman belajar yang interaktif
        </p>
      </div>

      {/* MAIN */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

        {/* LEFT - UPLOAD */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4">Unggah file</h2>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={[
              "rounded-xl border-2 border-dashed p-8 text-center transition",
              isDragging ? "border-black bg-gray-50" : "border-gray-300 bg-white",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />
            <p className="text-sm font-medium">Upload PDF bacaan</p>
            <p className="mt-1 text-xs text-gray-500">
              Tarik file ke sini atau pilih dari perangkat.
            </p>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? "Memproses..." : "Pilih PDF"}
            </button>
            {uploadError && (
              <p className="mt-3 text-sm text-red-600">{uploadError}</p>
            )}
          </div>

          {/* TIPS */}
          <div className="mt-5 text-sm text-gray-500">
            <p className="font-medium mb-1">Tips unggah materi yang baik:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Pastikan teks mudah dibaca</li>
              <li>Gunakan materi sesuai level kelas</li>
              <li>Hindari halaman yang terlalu padat</li>
            </ul>
          </div>
        </div>

        {/* RIGHT - CONFIG */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4">Hasil &amp; pengaturan</h2>

          {/* SUCCESS INFO */}
          {sessionId && filename && (
            <div className="mb-4 p-3 border rounded-lg bg-green-50 border-green-200">
              <p className="font-medium text-sm text-green-800">{filename}</p>
              <p className="text-xs text-green-600">
                {totalPages} halaman berhasil diproses
              </p>
            </div>
          )}

          {/* TITLE */}
          <div className="mb-3">
            <label className="text-sm font-medium">Judul materi</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Materi Membaca Kelas 3"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          {/* GRADE */}
          <div className="mb-3">
            <label className="text-sm font-medium">Target siswa</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
            >
              <option>Kelas 1 SD</option>
              <option>Kelas 2 SD</option>
              <option>Kelas 3 SD</option>
              <option>Kelas 4 SD</option>
            </select>
          </div>

          {/* BUTTON */}
          <button
            disabled={!sessionId}
            onClick={handleLanjutkan}
            className="w-full mt-5 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition font-medium"
          >
            Lanjutkan
          </button>
        </div>
      </div>

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="max-w-6xl mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Riwayat materi</h2>
              <button
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:text-red-700 transition"
              >
                Hapus Semua
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Tautan mungkin tidak aktif setelah backend di-restart (sesi tersimpan sementara).
            </p>

            <ul className="space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.sessionId}
                  className="group flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-medium truncate">
                      {entry.title ?? entry.filename}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.grade && <span className="mr-2">{entry.grade}</span>}
                      {entry.totalPages} hal ·{" "}
                      {new Date(entry.uploadedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/read/${entry.sessionId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Buka
                    </a>
                    <button
                      onClick={() => void handleCopy(entry.sessionId)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition"
                    >
                      {copiedId === entry.sessionId ? "Tersalin!" : "Salin"}
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.sessionId)}
                      className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <p className="mt-auto pt-10 text-center text-xs text-gray-400">
        © 2026 KIRANA. Semua hak dilindungi.
      </p>
    </div>
  )
}

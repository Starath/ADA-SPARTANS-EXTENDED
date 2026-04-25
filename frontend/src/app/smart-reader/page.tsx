"use client"

import { useState } from "react"
import { PDFUploader } from "@/components/pdf-reader/PDFUploader"

export default function SmartReaderPage() {
  const [pages, setPages] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)

  const [title, setTitle] = useState("")
  const [grade, setGrade] = useState("Kelas 3 SD")

  const [enableSmartReader, setEnableSmartReader] = useState(true)
  const [enableEyeTracking, setEnableEyeTracking] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-6">
      
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

          <PDFUploader
            onExtracted={(pagesData, uploadedFile) => {
              setPages(pagesData)
              setFile(uploadedFile)
            }}
          />

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
          <h2 className="text-lg font-semibold mb-4">
            Hasil & pengaturan
          </h2>

          {/* SUCCESS INFO */}
          {pages.length > 0 && (
            <div className="mb-4 p-3 border rounded-lg">
              <p className="font-medium text-sm">{file?.name}</p>
              <p className="text-xs text-gray-500">
                {pages.length} halaman berhasil diproses
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

          {/* TOGGLES */}
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Mode Smart Reader</span>
              <input
                type="checkbox"
                checked={enableSmartReader}
                onChange={() =>
                  setEnableSmartReader(!enableSmartReader)
                }
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Eye tracking</span>
              <input
                type="checkbox"
                checked={enableEyeTracking}
                onChange={() =>
                  setEnableEyeTracking(!enableEyeTracking)
                }
              />
            </div>
          </div>

          {/* BUTTON */}
          <button
            disabled={pages.length === 0}
            className="w-full mt-5 bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
            onClick={() => {
              console.log({
                pages,
                title,
                grade,
                enableSmartReader,
                enableEyeTracking,
              })
            }}
          >
            Lanjutkan
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <p className="text-center text-xs text-gray-400 mt-10">
        © 2026 KIRANA. Semua hak dilindungi.
      </p>
    </div>
  )
}
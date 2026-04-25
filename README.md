# KIRANA Landing Page

KIRANA adalah landing page untuk platform pendamping belajar dan deteksi dini disleksia pada anak. Halaman ini dibuat berdasarkan prototype Figma dan diimplementasikan ke dalam frontend Next.js dengan Tailwind CSS.

## Fitur yang Telah Dibuat

### 1. Fixed Navigation Bar
Navbar dibuat fixed di bagian atas halaman agar tetap terlihat saat pengguna melakukan scroll.

Fitur navbar:
- Logo KIRANA.
- Navigasi anchor ke bagian `Fitur`, `Cara Kerja`, dan `Kontak`.
- Tombol utama `Mulai Screening`.
- Z-index tinggi agar navbar tetap berada di atas section, card, badge, dan form.
- Efek blur dan background semi-transparan agar tetap terbaca saat scroll.

### 2. Hero Section
Section utama berisi pesan utama aplikasi KIRANA.

Isi hero:
- Headline utama: deteksi dini disleksia dengan pengalaman belajar yang ramah anak.
- Highlight teks `ramah anak`.
- Deskripsi singkat value proposition.
- Tombol CTA `Mulai Screening`.
- Tombol sekunder `Lihat Cara Kerja`.
- Ilustrasi anak membaca.
- Background lembut dengan gradient dan bentuk awan.

### 3. Floating Feature Badges
Badge informatif di sekitar ilustrasi hero.

Badge yang dibuat:
- Eye Tracking.
- Bantuan Audio.
- Analisis Tulisan.
- Baca Adaptif.

Setiap badge mendukung:
- Icon dari folder asset lokal.
- Judul fitur.
- Deskripsi singkat.
- Tampilan hanya pada layar medium ke atas agar layout mobile tetap bersih.

### 4. Feature Cards
Section fitur menampilkan empat kartu utama.

Daftar kartu:
- Tri-Modal Screening.
- Smart Reader.
- Ringkasan Hasil.
- Integrasi Sekolah.

Setiap card memiliki:
- Ilustrasi.
- Judul.
- Deskripsi.
- Tombol `Pelajari lebih lanjut`.
- Warna tombol mengikuti tint gambar:
  - `#E7F1FC` untuk Tri-Modal Screening.
  - `#E9F5F3` untuk Smart Reader.
  - `#FEF7E7` untuk Ringkasan Hasil.
  - `#EEECFD` untuk Integrasi Sekolah.

### 5. Cara Kerja
Section ini menjelaskan alur penggunaan KIRANA dalam tiga langkah.

Langkah yang dibuat:
1. Tulis 3 kata.
2. Baca kalimat.
3. Dapatkan ringkasan.

Setiap langkah memiliki:
- Nomor langkah.
- Ilustrasi.
- Judul.
- Deskripsi.
- Connector dashed line pada desktop.

### 6. Section Integrasi Sekolah dan Kontak
Section ini digunakan untuk menjelaskan integrasi KIRANA dengan sekolah atau institusi.

Bagian kiri:
- Penjelasan manfaat integrasi.
- Card `Pelatihan Guru Bersertifikat`.
- Card `Dashboard Analitik Sekolah`.
- Ilustrasi landscape sekolah.

Bagian kanan:
- Form kerja sama.
- Input nama lengkap.
- Input nama sekolah atau institusi.
- Input email.
- Textarea pesan.
- Tombol `Kirim Permintaan`.

### 7. Footer
Footer sederhana berisi copyright:

```text
© 2026 KIRANA. Semua hak dilindungi.
```

## Struktur Asset

Semua asset landing page menggunakan base path:

```ts
const ASSET_BASE = "/figma/landing";
```

Asset yang digunakan:
- `real-logo.svg`
- `rocket.svg`
- `bobby.svg`
- `eye.svg`
- `headphone.svg`
- `pencil.svg`
- `book.svg`
- `card-trimodal.svg`
- `card-reader.svg`
- `card-report.svg`
- `card-school.svg`
- `step-write.svg`
- `step-read.svg`
- `step-report.svg`
- `college.svg`
- `stats.svg`
- `school-landscape.svg`

Lokasi asset:

```text
frontend/public/figma/landing/
```

## Tech Stack

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Next.js App Router
- `next/image` untuk asset gambar tertentu
- CSS utility class berbasis Tailwind

### Styling
- Tailwind CSS utility classes.
- Custom arbitrary values untuk:
  - Warna brand.
  - Shadow.
  - Border radius.
  - Gradient background.
  - Z-index fixed navbar.
- Font utama:
  - Plus Jakarta Sans.
  - Inter sebagai fallback.
  - System UI sebagai fallback terakhir.

### Routing
Landing page berada di:

```text
frontend/src/app/page.tsx
```

Route yang digunakan:
- `/` untuk landing page.
- `/screening` untuk CTA screening.
- `/smart-reader` untuk fitur Smart Reader.
- `#fitur` untuk section fitur.
- `#cara-kerja` untuk section cara kerja.
- `#kontak` untuk section kontak.

### Backend yang Sudah Ada di Project
Project juga memiliki backend FastAPI untuk fitur utama DyslexiAID/KIRANA.

Stack backend:
- FastAPI.
- Python.
- Pydantic.
- LangGraph.
- Whisper / faster-whisper.
- PyMuPDF.
- Sentence Transformers.
- YOLO / Ultralytics untuk handwriting analysis.

Endpoint backend yang relevan:
- `POST /api/pdf/extract`
- `POST /api/audio/transcribe`
- `POST /api/handwriting/analyze`
- `POST /api/diagnose`

## Catatan Implementasi

### Fixed Navbar
Navbar diletakkan langsung di dalam `<main>` dan di luar hero section agar tidak terjebak stacking context dari section lain.

Class penting:

```tsx
<div className="fixed inset-x-0 top-0 z-[9999] px-4 py-3 pointer-events-none sm:px-8">
```

Header navbar diberi `pointer-events-auto` agar link dan button tetap bisa diklik.

```tsx
<header className="pointer-events-auto ...">
```

### Scroll Offset
Section target anchor menggunakan `scroll-mt-28` agar ketika user klik navbar, judul section tidak tertutup oleh fixed navbar.

Contoh:

```tsx
<section id="fitur" className="scroll-mt-28">
```

### Responsiveness
Layout dibuat responsif:
- Mobile menggunakan layout satu kolom.
- Desktop menggunakan grid dua kolom pada hero.
- Feature cards berubah dari satu kolom ke dua kolom dan empat kolom.
- Floating badges hanya tampil pada breakpoint `md` ke atas.

## Cara Menjalankan

Masuk ke folder frontend:

```bash
cd frontend
```

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka browser:

```text
http://localhost:3000
```

## File Utama

```text
frontend/src/app/page.tsx
```

## Status

Landing page KIRANA sudah memiliki:
- Navbar fixed.
- Hero section.
- Floating badges.
- Feature card section.
- Cara kerja section.
- Integrasi sekolah section.
- Contact form.
- Footer.
- Asset lokal berbasis `/public/figma/landing`.
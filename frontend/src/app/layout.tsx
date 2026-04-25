import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kirana — Pendamping Belajar untuk Anak Disleksia",
  description: "Deteksi disleksia dan membaca adaptif untuk anak SD kelas 1–3 Indonesia",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-white text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
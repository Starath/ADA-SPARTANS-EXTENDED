"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

function KiranaLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <polygon points="11,2 13.5,8 20,8 14.5,12.5 16.5,19 11,15 5.5,19 7.5,12.5 2,8 8.5,8" fill="#5AC8C8" />
      </svg>
      <span className="font-bold text-lg text-slate-800 tracking-tight">KIRANA</span>
    </div>
  );
}

function FontToggle({ dyslexic, onToggle }: { dyslexic: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-full px-1 py-1">
      <button
        onClick={!dyslexic ? undefined : onToggle}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
          !dyslexic ? "bg-white text-slate-700 shadow-sm" : "text-slate-400"
        }`}
      >
        Aa
      </button>
      <button
        onClick={dyslexic ? undefined : onToggle}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
          dyslexic ? "bg-white text-slate-700 shadow-sm" : "text-slate-400"
        }`}
        style={{ fontFamily: "OpenDyslexic, Arial, sans-serif" }}
      >
        Aa
      </button>
    </div>
  );
}

export default function HomePage() {
  const [dyslexicFont, setDyslexicFont] = useState(false);

  useEffect(() => {
    const body = document.body;
    if (dyslexicFont) {
      body.style.fontFamily = "OpenDyslexic, Arial, sans-serif";
    } else {
      body.style.fontFamily = "";
    }
  }, [dyslexicFont]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <KiranaLogo />
          <FontToggle dyslexic={dyslexicFont} onToggle={() => setDyslexicFont((v) => !v)} />
        </div>
      </nav>

      {/* Hero section */}
      <section
        className="pt-20 pb-24 px-6 text-center"
        style={{ background: "linear-gradient(160deg, #d4f0f0 0%, #e8f7f7 40%, #f0fafa 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight mt-10">
            5 Juta Anak Indonesia Berisiko<br />Tertinggal Karena Disleksia
          </h1>
          <p className="mt-4 text-slate-600 text-base max-w-md mx-auto leading-relaxed">
            Kami percaya setiap anak memiliki cara belajar yang unik. Temukan potensi
            mereka lebih awal dengan deteksi cerdas dan dukungan personal yang
            menyenangkan.
          </p>
          <div className="mt-8">
            <Link href="/screening" className="btn-primary">
              🚀 Ayo Mulai Petualangannya
            </Link>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 px-6 bg-white flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-800">Mengenali Tanpa Menghakimi</h2>
            <p className="mt-2 text-slate-500 text-sm">
              Teknologi kami dirancang seperti taman bermain, bukan ruang ujian.<br />
              Mengurangi kecemasan dan memaksimalkan hasil.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Tri-Modal Screening card */}
            <div className="rounded-2xl p-6 border border-[#c8e8e8] bg-[#f0fafa] flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#5AC8C8] text-lg">👁</span>
                <h3 className="font-bold text-slate-800">Tri-Modal Screening</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed flex-1">
                Evaluasi menyeluruh melalui interaksi visual, pendeteksi suara
                otomatis, dan panduan pelacakan visual yang dikemas dalam mini-game
                menyenangkan.
              </p>
              <div className="mt-5">
                <Link
                  href="/screening"
                  className="inline-flex items-center gap-1.5 bg-[#5AC8C8] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#4ab8b8] transition-colors"
                >
                  Tes Sekarang →
                </Link>
              </div>
            </div>

            {/* Smart Reader card */}
            <div className="rounded-2xl p-6 border border-[#e8ddd0] bg-[#faf7f2] flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-6 text-2xl opacity-30">✦</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-400 text-lg">📖</span>
                <h3 className="font-bold text-slate-800">Smart Reader</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed flex-1">
                Modul membaca dengan penyesuaian spasi, warna latar, dan panduan
                pelacakan visual yang dirancang khusus untuk mata anak disleksia.
              </p>
              <div className="mt-5">
                <Link
                  href="/smart-reader"
                  className="inline-flex items-center gap-1.5 bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-slate-600 transition-colors"
                >
                  Tes Sekarang →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <KiranaLogo />
          <p className="text-xs text-slate-400">
            © 2024 DyslexiAID Indonesia. Pendamping Belajar dengan Kasih Sayang.
          </p>
          <nav className="flex items-center gap-4 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-600">Kebijakan Privasi</a>
            <a href="#" className="hover:text-slate-600">Syarat Ketentuan</a>
            <a href="#" className="hover:text-slate-600">Pusat Bantuan</a>
            <a href="#" className="hover:text-slate-600">LMS Integrasi</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

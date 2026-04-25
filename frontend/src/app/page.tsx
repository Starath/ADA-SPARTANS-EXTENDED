import Link from "next/link";
import Image from "next/image";

const ASSET_BASE = "/figma/landing";

const featureCards = [
  {
    title: "Tri-Modal Screening",
    description:
      "Gabungkan analisis tulisan tangan, pembacaan teks, dan eye-tracking untuk hasil yang komprehensif.",
    image: `${ASSET_BASE}/card-trimodal.svg`,
    href: "/screening",
    tint: "#E7F1FC",
    tintBorder: "#b8e0f0",
  },
  {
    title: "Smart Reader",
    description:
      "Materi bacaan adaptif dengan panduan audio dan visual yang mendukung pemahaman.",
    image: `${ASSET_BASE}/card-reader.svg`,
    href: "/smart-reader",
    tint: "#E9F5F3",
    tintBorder: "#cfdcda",
  },
  {
    title: "Ringkasan Hasil",
    description:
      "Ringkasan risiko sederhana dan rekomendasi langkah selanjutnya yang mudah dipahami.",
    image: `${ASSET_BASE}/card-report.svg`,
    href: "/report",
    tint: "#FEF7E7",
    tintBorder: "#e1dbcc",
  },
  {
    title: "Integrasi Sekolah",
    description:
      "Terhubung dengan LMS sekolah dan workflow guru untuk proses asesmen yang efisien.",
    image: `${ASSET_BASE}/card-school.svg`,
    href: "#kontak",
    tint: "#EEECFD",
    tintBorder: "#dbd9eb",
  },
];

const steps = [
  {
    number: "1",
    title: "Tulis 3 kata",
    description: "Anak menulis tiga kata sederhana untuk dianalisis bentuk huruf dan ejaannya.",
    image: `${ASSET_BASE}/step-write.svg`,
  },
  {
    number: "2",
    title: "Baca kalimat",
    description: "Anak membaca beberapa kalimat. Sistem menganalisis pola baca dan pemahaman.",
    image: `${ASSET_BASE}/step-read.svg`,
  },
  {
    number: "3",
    title: "Dapatkan ringkasan",
    description: "Terima ringkasan risiko dan rekomendasi langkah lanjut dalam beberapa menit.",
    image: `${ASSET_BASE}/step-report.svg`,
  },
];

function KiranaLogo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Kirana Home">
      <Image src={`${ASSET_BASE}/real-logo.svg`} alt="Kirana Logo" width={151} height={35} />
    </Link>
  );
}

function FloatingBadge({
  className,
  icon,
  title,
  description,
}: {
  className: string;
  icon: string;
  title: string;
  description: string;
}) {
  const isImageIcon = icon.startsWith("/") || icon.startsWith("http");

  return (
    <div
      className={`absolute z-30 hidden items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(27,58,121,0.12)] ring-1 ring-[#d8e7f4] backdrop-blur md:flex ${className}`}
    >
      {isImageIcon ? (
        <img src={icon} alt="" className="size-8 object-contain" />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-[#edf5ff] text-lg text-[#1b3a79]">
          {icon}
        </span>
      )}

      <span>
        <span className="block text-sm font-extrabold leading-tight text-[#1b2b5e]">
          {title}
        </span>
        <span className="block text-[11px] leading-tight text-[#788296]">
          {description}
        </span>
      </span>
    </div>
  );
}

function FeatureCard({ card }: { card: (typeof featureCards)[number] }) {
  return (
    <article className="group overflow-hidden rounded-[22px] border border-[#d9e5ef] bg-white/[0.92] shadow-[0_8px_28px_rgba(27,58,121,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(27,58,121,0.12)]">
      <div className="h-40 overflow-hidden bg-[#edf1f5]">
        <img src={card.image} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="space-y-3 px-5 pb-5 pt-4">
        <h3 className="text-[17px] font-extrabold text-[#1b2b5e]">{card.title}</h3>
        <p className="min-h-[58px] text-sm leading-relaxed text-[#617087]">
          {card.description}
        </p>

        <Link
          href={card.href}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold text-[#31517d] transition hover:-translate-y-0.5"
          style={{ backgroundColor: card.tint, borderColor: card.tintBorder }}
        >
          Pelajari lebih lanjut
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function StepItem({ step, isLast }: { step: (typeof steps)[number]; isLast: boolean }) {
  return (
    <li className="relative flex flex-1 flex-col items-center text-center md:flex-row md:text-left">
      <div className="relative z-10 flex w-full flex-col items-center gap-4 rounded-3xl bg-white/50 p-4 md:flex-row md:bg-transparent md:p-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#4d86cf] text-base font-extrabold text-white shadow-[0_8px_20px_rgba(77,134,207,0.35)]">
          {step.number}
        </span>

        <img src={step.image} alt="" className="h-24 w-24 rounded-2xl object-cover" />

        <div className="max-w-[220px]">
          <h3 className="text-sm font-extrabold text-[#1b2b5e]">{step.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#617087]">{step.description}</p>
        </div>
      </div>

      {!isLast && (
        <div className="absolute right-[-18px] top-1/2 hidden w-16 -translate-y-1/2 border-t border-dashed border-[#9ebde3] md:block" />
      )}
    </li>
  );
}

function FixedNavbar() {
  return (
    <div className="fixed inset-x-0 top-0 z-[9999] px-4 py-3 pointer-events-none sm:px-8">
      <header className="pointer-events-auto mx-auto flex max-w-[1078px] items-center justify-between rounded-[26px] bg-white/95 px-5 py-4 shadow-[0_12px_40px_rgba(27,58,121,0.14)] ring-1 ring-white/70 backdrop-blur-md sm:px-8">
        <KiranaLogo />

        <nav className="hidden items-center gap-10 text-sm font-medium text-[#444] md:flex">
          <a href="#fitur" className="transition hover:text-[#1b3a79]">
            Fitur
          </a>
          <a href="#cara-kerja" className="transition hover:text-[#1b3a79]">
            Cara Kerja
          </a>
          <a href="#kontak" className="transition hover:text-[#1b3a79]">
            Kontak
          </a>
        </nav>

        <Link
          href="/screening"
          className="rounded-xl bg-[#152b64] px-4 py-3 text-[11px] font-extrabold text-white shadow-[0_8px_18px_rgba(21,43,100,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1f3d86] sm:px-5 sm:text-sm"
        >
          Mulai Screening →
        </Link>
      </header>
    </div>
  );
}

export default function HomePage() {
  return (
      <main
        className="min-h-screen overflow-hidden bg-[#eef8ff] text-[#1b2b5e]"
        style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}
        data-node-id="274:21278"
        data-name="Landing Page"
      >
      <FixedNavbar />

      <section
          className="relative isolate px-4 pb-10 pt-28 sm:px-7 sm:pt-32 lg:px-10"
          style={{
            backgroundImage: "url('/figma/background.svg')",
            backgroundSize: "cover",
            backgroundPosition: "top center",
            backgroundRepeat: "no-repeat",
          }}
        >
        <div className="mx-auto max-w-7xl">
          <div className="grid min-h-[520px] items-center gap-12 pb-10 pt-4 lg:grid-cols-[0.92fr_1.08fr] lg:pt-8">
            <div className="max-w-2xl">
              <h1 className="text-[42px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1b2b5e] sm:text-[56px] lg:text-[64px]">
                Deteksi dini disleksia dengan pengalaman belajar yang{" "}
                <span className="text-[#00bfa5] underline decoration-[#00bfa5] decoration-4 underline-offset-[8px]">
                  ramah anak
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-[#5c677a] sm:text-lg">
                Kirana membantu sekolah, orang tua, dan pendidik mengidentifikasi kesulitan
                membaca sejak awal melalui AI adaptif, analisis tulisan, dan dukungan eye-tracking.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/screening"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[#152b64] px-7 text-sm font-extrabold text-white shadow-[0_14px_26px_rgba(21,43,100,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1f3d86]"
                >
                  <Image
                    src={`${ASSET_BASE}/rocket.svg`}
                    alt=""
                    width={20}
                    height={20}
                  />
                  Mulai Screening
                </Link>

                <a
                  href="#cara-kerja"
                  className="inline-flex h-14 items-center justify-center rounded-xl border border-[#b8c7d7] bg-white px-8 text-sm font-extrabold text-[#1b2b5e] shadow-[0_8px_20px_rgba(27,58,121,0.06)] transition hover:-translate-y-0.5 hover:bg-[#f7fbff]"
                >
                  Lihat Cara Kerja
                </a>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[540px]">
              <div className="absolute left-1/2 top-[55%] size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4ded4] sm:size-[470px]" />

              <img
                src={`${ASSET_BASE}/bobby.svg`}
                alt="Ilustrasi anak membaca"
                className="relative z-10 mx-auto h-[420px] w-full max-w-[500px] object-contain sm:h-[520px]"
              />

              <FloatingBadge
                className="left-[2%] top-[14%]"
                icon={`${ASSET_BASE}/eye.svg`}
                title="Eye Tracking"
                description="Fokus & pola baca"
              />

              <FloatingBadge
                className="right-[1%] top-[18%]"
                icon={`${ASSET_BASE}/headphone.svg`}
                title="Bantuan Audio"
                description="Membaca lebih mudah"
              />

              <FloatingBadge
                className="left-[0%] top-[56%]"
                icon={`${ASSET_BASE}/pencil.svg`}
                title="Analisis Tulisan"
                description="Bentuk huruf & ejaan"
              />

              <FloatingBadge
                className="right-[4%] top-[42%]"
                icon={`${ASSET_BASE}/book.svg`}
                title="Baca Adaptif"
                description="Materi sesuai kebutuhan"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="relative bg-white px-4 py-8 sm:px-7 lg:px-10 scroll-mt-28">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="bg-white px-4 pb-12 pt-3 sm:px-7 lg:px-10 scroll-mt-28">
        <div className="mx-auto max-w-6xl rounded-[30px] bg-[linear-gradient(180deg,#ffffff_0%,#f3faff_100%)] px-5 py-8">
          <div className="text-center">
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.02em] text-[#1b2b5e] sm:text-4xl">
              Cara Kerja
            </h2>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <StepItem key={step.title} step={step} isLast={index === steps.length - 1} />
            ))}
          </ol>
        </div>
      </section>

      <section
        id="kontak"
        className="bg-[linear-gradient(180deg,#ffffff_0%,#eef8ff_100%)] px-4 pb-12 sm:px-7 lg:px-10 scroll-mt-28"
      >
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[30px] border border-[#d9e7f3] bg-white shadow-[0_16px_44px_rgba(27,58,121,0.08)] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[430px] overflow-hidden bg-[linear-gradient(180deg,#e9f7ff_0%,#f7fcff_58%,#eef8ee_100%)] px-7 py-10 sm:px-12">
            <div className="relative z-10 max-w-xl">
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.03em] text-[#1b2b5e] sm:text-4xl">
                Bantu lebih banyak siswa dengan integrasi yang mudah.
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-[#617087]">
                DyslexiAID terintegrasi dengan LMS sekolah dan menyediakan dashboard analitik
                untuk memantau perkembangan siswa secara menyeluruh dan aman.
              </p>

              <div className="mt-8 grid max-w-md gap-4">
                <div className="flex items-start gap-4 rounded-2xl bg-white/[0.88] p-4 shadow-sm ring-1 ring-[#dceaf5]">
                  <Image
                    src={`${ASSET_BASE}/college.svg`}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-xl bg-[#edf7ff] p-2"
                  />

                  <div>
                    <h3 className="text-sm font-extrabold text-[#1b2b5e]">
                      Pelatihan Guru Bersertifikat
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#617087]">
                      Tingkatkan kompetensi guru dalam memahami disleksia.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl bg-white/[0.88] p-4 shadow-sm ring-1 ring-[#dceaf5]">
                  <Image
                    src={`${ASSET_BASE}/stats.svg`}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-xl bg-[#edf7ff] p-2"
                  />

                  <div>
                    <h3 className="text-sm font-extrabold text-[#1b2b5e]">
                      Dashboard Analitik Sekolah
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#617087]">
                      Pantau hasil screening, perkembangan, dan intervensi siswa.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <img
              src={`${ASSET_BASE}/school-landscape.svg`}
              alt=""
              className="absolute bottom-0 left-0 h-40 w-full object-cover opacity-90"
            />
          </div>

          <div className="bg-white px-7 py-10 sm:px-12">
            <h2 className="text-2xl font-extrabold text-[#1b2b5e]">
              Tertarik bekerja sama dengan kami?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#617087]">
              Isi formulir berikut dan tim kami akan segera menghubungi Anda.
            </p>

            <form className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#617087]">
                  Nama Lengkap
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-[#d8e2ec] px-3 text-sm outline-none transition placeholder:text-[#b3bcc8] focus:border-[#3f84d8] focus:ring-4 focus:ring-[#ddecff]"
                    placeholder="Contoh: Budi Santoso"
                  />
                </label>

                <label className="block text-xs font-bold text-[#617087]">
                  Nama Sekolah / Institusi
                  <input
                    className="mt-2 h-10 w-full rounded-xl border border-[#d8e2ec] px-3 text-sm outline-none transition placeholder:text-[#b3bcc8] focus:border-[#3f84d8] focus:ring-4 focus:ring-[#ddecff]"
                    placeholder="Contoh: SD Negeri 1 Jakarta"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-[#617087]">
                Email
                <input
                  type="email"
                  className="mt-2 h-10 w-full rounded-xl border border-[#d8e2ec] px-3 text-sm outline-none transition placeholder:text-[#b3bcc8] focus:border-[#3f84d8] focus:ring-4 focus:ring-[#ddecff]"
                  placeholder="Contoh: budi@sekolah.edu"
                />
              </label>

              <label className="block text-xs font-bold text-[#617087]">
                Pesan
                <textarea
                  className="mt-2 min-h-[112px] w-full rounded-xl border border-[#d8e2ec] px-3 py-3 text-sm outline-none transition placeholder:text-[#b3bcc8] focus:border-[#3f84d8] focus:ring-4 focus:ring-[#ddecff]"
                  placeholder="Ceritakan bagaimana kami bisa membantu sekolah Anda..."
                />
              </label>

              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#152b64] text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(21,43,100,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1f3d86]"
              >
                Kirim Permintaan
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="bg-[#eef3fb] px-4 py-8 text-center text-sm text-[#8d93a1] sm:px-7 lg:px-10">
        © 2026 KIRANA. Semua hak dilindungi.
      </footer>
    </main>
  );
}
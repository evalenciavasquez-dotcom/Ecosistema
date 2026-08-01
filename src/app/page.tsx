import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Panel — Eduardo",
  description: "Puerta de entrada privada a C.C.O. E.V. y VINCERE.",
};

// Recreación en SVG del logo real de VINCERE (Eduardo lo pasó como imagen,
// pero no llegó como archivo utilizable) — la V con la muesca bordó y el
// wordmark, sobre el mismo verde oliva oscuro de la marca original.
function VincereLogo() {
  return (
    <svg viewBox="0 0 340 210" className="w-full h-auto rounded-xl" role="img" aria-label="VINCERE Music">
      <rect width="340" height="210" rx="14" fill="#2b2f28" />
      <polygon points="138,44 168,44 170,112" fill="#f2ede1" />
      <polygon points="202,44 172,44 170,112" fill="#f2ede1" />
      <polygon points="167,44 173,44 170,60" fill="#7c2430" />
      <text
        x="170"
        y="146"
        textAnchor="middle"
        fontFamily="var(--font-sans), Arial, sans-serif"
        fontSize="26"
        fontWeight="500"
        letterSpacing="6"
        fill="#f2ede1"
      >
        VINCERE
      </text>
      <line x1="132" y1="171" x2="150" y2="171" stroke="#f2ede1" strokeWidth="1" opacity="0.7" />
      <text
        x="170"
        y="175"
        textAnchor="middle"
        fontFamily="var(--font-sans), Arial, sans-serif"
        fontSize="10"
        letterSpacing="3"
        fill="#f2ede1"
        opacity="0.85"
      >
        MUSIC
      </text>
      <line x1="190" y1="171" x2="208" y2="171" stroke="#f2ede1" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

const SISTEMAS: {
  href: string;
  nombre: string;
  icono: string | null;
  logo: React.ReactNode | null;
  tagline: string | null;
  detalle: string;
  accent: string;
  accentDim: string;
}[] = [
  {
    href: "/inicio",
    nombre: "C.C.O. E.V.",
    icono: "/icons/icon-192.png",
    logo: null,
    tagline: "Centro de Control Operativo y Estratégico",
    detalle: "Proyectos, decisiones, economía y goals — tu realidad analizada.",
    accent: "#5b8dee",
    accentDim: "rgba(91, 141, 238, 0.14)",
  },
  {
    href: "/vincere",
    nombre: "VINCERE",
    icono: null,
    logo: <VincereLogo />,
    tagline: null,
    detalle: "Dirección estratégica musical — A&R, touring, marca y oportunidad.",
    accent: "#a13a44",
    accentDim: "rgba(161, 58, 68, 0.16)",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[#08090c] text-[#f2f2f0] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#6b6f78]">Panel privado</div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-medium tracking-tight text-[#f2f2f0]">Eduardo</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SISTEMAS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 transition-all hover:border-white/[0.16] hover:bg-white/[0.04]"
              >
                <div
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: s.accentDim }}
                  aria-hidden
                />
                <div className="relative">
                  {s.logo ? (
                    <div className="w-40 max-w-full mb-1">{s.logo}</div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {s.icono && (
                        <Image src={s.icono} alt="" width={36} height={36} className="rounded-[9px] shrink-0" />
                      )}
                      <div className="text-[26px] leading-none font-sans font-bold tracking-tight" style={{ color: s.accent }}>
                        {s.nombre}
                      </div>
                    </div>
                  )}
                  {s.tagline && (
                    <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#8a8d94]">{s.tagline}</div>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-[#b4b6bc]">{s.detalle}</p>
                  <div
                    className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium transition-transform group-hover:translate-x-0.5"
                    style={{ color: s.accent }}
                  >
                    Entrar
                    <span aria-hidden>→</span>
                  </div>
                </div>
              </Link>
            ))}

            <div className="relative rounded-2xl border border-dashed border-white/[0.08] p-7 flex flex-col justify-center items-start">
              <div className="text-[26px] leading-none font-sans font-bold tracking-tight text-[#4a4d54]">···</div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-[#5a5d64]">Próximamente</div>
              <p className="mt-4 text-sm leading-relaxed text-[#5a5d64]">El próximo sistema aparece aquí.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-8 text-center text-[11px] text-[#4a4d54]">Acceso privado — un solo usuario</div>
    </div>
  );
}

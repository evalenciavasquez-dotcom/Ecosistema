"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnalysisPanelBody } from "./AIPanel";

const TABS = [
  { code: "IN", label: "Inicio", href: "/" },
  { code: "BA", label: "Bandeja", href: "/bandeja" },
  { code: "PR", label: "Proyectos", href: "/proyectos" },
  { code: "DE", label: "Decisiones", href: "/decisiones" },
];

const MORE_ITEMS = [
  { code: "AC", label: "Acciones", href: "/acciones" },
  { code: "EC", label: "Economía", href: "/economia" },
  { code: "ES", label: "Estadísticas", href: "/estadisticas" },
  { code: "EV", label: "Evidencias", href: "/evidencias" },
  { code: "CO", label: "Configuración", href: "/configuracion" },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const moreActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  return (
    <>
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border-subtle bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => {
                setSheetOpen(false);
                setAnalysisOpen(false);
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                active ? "text-accent-blue font-semibold" : "text-muted"
              }`}
            >
              <span
                className={`flex h-6 w-9 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${
                  active ? "bg-accent-blue/20 text-accent-blue" : "bg-overlay/5"
                }`}
              >
                {tab.code}
              </span>
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={() => {
            setSheetOpen((v) => !v);
            setAnalysisOpen(false);
          }}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
            moreActive || sheetOpen ? "text-accent-blue font-semibold" : "text-muted"
          }`}
        >
          <span
            className={`flex h-6 w-9 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${
              moreActive || sheetOpen ? "bg-accent-blue/20 text-accent-blue" : "bg-overlay/5"
            }`}
          >
            •••
          </span>
          Más
        </button>
      </nav>

      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border-subtle bg-surface-2 p-4 pb-24"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-overlay/20" />
            <div className="grid grid-cols-2 gap-2">
              {MORE_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                      active ? "bg-surface text-foreground font-medium" : "text-muted bg-surface/60"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-8 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${
                        active ? "bg-accent-blue/20 text-accent-blue" : "bg-overlay/5"
                      }`}
                    >
                      {item.code}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <a
              href="/vincere"
              onClick={() => setSheetOpen(false)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl bg-accent-red/15 px-3 py-3 text-sm font-medium text-accent-red"
            >
              <span className="flex h-6 w-8 items-center justify-center rounded-md bg-accent-red/20 text-[10px] font-bold tracking-wide">
                VI
              </span>
              VINCERE Intelligence Platform
            </a>
            <button
              onClick={() => {
                setSheetOpen(false);
                setAnalysisOpen(true);
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-xl bg-accent-blue/15 px-3 py-3 text-sm font-medium text-accent-blue"
            >
              <span className="flex h-6 w-8 items-center justify-center rounded-md bg-accent-blue/20 text-[10px] font-bold tracking-wide">
                IA
              </span>
              Motor de análisis estratégico
            </button>
          </div>
        </div>
      )}

      {analysisOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Motor de análisis estratégico</div>
              <div className="text-xs text-muted mt-0.5">El núcleo — presente en todo momento</div>
            </div>
            <button
              onClick={() => setAnalysisOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <AnalysisPanelBody />
        </div>
      )}
    </>
  );
}

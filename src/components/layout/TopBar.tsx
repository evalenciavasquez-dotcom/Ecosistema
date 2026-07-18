"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import TimerChip from "@/components/TimerChip";

const TITLES: Record<string, string> = {
  "/": "Inicio",
  "/bandeja": "Bandeja de entrada",
  "/proyectos": "Proyectos",
  "/acciones": "Acciones",
  "/decisiones": "Decisiones",
  "/economia": "Economía",
  "/estadisticas": "Estadísticas",
  "/evidencias": "Evidencias",
  "/configuracion": "Configuración",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "C.C.O. E.V.";
}

interface SearchResult {
  id: string;
  tipo: string;
  texto: string;
  href: string;
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const proyectos = useAppStore((s) => s.proyectos);
  const acciones = useAppStore((s) => s.acciones);
  const decisiones = useAppStore((s) => s.decisiones);
  const personas = useAppStore((s) => s.personas);
  const evidencias = useAppStore((s) => s.evidencias);

  const dateLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, []);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];
    proyectos
      .filter((p) => p.nombre.toLowerCase().includes(q) || p.objetivo.toLowerCase().includes(q))
      .forEach((p) => out.push({ id: p.id, tipo: "Proyecto", texto: p.nombre, href: "/proyectos" }));
    acciones
      .filter((a) => a.titulo.toLowerCase().includes(q))
      .forEach((a) => out.push({ id: a.id, tipo: "Acción", texto: a.titulo, href: "/acciones" }));
    decisiones
      .filter((d) => d.pregunta.toLowerCase().includes(q))
      .forEach((d) => out.push({ id: d.id, tipo: "Decisión", texto: d.pregunta, href: "/decisiones" }));
    personas
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .forEach((p) => out.push({ id: p.id, tipo: "Persona", texto: `${p.nombre} — ${p.empresaProyecto}`, href: "/proyectos" }));
    evidencias
      .filter((e) => e.afirmacionRespaldada.toLowerCase().includes(q))
      .forEach((e) => out.push({ id: e.id, tipo: "Evidencia", texto: e.afirmacionRespaldada, href: "/evidencias" }));
    return out.slice(0, 8);
  }, [query, proyectos, acciones, decisiones, personas, evidencias]);

  return (
    <header className="relative flex items-center justify-between gap-3 border-b border-border-subtle bg-background px-4 py-3 md:px-6 md:py-4">
      <div className="min-w-0">
        <div className="text-xs text-muted truncate">{dateLabel}</div>
        <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{titleFor(pathname)}</h1>
      </div>
      <TimerChip />
      <div className="relative w-36 sm:w-56 md:w-72 shrink-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue transition-colors"
        />
        {results.length > 0 && (
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] md:w-96 rounded-xl border border-border-subtle bg-surface-2 shadow-xl overflow-hidden">
            {results.map((r) => (
              <button
                key={`${r.tipo}-${r.id}`}
                onClick={() => {
                  router.push(r.href);
                  setQuery("");
                }}
                className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors"
              >
                <span className="text-[10px] uppercase tracking-wide text-muted mt-0.5 shrink-0">{r.tipo}</span>
                <span className="truncate">{r.texto}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

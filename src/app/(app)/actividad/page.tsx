"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { HistorialEntry } from "@/lib/types";

const TIPO_LABEL: Record<string, string> = {
  proyecto: "Proyecto",
  accion: "Acción",
  decision: "Decisión",
  economia: "Movimiento económico",
  evidencia: "Evidencia",
  bandeja: "Bandeja",
  persona: "Persona",
  agenda: "Agenda",
  tiempo: "Tiempo",
};

export default function ActividadPage() {
  const historial = useAppStore((s) => s.historial);
  const [filtroTipo, setFiltroTipo] = useState<string>("Todos");
  const [filtroAutor, setFiltroAutor] = useState<string>("Todos");

  const tipos = useMemo(
    () => ["Todos", ...Array.from(new Set(historial.map((h) => h.entidadTipo)))],
    [historial]
  );

  const visibles = historial.filter(
    (h) =>
      (filtroTipo === "Todos" || h.entidadTipo === filtroTipo) &&
      (filtroAutor === "Todos" || h.autor === filtroAutor)
  );

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted">
        Cada cambio queda auditado con quién lo hizo y, cuando aplica, los valores antes y después.
      </p>

      <div className="flex flex-wrap gap-2">
        {tipos.map((t) => (
          <button
            key={t}
            onClick={() => setFiltroTipo(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              filtroTipo === t
                ? "bg-surface-2 border-accent-blue text-foreground"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {TIPO_LABEL[t] ?? t}
          </button>
        ))}
        <span className="mx-1 text-border-subtle">|</span>
        {["Todos", "usuario", "ia"].map((a) => (
          <button
            key={a}
            onClick={() => setFiltroAutor(a)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              filtroAutor === a
                ? "bg-surface-2 border-accent-blue text-foreground"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {a === "Todos" ? "Todos" : a === "ia" ? "IA" : "Eduardo"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visibles.length === 0 && <p className="text-sm text-muted">Sin actividad en este filtro.</p>}
        {visibles.map((h) => (
          <HistorialCard key={h.id} entry={h} />
        ))}
      </div>
    </div>
  );
}

function HistorialCard({ entry }: { entry: HistorialEntry }) {
  const tieneDiff = entry.antes || entry.despues;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {TIPO_LABEL[entry.entidadTipo] ?? entry.entidadTipo}
          </span>
          <p className="text-sm mt-0.5">{entry.cambio}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              entry.autor === "ia" ? "bg-accent-blue/15 text-accent-blue" : "bg-surface-2 text-muted"
            }`}
          >
            {entry.autor === "ia" ? "IA" : "Eduardo"}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-muted mt-1.5">
        {new Date(entry.timestamp).toLocaleString("es-ES", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      {tieneDiff && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer select-none text-muted">Ver antes / después</summary>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {entry.antes && (
              <div className="rounded-lg bg-surface-2 p-2">
                <div className="text-[10px] uppercase tracking-wide text-accent-red mb-1">Antes</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] text-muted">
                  {JSON.stringify(entry.antes, null, 2)}
                </pre>
              </div>
            )}
            {entry.despues && (
              <div className="rounded-lg bg-surface-2 p-2">
                <div className="text-[10px] uppercase tracking-wide text-accent-green mb-1">Después</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] text-muted">
                  {JSON.stringify(entry.despues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

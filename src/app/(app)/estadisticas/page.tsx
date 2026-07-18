"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { computeProjectKpis, KpiTile, KpiTone } from "@/lib/kpis";
import { ProyectoEstadoBadge, PrioridadBadge } from "@/components/ui/badges";
import { Proyecto } from "@/lib/types";

const TONE_CLASSES: Record<NonNullable<KpiTone> | "default", string> = {
  green: "text-accent-green",
  amber: "text-accent-amber",
  red: "text-accent-red",
  default: "text-foreground",
};

export default function EstadisticasPage() {
  const proyectos = useAppStore((s) => s.proyectos);
  const acciones = useAppStore((s) => s.acciones);
  const decisiones = useAppStore((s) => s.decisiones);
  const evidencias = useAppStore((s) => s.evidencias);
  const movimientos = useAppStore((s) => s.movimientos);
  const tiempo = useAppStore((s) => s.tiempo);
  const historial = useAppStore((s) => s.historial);

  const [soloActivos, setSoloActivos] = useState(true);

  const visibles = proyectos.filter((p) =>
    soloActivos ? p.estado !== "Cerrado" && p.estado !== "Descartado" : true
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted max-w-md">
          Cada proyecto muestra solo los indicadores que sus datos sustentan — si no hay tiempo
          registrado, no hay tile de tiempo; si no hay movimientos, no hay balance.
        </p>
        <button
          onClick={() => setSoloActivos((v) => !v)}
          className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-xs shrink-0"
        >
          {soloActivos ? "Mostrar cerrados/descartados" : "Solo activos"}
        </button>
      </div>

      {visibles.length === 0 && <p className="text-sm text-muted">No hay proyectos para mostrar.</p>}

      <div className="space-y-4">
        {visibles.map((p) => (
          <ProyectoKpiCard
            key={p.id}
            proyecto={p}
            tiles={computeProjectKpis(p, acciones, decisiones, evidencias, movimientos, tiempo, historial)}
          />
        ))}
      </div>
    </div>
  );
}

function ProyectoKpiCard({ proyecto, tiles }: { proyecto: Proyecto; tiles: KpiTile[] }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-semibold">{proyecto.nombre}</div>
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{proyecto.objetivo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PrioridadBadge prioridad={proyecto.prioridad} />
          <ProyectoEstadoBadge estado={proyecto.estado} />
        </div>
      </div>

      {tiles.length === 0 ? (
        <p className="text-xs text-muted">
          Todavía sin datos suficientes — registra acciones, tiempo o movimientos en este proyecto
          para ver indicadores.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <div key={t.key} className="rounded-xl bg-surface-2 border border-border-subtle p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted">{t.label}</div>
              <div className={`text-lg font-bold mt-1 tabular-nums ${TONE_CLASSES[t.tone ?? "default"]}`}>
                {t.value}
              </div>
              {t.sub && <div className="text-[11px] text-muted mt-0.5">{t.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

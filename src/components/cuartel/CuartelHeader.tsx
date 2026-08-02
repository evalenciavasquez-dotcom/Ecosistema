"use client";

import Link from "next/link";
import { useCuartelStore } from "@/lib/cuartel/store";
import { useCuartelSync } from "./CuartelHydration";

// Honestidad de estado (PRD §14): el indicador dice dónde quedó la data de
// verdad. "Guardado" solo aparece cuando la escritura ocurrió; si falló, lo
// dice — nunca se muestra un guardado que no pasó.
const SYNC_TEXTO: Record<string, { label: string; color: string; title: string }> = {
  sincronizado: {
    label: "Guardado",
    color: "#5cc98e",
    title: "Los escenarios se están guardando en la base, en tablas propias del Cuartel",
  },
  local: {
    label: "Solo este dispositivo",
    color: "#e0a83a",
    title: "Sin base de datos configurada: los escenarios viven en el navegador de este dispositivo",
  },
  error: {
    label: "Sin guardar",
    color: "#e0483a",
    title: "No se pudo guardar en la base. La copia del navegador sigue intacta y se reintenta al próximo cambio",
  },
  desconocido: { label: "Conectando…", color: "#6e675c", title: "Comprobando dónde se guarda la data" },
};

function SyncIndicator() {
  const estado = useCuartelSync();
  const info = SYNC_TEXTO[estado] ?? SYNC_TEXTO.desconocido;
  return (
    <span className="cua-mono flex items-center gap-1.5 text-[11px]" style={{ color: info.color }} title={info.title}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
      {info.label}
    </span>
  );
}

export default function CuartelHeader() {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const activos = escenarios.filter((e) => e.estado === "activo" || e.estado === "analisis").length;

  return (
    <header
      className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 md:px-8"
      style={{ borderBottom: "1px solid var(--cua-border)", background: "var(--cua-surface)" }}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-lg">
          🪖
        </span>
        <div>
          <div className="cua-serif text-[17px] leading-none">El Cuartel de mis Decisiones</div>
          <div className="cua-faint cua-mono mt-1.5 text-[10.5px] uppercase tracking-[0.12em]">
            Ningún escenario se decide sin ver las 3 rutas completas
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="cua-mono text-[11px]" style={{ color: "var(--cua-muted)" }}>
          {activos} abierto{activos === 1 ? "" : "s"}
        </span>
        <SyncIndicator />
        <Link href="/" className="cua-mono text-[11px]" style={{ color: "var(--cua-faint)" }}>
          ← Panel
        </Link>
      </div>
    </header>
  );
}

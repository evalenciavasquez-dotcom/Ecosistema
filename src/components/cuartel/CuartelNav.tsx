"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import { CUARTEL_SECCION_LABEL, CuartelSeccion } from "@/lib/cuartel/types";
import { useCuartelSync } from "./CuartelHydration";

const SECCIONES: CuartelSeccion[] = ["inicio", "escenarios", "historial", "metodo"];

// Honestidad de estado (PRD §14): dice dónde quedó la data de verdad. Un
// guardado que no ocurrió nunca se muestra como si hubiera ocurrido.
const SYNC_TEXTO: Record<string, { label: string; color: string; title: string }> = {
  sincronizado: {
    label: "Guardado en la base",
    color: "var(--cua-verde)",
    title: "Los escenarios se guardan en tablas propias del Cuartel, separadas del resto",
  },
  local: {
    label: "Solo este dispositivo",
    color: "var(--cua-amarillo)",
    title: "Sin base de datos configurada: los escenarios viven en el navegador de este dispositivo",
  },
  error: {
    label: "Sin guardar",
    color: "var(--cua-rojo)",
    title: "No se pudo guardar en la base. La copia del navegador sigue intacta y se reintenta al próximo cambio",
  },
  desconocido: { label: "Conectando…", color: "var(--cua-faint)", title: "Comprobando dónde se guarda la data" },
};

export default function CuartelNav() {
  const seccion = useCuartelStore((s) => s.seccion);
  const escenarioAbiertoId = useCuartelStore((s) => s.escenarioAbiertoId);
  const setSeccion = useCuartelStore((s) => s.setSeccion);
  const estadoSync = useCuartelSync();
  const sync = SYNC_TEXTO[estadoSync] ?? SYNC_TEXTO.desconocido;

  return (
    <div
      className="flex shrink-0 flex-col py-4 md:h-screen md:w-[224px] md:py-[22px]"
      style={{ background: "var(--cua-sidebar)", borderRight: "1px solid var(--cua-border)" }}
    >
      <div
        className="hidden px-5 pb-5 md:block"
        style={{ borderBottom: "1px solid var(--cua-border)" }}
      >
        <div className="cua-mono text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--cua-muted)" }}>
          Cuartel
        </div>
        <div className="cua-serif mt-1 text-[19px] font-semibold leading-[1.25]">de mis Decisiones</div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 md:mt-3.5 md:flex-col md:gap-0 md:px-0">
        {SECCIONES.map((key) => {
          const activa = seccion === key || (key === "escenarios" && !!escenarioAbiertoId);
          return (
            <button
              key={key}
              onClick={() => setSeccion(key)}
              className="shrink-0 whitespace-nowrap px-3 py-2.5 text-left text-[14px] md:px-5"
              style={{
                color: activa ? "var(--cua-text)" : "var(--cua-muted)",
                background: activa ? "var(--cua-active)" : "transparent",
                borderLeft: `2px solid ${activa ? "var(--cua-accent)" : "transparent"}`,
              }}
            >
              {CUARTEL_SECCION_LABEL[key]}
            </button>
          );
        })}
      </nav>

      <div
        className="mt-auto hidden px-5 pt-4 md:block"
        style={{ borderTop: "1px solid var(--cua-border)" }}
      >
        <div className="cua-mono flex items-center gap-1.5 text-[10.5px]" style={{ color: sync.color }} title={sync.title}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sync.color }} />
          {sync.label}
        </div>
        <div className="cua-mono mt-1.5 text-[10.5px] tracking-[0.04em]" style={{ color: "var(--cua-faint)" }}>
          Sistema privado · 1 usuario
        </div>
        <div className="cua-mono mt-1.5 text-[10.5px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          Ningún escenario se decide sin ver las 3 rutas completas.
        </div>
      </div>
    </div>
  );
}

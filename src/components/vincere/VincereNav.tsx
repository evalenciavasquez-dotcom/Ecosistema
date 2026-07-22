"use client";

import { useVincereStore } from "@/lib/vincere/store";
import { VincereSeccion, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";

const CORE_SECTIONS: VincereSeccion[] = [
  "resumen",
  "diagnostico",
  "song",
  "audiencia",
  "calor",
  "management",
  "kpis",
  "triage",
];

// Secciones P1 del PRD — se activan una a una en fases posteriores.
const PROXIMAMENTE = [
  "Marca",
  "A&R y Colaboraciones",
  "Finanzas y Presupuesto",
  "Shows y Touring",
  "Monetización",
  "Valoración de Carrera",
  "Legal y Derechos",
  "Relaciones de Industria",
  "Playbook",
  "Plan Stress-Test",
];

export default function VincereNav() {
  const seccion = useVincereStore((s) => s.seccion);
  const compareOn = useVincereStore((s) => s.compareOn);
  const compareId = useVincereStore((s) => s.compareProyectoId);
  const proyectos = useVincereStore((s) => s.proyectos);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const toggleCompare = useVincereStore((s) => s.toggleCompare);

  const compareTarget = proyectos.find((p) => p.id === compareId);

  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto px-3 py-3 md:w-[246px] md:flex-col md:gap-0 md:overflow-y-auto md:py-6"
      style={{ borderColor: "var(--vin-border)" }}
    >
      <div className="vin-label hidden px-3 pb-2.5 md:block">Motores activos</div>

      {CORE_SECTIONS.map((key) => {
        const active = !compareOn && seccion === key;
        return (
          <button
            key={key}
            onClick={() => setSeccion(key)}
            className="shrink-0 whitespace-nowrap rounded-r-sm px-3 py-2.5 text-left text-[13.5px] transition-colors"
            style={{
              borderLeft: active ? "2px solid var(--vin-accent)" : "2px solid transparent",
              background: active ? "rgba(224,72,58,0.12)" : "transparent",
              color: active ? "var(--vin-text)" : "var(--vin-muted)",
            }}
          >
            {VINCERE_SECCION_LABEL[key]}
          </button>
        );
      })}

      {compareTarget && (
        <button
          onClick={toggleCompare}
          className="mt-0 shrink-0 whitespace-nowrap rounded-r-sm px-3 py-2.5 text-left text-[13.5px] transition-colors md:mt-2.5"
          style={{
            borderLeft: compareOn ? "2px solid var(--vin-accent)" : "2px solid transparent",
            background: compareOn ? "rgba(224,72,58,0.12)" : "transparent",
            color: compareOn ? "var(--vin-text)" : "var(--vin-muted)",
          }}
        >
          Comparación
        </button>
      )}

      <div
        className="vin-label mt-4 hidden px-3 pb-2.5 pt-4 md:block"
        style={{ borderTop: "1px solid var(--vin-border)" }}
      >
        Próximamente
      </div>
      <div className="hidden md:block">
        {PROXIMAMENTE.map((label) => (
          <div key={label} className="px-3 py-1.5 text-[12.5px]" style={{ color: "var(--vin-dim)" }}>
            {label} · pronto
          </div>
        ))}
      </div>
    </nav>
  );
}

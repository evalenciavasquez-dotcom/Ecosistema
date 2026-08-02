"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import { CUARTEL_SECCION_LABEL, CuartelSeccion } from "@/lib/cuartel/types";

const SECCIONES: CuartelSeccion[] = ["inicio", "escenarios", "historial", "metodo"];

// Fuera de alcance v1 (PRD §13). Se listan para que quede claro que no están
// olvidadas: están decididas como "todavía no".
const PROXIMAMENTE = ["Captura por WhatsApp / voz", "Recordatorios de fecha límite", "Acceso de terceros"];

export default function CuartelNav() {
  const seccion = useCuartelStore((s) => s.seccion);
  const setSeccion = useCuartelStore((s) => s.setSeccion);

  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto px-3 py-3 md:w-[230px] md:flex-col md:gap-0 md:overflow-y-auto md:py-6"
      style={{ borderColor: "var(--cua-border)" }}
    >
      <div className="cua-label hidden px-3 pb-2.5 md:block">Pantallas</div>

      {SECCIONES.map((key) => {
        const active = seccion === key;
        return (
          <button
            key={key}
            onClick={() => setSeccion(key)}
            className="shrink-0 whitespace-nowrap rounded-r-sm px-3 py-2.5 text-left text-[13.5px] transition-colors"
            style={{
              borderLeft: active ? "2px solid var(--cua-accent)" : "2px solid transparent",
              background: active ? "var(--cua-accent-soft)" : "transparent",
              color: active ? "var(--cua-text)" : "var(--cua-muted)",
            }}
          >
            {CUARTEL_SECCION_LABEL[key]}
          </button>
        );
      })}

      <div
        className="cua-label mt-4 hidden px-3 pb-2.5 pt-4 md:block"
        style={{ borderTop: "1px solid var(--cua-border)" }}
      >
        Fuera de alcance v1
      </div>
      <div className="hidden md:block">
        {PROXIMAMENTE.map((label) => (
          <div key={label} className="px-3 py-1.5 text-[12.5px]" style={{ color: "var(--cua-dim)" }}>
            {label}
          </div>
        ))}
      </div>
    </nav>
  );
}

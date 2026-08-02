"use client";

import {
  VincereAlertaSeveridad,
  VincereProyecto,
  VINCERE_SECCION_LABEL,
  VINCERE_SEVERIDAD_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import EvidenceTag from "./EvidenceTag";

const SEVERIDAD_COLOR: Record<VincereAlertaSeveridad, string> = {
  critica: "#e0483a",
  atencion: "#e0a83a",
  oportunidad: "#5cc98e",
};

// Orden de atención: lo que amenaza primero, la oportunidad al final.
const PESO: Record<VincereAlertaSeveridad, number> = { critica: 0, atencion: 1, oportunidad: 2 };

export function SeveridadTag({ severidad }: { severidad: VincereAlertaSeveridad }) {
  const color = SEVERIDAD_COLOR[severidad];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 vin-t-xs font-medium tracking-wide"
      style={{ color, borderColor: `${color}66` }}
    >
      {VINCERE_SEVERIDAD_LABEL[severidad]}
    </span>
  );
}

// Lo que el sistema vio y Eduardo todavía no ha atendido. Se muestra arriba de
// la sección de carga y en el resumen, para que no haya que ir a buscarlo.
export default function AlertasPanel({
  proyecto,
  compacto = false,
}: {
  proyecto: VincereProyecto;
  compacto?: boolean;
}) {
  const descartarAlerta = useVincereStore((s) => s.descartarAlerta);
  const descartarTodas = useVincereStore((s) => s.descartarTodasLasAlertas);
  const setSeccion = useVincereStore((s) => s.setSeccion);

  const alertas = [...(proyecto.alertas ?? [])].sort((a, b) => PESO[a.severidad] - PESO[b.severidad]);
  if (alertas.length === 0) return null;

  const visibles = compacto ? alertas.slice(0, 3) : alertas;

  return (
    <div className="vin-accent-card p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
          <span className="vin-eyebrow">
            Alertas · {alertas.length} {alertas.length === 1 ? "sin atender" : "sin atender"}
          </span>
        </div>
        {!compacto && alertas.length > 1 && (
          <button onClick={() => descartarTodas(proyecto.id)} className="vin-faint vin-t-xs hover:underline">
            Descartar todas
          </button>
        )}
      </div>

      <ul className="space-y-3.5">
        {visibles.map((a) => (
          <li key={a.id} className="border-l-2 pl-3.5" style={{ borderColor: SEVERIDAD_COLOR[a.severidad] }}>
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 vin-t-sm leading-relaxed">{a.texto}</p>
              <button
                onClick={() => descartarAlerta(proyecto.id, a.id)}
                className="vin-faint shrink-0 px-1 vin-t-xs hover:underline"
                title="Descartar"
              >
                ✕
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <SeveridadTag severidad={a.severidad} />
              <EvidenceTag nivel={a.nivel} />
              {a.seccion && (
                <button
                  onClick={() => setSeccion(a.seccion!)}
                  className="vin-faint vin-t-xs hover:underline"
                  title="Ir a esa sección"
                >
                  {VINCERE_SECCION_LABEL[a.seccion]} →
                </button>
              )}
              <span className="vin-faint vin-t-xs">· {a.origen}</span>
            </div>
          </li>
        ))}
      </ul>

      {compacto && alertas.length > visibles.length && (
        <button
          onClick={() => setSeccion("ingesta")}
          className="vin-faint mt-3.5 vin-t-xs hover:underline"
        >
          Ver las {alertas.length} alertas →
        </button>
      )}
    </div>
  );
}

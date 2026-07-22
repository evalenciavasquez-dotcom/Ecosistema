"use client";

import { useState } from "react";
import { VincereDiagnostico, VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

const FIELDS: { key: keyof VincereDiagnostico; label: string }[] = [
  { key: "faseActual", label: "Fase actual" },
  { key: "fortalezaNucleo", label: "Fortaleza núcleo" },
  { key: "riesgoPrincipal", label: "Riesgo principal" },
  { key: "prioridad", label: "Prioridad #1" },
];

export default function DiagnosticoSection({ proyecto }: { proyecto: VincereProyecto }) {
  const updateDiagnostico = useVincereStore((s) => s.updateDiagnostico);
  const [editing, setEditing] = useState(false);
  const d = proyecto.diagnostico;

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="diagnostico"
      eyebrow="Diagnóstico"
      title="Diagnóstico Maestro"
      subtitle="Lectura de criterio: fase, fortaleza, riesgo y prioridad de la carrera hoy."
      aiTitle="Lectura VINCERE — Diagnóstico"
    >
      <div className="flex justify-end">
        <button className="vin-faint text-xs hover:underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar edición" : "Editar data"}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <Panel key={f.key}>
            <div className="vin-faint mb-2 text-[11px] uppercase tracking-[0.08em]">{f.label}</div>
            {editing ? (
              <textarea
                value={d[f.key]}
                onChange={(e) => updateDiagnostico(proyecto.id, { [f.key]: e.target.value })}
                rows={2}
                className="vin-input resize-none"
              />
            ) : (
              <div className="text-base leading-relaxed">{d[f.key] || <span className="vin-faint">—</span>}</div>
            )}
          </Panel>
        ))}
      </div>
    </SectionShell>
  );
}

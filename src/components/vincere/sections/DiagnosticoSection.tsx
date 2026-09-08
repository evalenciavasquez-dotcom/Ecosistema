"use client";

import { useState } from "react";
import { VincereDiagnostico, VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { BloqueTintado, type TipoDeBloque } from "../primitives";

// Los cuatro campos eran cuatro cajas blancas idénticas. Y no son cuatro cosas
// del mismo tipo: dos son lectura y dos son las que mandan. «Riesgo principal»
// y «Prioridad #1» —lo que amenaza y lo que hay que hacer— se veían exactamente
// igual que «Fase actual», que es un dato de contexto.
//
// Con el tipo a la vista la pantalla se recorre con los ojos y no leyéndola
// entera para encontrar cuál de las cuatro importa hoy.
const FIELDS: { key: keyof VincereDiagnostico; label: string; tipo: TipoDeBloque }[] = [
  { key: "faseActual", label: "Fase actual", tipo: "datos" },
  { key: "fortalezaNucleo", label: "Fortaleza núcleo", tipo: "nota" },
  { key: "riesgoPrincipal", label: "Riesgo principal", tipo: "riesgo" },
  { key: "prioridad", label: "Prioridad #1", tipo: "accion" },
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
        <button className="vin-faint vin-t-xs hover:underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar edición" : "Editar data"}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <BloqueTintado key={f.key} tipo={f.tipo} rotulo={f.label}>
            {editing ? (
              <textarea
                value={d[f.key]}
                onChange={(e) => updateDiagnostico(proyecto.id, { [f.key]: e.target.value })}
                rows={2}
                className="vin-input resize-none"
              />
            ) : (
              <div className="vin-t-base leading-relaxed">{d[f.key] || <span className="vin-faint">—</span>}</div>
            )}
          </BloqueTintado>
        ))}
      </div>
    </SectionShell>
  );
}

"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

export default function ManagementSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addDecision = useVincereStore((s) => s.addDecision);
  const setEstado = useVincereStore((s) => s.setDecisionEstado);
  const deleteDecision = useVincereStore((s) => s.deleteDecision);
  const [nueva, setNueva] = useState("");

  const decisiones = proyecto.decisiones;

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="management"
      eyebrow="Management"
      title="Management / Decisiones"
      subtitle="Bitácora de decisiones de carrera, tomadas y pendientes."
      aiTitle="Lectura VINCERE — Prioridad de decisión"
    >
      <Panel>
        {decisiones.length === 0 && <p className="vin-muted text-sm">Sin decisiones registradas.</p>}
        {decisiones.map((d, i) => {
          const pendiente = d.estado === "Pendiente";
          const color = pendiente ? "var(--vin-accent)" : "var(--vin-faint)";
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 py-3"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--vin-border)" }}
            >
              <span className="text-[15px]">{d.texto}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setEstado(proyecto.id, d.id, pendiente ? "Tomada" : "Pendiente")}
                  className="rounded-sm border px-2.5 py-1 text-[11px] uppercase tracking-[0.06em]"
                  style={{ color, borderColor: color }}
                  title="Cambiar estado"
                >
                  {d.estado}
                </button>
                <button onClick={() => deleteDecision(proyecto.id, d.id)} className="vin-faint px-1 text-xs hover:underline">
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-4 flex gap-2.5">
          <input
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nueva.trim()) {
                addDecision(proyecto.id, nueva.trim());
                setNueva("");
              }
            }}
            placeholder="Nueva decisión a registrar…"
            className="vin-input flex-1"
          />
          <button
            onClick={() => {
              if (!nueva.trim()) return;
              addDecision(proyecto.id, nueva.trim());
              setNueva("");
            }}
            className="vin-btn-primary"
          >
            Añadir
          </button>
        </div>
      </Panel>
    </SectionShell>
  );
}

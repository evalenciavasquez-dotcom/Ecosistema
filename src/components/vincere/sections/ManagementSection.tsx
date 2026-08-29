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

  // Lo pendiente primero. Es el mismo sesgo que el resto del sistema —se abre
  // por lo que está sin cerrar, no por lo que ya salió bien— y acá faltaba: la
  // bitácora existe para ver qué falta decidir, y venía en orden de captura.
  // El orden interno de cada grupo no se toca: dentro de lo pendiente, lo que
  // se registró antes lleva más tiempo esperando.
  const decisiones = [...proyecto.decisiones].sort(
    (a, b) => Number(b.estado === "Pendiente") - Number(a.estado === "Pendiente")
  );
  const pendientes = decisiones.filter((d) => d.estado === "Pendiente").length;

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
        {decisiones.length === 0 && <p className="vin-muted vin-t-sm">Sin decisiones registradas.</p>}
        {decisiones.length > 0 && (
          <div className="vin-block-title mb-1">
            <span>{pendientes > 0 ? "Sin decidir todavía" : "Todo decidido"}</span>
            <span className="tabular-nums">
              {pendientes}/{decisiones.length}
            </span>
          </div>
        )}
        {decisiones.map((d, i) => {
          const pendiente = d.estado === "Pendiente";
          // Pendiente y tomada eran dos píldoras del mismo gris con un tono de
          // diferencia: en pantalla no se distinguían, y esta bitácora existe
          // justo para separar esas dos cosas. Lo pendiente se llena de acento
          // —es lo tocable— y lo tomado se apaga: ya no pide nada.
          return (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 py-3"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--vin-border)",
                opacity: pendiente ? 1 : 0.62,
              }}
            >
              <span className="vin-t-base">{d.texto}</span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setEstado(proyecto.id, d.id, pendiente ? "Tomada" : "Pendiente")}
                  className="rounded-xl border px-2.5 py-1 vin-t-xs uppercase tracking-[0.06em]"
                  style={
                    pendiente
                      ? {
                          background: "var(--vin-accent)",
                          color: "var(--vin-accent-ink)",
                          borderColor: "var(--vin-accent)",
                        }
                      : { color: "var(--vin-faint)", borderColor: "var(--vin-border-strong)" }
                  }
                  title="Cambiar estado"
                >
                  {d.estado}
                </button>
                <button onClick={() => deleteDecision(proyecto.id, d.id)} className="vin-faint px-1 vin-t-xs hover:underline">
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

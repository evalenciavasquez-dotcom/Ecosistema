"use client";

import { useEffect, useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { etiquetaRuta, fetchPreguntaInstructor } from "@/lib/cuartel/ai-client";
import { instructorCumplido } from "@/lib/cuartel/candado";
import { CUARTEL_PREGUNTA_LABEL, CuartelEscenario, CuartelRuta } from "@/lib/cuartel/types";
import { ErrorNota } from "./primitives";

// El Instructor como panel lateral: la conversación sobre UNA ruta, sin sacar
// a Eduardo de la comparación que está mirando.
export default function InstructorDrawer({
  escenario,
  ruta,
  onCerrar,
}: {
  escenario: CuartelEscenario;
  ruta: CuartelRuta;
  onCerrar: () => void;
}) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const agregarPregunta = useCuartelStore((s) => s.agregarPregunta);
  const responderPregunta = useCuartelStore((s) => s.responderPregunta);

  const [borrador, setBorrador] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendiente = ruta.turnos.find((t) => !t.respuesta);
  const habilitada = instructorCumplido(ruta);

  // La primera pregunta se pide sola al abrir: el panel existe para poner la
  // ruta a prueba, no para quedarse esperando que alguien lo decida.
  useEffect(() => {
    if (ruta.turnos.length > 0 || cargando) return;
    void pedir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta.id]);

  async function pedir() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchPreguntaInstructor(escenario, ruta, escenarios);
      agregarPregunta(escenario.id, ruta.id, res.tipo, res.pregunta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la pregunta");
    } finally {
      setCargando(false);
    }
  }

  function responder() {
    if (!pendiente || !borrador.trim()) return;
    responderPregunta(escenario.id, ruta.id, pendiente.id, borrador.trim());
    setBorrador("");
  }

  return (
    <div
      className="fixed bottom-0 right-0 top-0 z-40 flex w-[400px] max-w-[92vw] flex-col"
      style={{ background: "var(--cua-sidebar)", borderLeft: "1px solid var(--cua-border-strong)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-[18px]"
        style={{ borderBottom: "1px solid var(--cua-border-soft)" }}
      >
        <div>
          <div className="cua-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--cua-muted)" }}>
            El Instructor
          </div>
          <div className="cua-serif mt-0.5 text-[16px] font-semibold">Ruta: {etiquetaRuta(ruta)}</div>
        </div>
        <button className="text-[16px]" style={{ color: "var(--cua-muted)" }} onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-[18px]">
        {ruta.turnos.length === 0 && !cargando && !error && (
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
            Ninguna ruta llega a válida sin que El Instructor la ponga a prueba.
          </p>
        )}

        {ruta.turnos.map((t) => (
          <div key={t.id} className="flex flex-col gap-3.5">
            <div className="max-w-[88%] self-start">
              <div
                className="cua-mono mb-1 text-[9.5px] uppercase tracking-[0.06em]"
                style={{ color: "var(--cua-accent)" }}
              >
                {CUARTEL_PREGUNTA_LABEL[t.tipo]}
              </div>
              <div
                className="cua-serif rounded-sm px-3.5 py-2.5 text-[13.5px] leading-[1.5]"
                style={{
                  background: "var(--cua-surface-2)",
                  border: "1px solid var(--cua-border-strong)",
                  color: "var(--cua-accent-light)",
                }}
              >
                {t.pregunta}
              </div>
            </div>

            {t.respuesta && (
              <div
                className="max-w-[88%] self-end rounded-sm px-3.5 py-2.5 text-[13.5px] leading-[1.5]"
                style={{ background: "var(--cua-active)", color: "var(--cua-text)" }}
              >
                {t.respuesta}
              </div>
            )}
          </div>
        ))}

        {cargando && (
          <div className="cua-mono text-[11.5px]" style={{ color: "var(--cua-faint)" }}>
            Pensando…
          </div>
        )}
        {error && <ErrorNota>{error}</ErrorNota>}

        {habilitada && !pendiente && (
          <div className="cua-mono mt-1 text-[11.5px]" style={{ color: "var(--cua-verde)" }}>
            ✓ Esta ruta ya fue puesta a prueba. Su validez ya se puede calcular.
          </div>
        )}
      </div>

      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
        {pendiente ? (
          <>
            <textarea
              className="cua-textarea mb-2.5"
              rows={2}
              placeholder="Respondé sin editarte."
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
            />
            <button className="cua-btn-primary w-full" onClick={responder} disabled={!borrador.trim()}>
              Responder
            </button>
          </>
        ) : (
          <button className="cua-btn-ghost w-full" onClick={pedir} disabled={cargando}>
            {cargando ? "Pensando…" : "Otra pregunta"}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import { etiquetaRuta, fetchRecomendacion } from "@/lib/cuartel/ai-client";
import { CuartelEscenario } from "@/lib/cuartel/types";
import { Campo, ErrorNota, Nota, Panel, PanelLabel } from "./primitives";
import AvisoSinLlave, { useSinLlave } from "./AvisoSinLlave";

// Cierre y aprendizaje. El campo de resultado es lo que convierte esto en un
// Libro Rojo y no en un formulario: sin resultado registrado, un escenario
// cerrado no le enseña nada al siguiente.
export default function CierrePanel({ escenario }: { escenario: CuartelEscenario }) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const setCierre = useCuartelStore((s) => s.setCierre);
  const setEstado = useCuartelStore((s) => s.setEstado);
  const showToast = useCuartelStore((s) => s.showToast);

  const sinLlave = useSinLlave();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cierre = escenario.cierre;
  const validas = escenario.rutas.filter((r) => calcularVeredicto(r).validez === "valida");
  const elegibles = escenario.rutas.filter((r) => calcularVeredicto(r).validez !== "descartada");
  const recomendada = escenario.rutas.find((r) => r.id === cierre.rutaRecomendadaId);
  const elegida = escenario.rutas.find((r) => r.id === cierre.rutaElegidaId);
  const difiere = !!elegida && !!recomendada && elegida.id !== recomendada.id;
  const yaDecidido = escenario.estado === "decidido" || escenario.estado === "seguimiento" || escenario.estado === "cerrado";

  async function recomendar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchRecomendacion(escenario, escenarios);
      setCierre(escenario.id, {
        rutaRecomendadaId: res.rutaId,
        razonRecomendacion: res.razon,
        supuestoRecomendacion: res.loQueSeAsume,
        movidaConcreta: cierre.movidaConcreta || res.movidaConcreta,
        plazoMovida: cierre.plazoMovida || res.plazo,
      });
      if (escenario.estado === "activo") setEstado(escenario.id, "analisis");
      showToast("Recomendación lista. La decisión sigue siendo tuya.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la recomendación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Panel>
      <PanelLabel>Cierre y aprendizaje</PanelLabel>

      <div className="mb-5">
        {recomendada ? (
          <>
            <div className="mb-1.5 text-[12.5px]" style={{ color: "var(--cua-muted)" }}>
              El sistema recomienda
            </div>
            <div className="cua-serif text-[19px] font-semibold" style={{ color: "var(--cua-accent-light)" }}>
              {etiquetaRuta(recomendada)}
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
              {cierre.razonRecomendacion}
            </p>
            {cierre.supuestoRecomendacion && (
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--cua-muted)" }}>
                <span className="cua-label">Lo que se asume</span> — {cierre.supuestoRecomendacion}
              </p>
            )}
          </>
        ) : (
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
            {validas.length < 2
              ? `Hacen falta al menos dos rutas válidas para comparar; hoy hay ${validas.length}. Completá el análisis y dejá que El Instructor las ponga a prueba — comparar una ruta contra nada no es comparar.`
              : "Con las rutas ya comparables, el sistema puede decir cuál queda mejor parada y traducirla en una movida concreta."}
          </p>
        )}

        <button
          className="cua-btn-ghost mt-3"
          onClick={recomendar}
          disabled={cargando || sinLlave || validas.length < 2}
          title={sinLlave ? "Falta configurar la llave de la IA" : undefined}
        >
          {cargando ? "Comparando…" : recomendada ? "Recalcular recomendación" : "Pedir recomendación"}
        </button>
        <AvisoSinLlave que="No se puede pedir la recomendación." />
        {error && <ErrorNota>{error}</ErrorNota>}
      </div>

      <div className="mb-2 text-[12.5px]" style={{ color: "var(--cua-muted)" }}>
        Ruta elegida
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {elegibles.map((r) => {
          const activa = cierre.rutaElegidaId === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setCierre(escenario.id, { rutaElegidaId: activa ? null : r.id })}
              className="cua-mono rounded-sm border px-4 py-2 text-[12px] uppercase tracking-[0.04em]"
              style={{
                borderColor: activa ? "var(--cua-accent)" : "var(--cua-border-strong)",
                color: activa ? "var(--cua-accent)" : "var(--cua-muted)",
              }}
            >
              {etiquetaRuta(r)}
            </button>
          );
        })}
      </div>

      {difiere && (
        <p className="mb-4 text-[12.5px] leading-relaxed" style={{ color: "var(--cua-accent)" }}>
          Elegiste una ruta distinta de la recomendada. Queda registrado así, sin discusión: esa diferencia es data para
          el Libro Rojo.
        </p>
      )}

      <div className="mb-1.5 text-[12.5px]" style={{ color: "var(--cua-muted)" }}>
        Movida concreta (una sola acción, con plazo)
      </div>
      <input
        className="cua-input mb-4"
        placeholder="Ej: conversación de cierre el domingo, plazo 3 semanas"
        value={cierre.movidaConcreta}
        onChange={(e) => setCierre(escenario.id, { movidaConcreta: e.target.value })}
      />

      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Campo label="Fecha de decisión">
          <input
            type="date"
            className="cua-input"
            value={cierre.fechaDecision}
            onChange={(e) => setCierre(escenario.id, { fechaDecision: e.target.value })}
          />
        </Campo>
        <Campo label="Resultado / aprendizaje">
          <textarea
            className="cua-textarea"
            rows={2}
            placeholder="Se llena cuando la decisión ya jugó en la vida real"
            value={cierre.resultado}
            onChange={(e) => setCierre(escenario.id, { resultado: e.target.value })}
          />
        </Campo>
      </div>

      {!cierre.resultado.trim() && (
        <Nota>Sin registrar todavía — no se muestra como “cerrado” si no ocurrió de verdad.</Nota>
      )}

      {!yaDecidido && (
        <button
          className="cua-btn-primary mt-4"
          disabled={!cierre.rutaElegidaId || !cierre.movidaConcreta.trim()}
          onClick={() => {
            setCierre(escenario.id, {
              fechaDecision: cierre.fechaDecision || new Date().toISOString().slice(0, 10),
            });
            setEstado(escenario.id, "decidido");
            showToast("Decisión registrada. Falta que la movida se ejecute de verdad.");
          }}
        >
          Registrar la decisión
        </button>
      )}

      {yaDecidido && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
          <label className="flex items-start gap-2.5 text-[13.5px]">
            <input
              type="checkbox"
              className="mt-1"
              checked={cierre.movidaEjecutada}
              onChange={(e) => {
                setCierre(escenario.id, { movidaEjecutada: e.target.checked });
                if (e.target.checked && escenario.estado === "decidido") setEstado(escenario.id, "seguimiento");
              }}
            />
            <span>
              La movida se ejecutó
              <span className="block text-[12px]" style={{ color: "var(--cua-faint)" }}>
                Analizada no cuenta. Esta casilla es la métrica principal del sistema.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Campo label="El patrón identificado, ¿se confirmó?">
              <select
                className="cua-select"
                value={cierre.patronConfirmado === null ? "" : cierre.patronConfirmado ? "si" : "no"}
                onChange={(e) =>
                  setCierre(escenario.id, {
                    patronConfirmado: e.target.value === "" ? null : e.target.value === "si",
                  })
                }
              >
                <option value="">— sin veredicto todavía —</option>
                <option value="si">Sí, se repitió</option>
                <option value="no">No, esta vez fue distinto</option>
              </select>
            </Campo>
            <Campo label="Fecha del resultado">
              <input
                type="date"
                className="cua-input"
                value={cierre.fechaResultado}
                onChange={(e) => setCierre(escenario.id, { fechaResultado: e.target.value })}
              />
            </Campo>
          </div>

          {escenario.estado !== "cerrado" && (
            <>
              <button
                className="cua-btn-primary mt-4"
                disabled={!cierre.resultado.trim()}
                onClick={() => setEstado(escenario.id, "cerrado")}
              >
                Cerrar escenario
              </button>
              {!cierre.resultado.trim() && (
                <Nota>Para cerrar hace falta el resultado. Un escenario cerrado sin aprendizaje no le sirve al siguiente.</Nota>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

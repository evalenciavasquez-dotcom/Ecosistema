"use client";

import { useMemo } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { etiquetaRuta } from "@/lib/cuartel/ai-client";
import { CUARTEL_CATEGORIA_LABEL } from "@/lib/cuartel/types";
import { CertezaTag, Panel, StatCard } from "../primitives";

// El Libro Rojo: qué se decidió, qué pasó después, y si el patrón que se había
// nombrado terminó confirmándose. La única vista que mira hacia atrás.
export default function HistorialSection() {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);

  const cerrados = useMemo(
    () =>
      escenarios
        .filter((e) => e.estado === "decidido" || e.estado === "seguimiento" || e.estado === "cerrado")
        .sort((a, b) => (b.cierre.fechaDecision || "").localeCompare(a.cierre.fechaDecision || "")),
    [escenarios]
  );

  const stats = useMemo(
    () => ({
      conResultado: cerrados.filter((e) => e.cierre.resultado.trim()).length,
      confirmados: cerrados.filter((e) => e.cierre.patronConfirmado === true).length,
      refutados: cerrados.filter((e) => e.cierre.patronConfirmado === false).length,
    }),
    [cerrados]
  );

  if (cerrados.length === 0) {
    return (
      <Panel>
        <div className="cua-serif mb-2.5 text-[19px] font-semibold">El Libro Rojo está vacío</div>
        <p className="text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Un escenario entra acá cuando se registra su decisión. El aprendizaje se llena semanas o meses después — y es
          lo que hace que el próximo escenario no arranque de cero.
        </p>
      </Panel>
    );
  }

  return (
    <div>
      <div className="mb-7 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard value={cerrados.length} label="Escenarios decididos" />
        <StatCard value={stats.conResultado} label="Con resultado registrado" />
        <StatCard value={stats.confirmados} label="Patrones confirmados" />
        <StatCard value={stats.refutados} label="Patrones refutados" />
      </div>

      {stats.conResultado < cerrados.length && (
        <Panel className="mb-4">
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
            {cerrados.length - stats.conResultado} escenario{cerrados.length - stats.conResultado === 1 ? "" : "s"} sin
            resultado registrado. Esa es la parte que casi nunca se llena — y sin ella esto es un archivo de decisiones,
            no un Libro Rojo.
          </p>
        </Panel>
      )}

      {cerrados.map((e) => {
        const elegida = e.rutas.find((r) => r.id === e.cierre.rutaElegidaId);
        const recomendada = e.rutas.find((r) => r.id === e.cierre.rutaRecomendadaId);
        const difiere = !!elegida && !!recomendada && elegida.id !== recomendada.id;

        return (
          <button key={e.id} onClick={() => abrirEscenario(e.id)} className="cua-card mb-4 w-full p-[26px] text-left">
            <div
              className="cua-serif text-[20px] italic leading-[1.5]"
              style={{ color: e.cierre.resultado ? "var(--cua-accent-light)" : "var(--cua-faint)" }}
            >
              “{e.cierre.resultado || e.tensionReal || "Sin resultado registrado todavía."}”
            </div>

            <div
              className="cua-mono mt-4 flex flex-wrap gap-4 pt-3.5 text-[11px]"
              style={{ color: "var(--cua-muted)", borderTop: "1px solid var(--cua-border-soft)" }}
            >
              <span>{e.nombre}</span>
              <span>{CUARTEL_CATEGORIA_LABEL[e.categoria]}</span>
              <span>Decisión: {e.cierre.fechaDecision || "—"}</span>
              <span>Ruta elegida: {etiquetaRuta(elegida) ?? "—"}</span>
              <span style={{ color: e.cierre.movidaEjecutada ? "var(--cua-verde)" : "var(--cua-amarillo)" }}>
                Movida {e.cierre.movidaEjecutada ? "ejecutada" : "sin ejecutar"}
              </span>
            </div>

            {difiere && (
              <div className="cua-mono mt-2.5 text-[11px]" style={{ color: "var(--cua-accent)" }}>
                El sistema recomendaba {etiquetaRuta(recomendada)} — eligió otra.
              </div>
            )}

            {e.patronRepetido && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="cua-mono text-[11px]" style={{ color: "var(--cua-amarillo)" }}>
                  Patrón: {e.patronRepetido}
                </span>
                <CertezaTag certeza={e.certezaPatron} />
                <span
                  className="cua-mono text-[11px]"
                  style={{
                    color:
                      e.cierre.patronConfirmado === true
                        ? "var(--cua-rojo)"
                        : e.cierre.patronConfirmado === false
                          ? "var(--cua-verde)"
                          : "var(--cua-faint)",
                  }}
                >
                  {e.cierre.patronConfirmado === true
                    ? "confirmado"
                    : e.cierre.patronConfirmado === false
                      ? "refutado"
                      : "sin veredicto"}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

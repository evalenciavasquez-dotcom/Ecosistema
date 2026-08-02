"use client";

import { useMemo } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { etiquetaRuta } from "@/lib/cuartel/ai-client";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import { CUARTEL_CATEGORIA_LABEL, CUARTEL_ESTADO_LABEL } from "@/lib/cuartel/types";
import { CertezaTag, Panel, PanelLabel, SectionHeader, StatCard } from "../primitives";

// El Libro Rojo: qué se decidió, qué pasó después, y si el patrón que se había
// nombrado terminó confirmándose. Es la única vista que mira hacia atrás.
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

  const stats = useMemo(() => {
    const conResultado = cerrados.filter((e) => e.cierre.resultado.trim());
    const patronesConfirmados = cerrados.filter((e) => e.cierre.patronConfirmado === true).length;
    const patronesRefutados = cerrados.filter((e) => e.cierre.patronConfirmado === false).length;
    // Rutas "Sostener" que el candado descartó en escenarios ya resueltos: la
    // métrica secundaria que dice si el candado acertó o si solo incomodó.
    const sostenerDescartadas = cerrados.reduce(
      (acc, e) =>
        acc +
        e.rutas.filter((r) => r.tipo === "sostener" && calcularVeredicto(r).validez === "descartada").length,
      0
    );
    return { conResultado: conResultado.length, patronesConfirmados, patronesRefutados, sostenerDescartadas };
  }, [cerrados]);

  if (cerrados.length === 0) {
    return (
      <>
        <SectionHeader
          eyebrow="Historial"
          title="El Libro Rojo está vacío"
          subtitle="Acá aparecen los escenarios ya decididos con lo que pasó después. Todavía no hay ninguno."
        />
        <Panel>
          <p className="cua-muted text-sm leading-relaxed">
            Un escenario entra a esta vista cuando se registra su decisión. El aprendizaje se llena semanas o meses
            después — y es lo que hace que el próximo escenario no arranque de cero.
          </p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow="Historial · Libro Rojo"
        title="Qué se decidió y qué pasó después"
        subtitle="La memoria entre escenarios distintos. Sin resultado registrado, un escenario cerrado no enseña nada."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={cerrados.length} label="Escenarios decididos" />
        <StatCard value={stats.conResultado} label="Con resultado registrado" color="#5cc98e" />
        <StatCard value={stats.patronesConfirmados} label="Patrones confirmados" color="#e0483a" />
        <StatCard value={stats.sostenerDescartadas} label="Sostener descartadas" />
      </div>

      {stats.conResultado < cerrados.length && (
        <Panel className="mb-6">
          <PanelLabel>Pendiente de aprendizaje</PanelLabel>
          <p className="cua-muted text-[13px] leading-relaxed">
            {cerrados.length - stats.conResultado} escenario{cerrados.length - stats.conResultado === 1 ? "" : "s"} sin
            resultado registrado. Esa es la parte que casi nunca se llena — y sin ella esto es un archivo de decisiones,
            no un Libro Rojo.
          </p>
        </Panel>
      )}

      {stats.patronesRefutados > 0 && (
        <Panel className="mb-6">
          <PanelLabel>Patrones refutados</PanelLabel>
          <p className="cua-muted text-[13px] leading-relaxed">
            {stats.patronesRefutados} vez{stats.patronesRefutados === 1 ? "" : "es"} el patrón identificado no se repitió.
            Cuenta igual que las confirmaciones: un sistema que solo registra cuando acierta no es un registro.
          </p>
        </Panel>
      )}

      <div className="space-y-3">
        {cerrados.map((e) => {
          const elegida = e.rutas.find((r) => r.id === e.cierre.rutaElegidaId);
          const recomendada = e.rutas.find((r) => r.id === e.cierre.rutaRecomendadaId);
          const difiere = !!elegida && !!recomendada && elegida.id !== recomendada.id;

          return (
            <button key={e.id} onClick={() => abrirEscenario(e.id)} className="cua-card w-full p-4 text-left">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="cua-serif text-[17px]">{e.nombre}</span>
                <span className="cua-mono text-[11px]" style={{ color: "var(--cua-faint)" }}>
                  {CUARTEL_ESTADO_LABEL[e.estado]}
                  {e.cierre.fechaDecision ? ` · ${e.cierre.fechaDecision}` : ""}
                </span>
              </div>

              <div className="cua-faint cua-mono mt-1.5 text-[11px]">{CUARTEL_CATEGORIA_LABEL[e.categoria]}</div>

              <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
                <div>
                  <span className="cua-label">Eligió</span>{" "}
                  <span>{etiquetaRuta(elegida) ?? "— sin registrar —"}</span>
                  {difiere && (
                    <span className="cua-faint"> · el sistema recomendaba {etiquetaRuta(recomendada)}</span>
                  )}
                </div>

                {e.cierre.movidaConcreta && (
                  <div>
                    <span className="cua-label">Movida</span>{" "}
                    <span className={e.cierre.movidaEjecutada ? "" : "cua-muted"}>
                      {e.cierre.movidaConcreta}
                    </span>{" "}
                    <span
                      className="cua-mono text-[11px]"
                      style={{ color: e.cierre.movidaEjecutada ? "#5cc98e" : "#e0a83a" }}
                    >
                      {e.cierre.movidaEjecutada ? "ejecutada" : "sin ejecutar"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="cua-label">Resultado</span>{" "}
                  <span className={e.cierre.resultado ? "" : "cua-faint"}>
                    {e.cierre.resultado || "sin registrar todavía"}
                  </span>
                </div>

                {e.patronRepetido && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="cua-label">Patrón</span>
                    <CertezaTag certeza={e.certezaPatron} />
                    <span
                      className="cua-mono text-[11px]"
                      style={{
                        color:
                          e.cierre.patronConfirmado === true
                            ? "#e0483a"
                            : e.cierre.patronConfirmado === false
                              ? "#5cc98e"
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
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

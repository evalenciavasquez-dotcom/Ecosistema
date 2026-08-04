"use client";

import { useMemo } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { diasEstancado, diasHasta, veredictosDe } from "@/lib/cuartel/candado";
import { CUARTEL_CATEGORIA_LABEL, CuartelEscenario } from "@/lib/cuartel/types";
import { Panel, PanelLabel, StatCard } from "../primitives";

export default function InicioSection() {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);
  const setSeccion = useCuartelStore((s) => s.setSeccion);

  const datos = useMemo(() => {
    const hoy = new Date();
    const dist = { validas: 0, pendientes: 0, descartadas: 0 };

    for (const e of escenarios) {
      for (const v of Object.values(veredictosDe(e))) {
        if (v.validez === "valida") dist.validas++;
        else if (v.validez === "pendiente") dist.pendientes++;
        else dist.descartadas++;
      }
    }

    const activos = escenarios.filter((e) => e.estado !== "cerrado");
    const proximas = escenarios
      .filter((e) => e.estado !== "cerrado")
      .map((e) => ({ escenario: e, dias: diasHasta(e.fechaLimite, hoy) }))
      .filter((x): x is { escenario: CuartelEscenario; dias: number } => x.dias !== null && x.dias <= 14)
      .sort((a, b) => a.dias - b.dias);

    const estancados = escenarios
      .map((e) => ({ escenario: e, dias: diasEstancado(e, hoy) }))
      .filter((x): x is { escenario: CuartelEscenario; dias: number } => x.dias !== null && x.dias > 30)
      .sort((a, b) => b.dias - a.dias);

    // Métrica principal del PRD: de lo decidido, cuánto llegó a una movida
    // efectivamente ejecutada. Analizada no cuenta.
    const decididos = escenarios.filter((e) => !!e.cierre.fechaDecision);
    const ejecutadas = decididos.filter((e) => e.cierre.movidaEjecutada).length;

    return { dist, activos, proximas, estancados, decididos: decididos.length, ejecutadas };
  }, [escenarios]);

  if (escenarios.length === 0) {
    return (
      <Panel>
        <div className="cua-serif mb-2.5 text-[19px] font-semibold">Todavía no hay ningún escenario</div>
        <p className="text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Un escenario es cualquier situación personal sin resolución obvia: una relación que ya no aporta pero cuesta
          soltar, algo pendiente con la familia, una decisión de tiempo o energía. Al crearlo nacen sus tres rutas base —
          Cortar, Sostener, Rediseñar — y desde ahí se analiza.
        </p>
        <button className="cua-btn-primary mt-5" onClick={() => setSeccion("escenarios")}>
          Cargar el primer escenario
        </button>
      </Panel>
    );
  }

  const total = Math.max(1, datos.dist.validas + datos.dist.pendientes + datos.dist.descartadas);
  const segmentos = [
    { label: "Válidas", count: datos.dist.validas, color: "var(--cua-verde)" },
    { label: "Pendientes", count: datos.dist.pendientes, color: "var(--cua-amarillo)" },
    { label: "Descartadas", count: datos.dist.descartadas, color: "var(--cua-rojo)" },
  ];

  return (
    <div>
      <div className="mb-7 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard value={datos.activos.length} label="Escenarios activos" />
        <StatCard value={datos.dist.descartadas} label="Rutas descartadas por candado" />
        <StatCard value={datos.proximas.length} label="Con fecha límite ≤ 14 días" />
        <StatCard
          value={datos.decididos ? `${Math.round((datos.ejecutadas / datos.decididos) * 100)}%` : "—"}
          label="Movidas ejecutadas"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <Panel>
          <PanelLabel>Distribución de rutas</PanelLabel>
          <div className="mb-3.5 flex h-4 overflow-hidden rounded-sm">
            {segmentos.map((s) => (
              <div key={s.label} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
            ))}
          </div>
          {segmentos.map((s) => (
            <div key={s.label} className="mb-1.5 flex items-center gap-2">
              <div className="h-[9px] w-[9px] rounded-sm" style={{ background: s.color }} />
              <div className="text-[13px]" style={{ color: "var(--cua-text-2)" }}>
                {s.label}
              </div>
              <div className="cua-mono ml-auto text-[12px]" style={{ color: "var(--cua-faint)" }}>
                {s.count}
              </div>
            </div>
          ))}
          <p className="mt-3.5 text-[12px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
            Pendiente no es un estado neutro: esa ruta todavía no se puede comparar con las otras.
          </p>
        </Panel>

        <Panel>
          <PanelLabel>Fecha límite ≤ 14 días</PanelLabel>
          {datos.proximas.length === 0 ? (
            <div className="text-[13px] italic" style={{ color: "var(--cua-faint)" }}>
              Nada con fecha límite próxima.
            </div>
          ) : (
            datos.proximas.map(({ escenario, dias }) => (
              <button
                key={escenario.id}
                onClick={() => abrirEscenario(escenario.id)}
                className="w-full py-2.5 text-left"
                style={{ borderBottom: "1px solid var(--cua-border-soft)" }}
              >
                <div className="text-[13.5px]">{escenario.nombre}</div>
                <div
                  className="cua-mono mt-[3px] text-[11px]"
                  style={{ color: dias < 0 ? "var(--cua-rojo)" : "var(--cua-amarillo)" }}
                >
                  {dias < 0 ? `vencida hace ${Math.abs(dias)} días` : `${dias} días`} ·{" "}
                  {CUARTEL_CATEGORIA_LABEL[escenario.categoria]}
                </div>
              </button>
            ))
          )}
        </Panel>
      </div>

      {datos.estancados.length > 0 && (
        <Panel className="mt-4">
          <PanelLabel>Estancados hace más de 30 días</PanelLabel>
          <p className="mb-3 text-[13px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
            Sostener sin decidir también es una decisión — solo que tomada por default.
          </p>
          {datos.estancados.map(({ escenario, dias }) => (
            <button
              key={escenario.id}
              onClick={() => abrirEscenario(escenario.id)}
              className="flex w-full items-baseline justify-between gap-3 py-2 text-left"
              style={{ borderTop: "1px solid var(--cua-border-soft)" }}
            >
              <span className="text-[13.5px]">{escenario.nombre}</span>
              <span className="cua-mono shrink-0 text-[11px]" style={{ color: "var(--cua-amarillo)" }}>
                {dias} días
              </span>
            </button>
          ))}
        </Panel>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { diasEstancado, diasHasta, veredictosDe } from "@/lib/cuartel/candado";
import { CUARTEL_CATEGORIA_LABEL, CUARTEL_ESTADO_LABEL } from "@/lib/cuartel/types";
import { Panel, PanelLabel, SectionHeader, StatCard } from "../primitives";

export default function InicioSection() {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);
  const setSeccion = useCuartelStore((s) => s.setSeccion);

  const datos = useMemo(() => {
    const hoy = new Date();
    let validas = 0;
    let pendientes = 0;
    let descartadas = 0;

    for (const e of escenarios) {
      for (const v of Object.values(veredictosDe(e))) {
        if (v.validez === "valida") validas++;
        else if (v.validez === "pendiente") pendientes++;
        else descartadas++;
      }
    }

    const activos = escenarios.filter((e) => e.estado === "activo" || e.estado === "analisis");
    const conLimite = escenarios
      .filter((e) => e.estado !== "cerrado")
      .map((e) => ({ escenario: e, dias: diasHasta(e.fechaLimite, hoy) }))
      .filter((x): x is { escenario: (typeof escenarios)[number]; dias: number } => x.dias !== null && x.dias <= 14)
      .sort((a, b) => a.dias - b.dias);

    const estancados = escenarios
      .map((e) => ({ escenario: e, dias: diasEstancado(e, hoy) }))
      .filter((x): x is { escenario: (typeof escenarios)[number]; dias: number } => x.dias !== null && x.dias > 30)
      .sort((a, b) => b.dias - a.dias);

    // Métrica principal del PRD: de las decisiones tomadas, cuántas llegaron a
    // una movida efectivamente ejecutada. Analizar sin ejecutar no cuenta.
    const decididos = escenarios.filter((e) => !!e.cierre.fechaDecision);
    const ejecutadas = decididos.filter((e) => e.cierre.movidaEjecutada).length;

    return {
      validas,
      pendientes,
      descartadas,
      activos,
      conLimite,
      estancados,
      decididos: decididos.length,
      ejecutadas,
    };
  }, [escenarios]);

  if (escenarios.length === 0) {
    return (
      <>
        <SectionHeader
          eyebrow="Inicio"
          title="Todavía no hay ningún escenario cargado"
          subtitle="El Cuartel no sirve de nada vacío. Cargá la primera situación que hoy está sin resolver — la que se viene sosteniendo sin decidir."
        />
        <Panel>
          <p className="cua-muted text-sm leading-relaxed">
            Un escenario es cualquier situación personal sin resolución obvia: una relación que ya no aporta pero cuesta
            soltar, algo pendiente con la familia, una decisión de tiempo o energía. Al crearlo nacen sus tres rutas base
            —Cortar, Sostener, Rediseñar— y desde ahí se analiza.
          </p>
          <button className="cua-btn-primary mt-5" onClick={() => setSeccion("escenarios")}>
            Cargar el primer escenario
          </button>
        </Panel>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow="Inicio"
        title="Estado del Cuartel"
        subtitle="Qué está abierto, qué venció, qué descartó el candado y qué lleva demasiado tiempo sin decidirse."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={datos.activos.length} label="Escenarios abiertos" />
        <StatCard value={escenarios.length} label="Escenarios totales" />
        <StatCard value={datos.descartadas} label="Rutas descartadas por candado" color="#e0483a" />
        <StatCard
          value={datos.decididos ? `${Math.round((datos.ejecutadas / datos.decididos) * 100)}%` : "—"}
          label="Movidas ejecutadas"
          color="#5cc98e"
        />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Panel>
          <PanelLabel>Distribución de rutas</PanelLabel>
          <div className="space-y-2.5">
            <Distribucion label="Válidas" valor={datos.validas} total={datos.validas + datos.pendientes + datos.descartadas} color="#5cc98e" />
            <Distribucion label="Pendientes" valor={datos.pendientes} total={datos.validas + datos.pendientes + datos.descartadas} color="#a09889" />
            <Distribucion label="Descartadas" valor={datos.descartadas} total={datos.validas + datos.pendientes + datos.descartadas} color="#e0483a" />
          </div>
          <p className="cua-faint mt-4 text-[12px] leading-relaxed">
            Pendiente no es un estado neutro: significa que esa ruta todavía no se puede comparar con las otras.
          </p>
        </Panel>

        <Panel>
          <PanelLabel>Fecha límite en 14 días</PanelLabel>
          {datos.conLimite.length === 0 ? (
            <p className="cua-faint text-[13px]">Ningún escenario con fecha límite cerca.</p>
          ) : (
            <ul className="space-y-2.5">
              {datos.conLimite.map(({ escenario, dias }) => (
                <li key={escenario.id}>
                  <button
                    onClick={() => abrirEscenario(escenario.id)}
                    className="flex w-full items-baseline justify-between gap-3 text-left"
                  >
                    <span className="text-[13.5px]">{escenario.nombre}</span>
                    <span
                      className="cua-mono shrink-0 text-[11px]"
                      style={{ color: dias < 0 ? "#e0483a" : dias <= 3 ? "#e0a83a" : "var(--cua-muted)" }}
                    >
                      {dias < 0 ? `vencida hace ${Math.abs(dias)}d` : dias === 0 ? "hoy" : `en ${dias}d`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {datos.estancados.length > 0 && (
        <Panel className="mb-6">
          <PanelLabel>Estancados hace más de 30 días</PanelLabel>
          <p className="cua-muted mb-3.5 text-[13px] leading-relaxed">
            Sostener sin decidir también es una decisión — solo que tomada por default. Estos escenarios llevan más de un
            mes abiertos sin cerrar.
          </p>
          <ul className="space-y-2">
            {datos.estancados.map(({ escenario, dias }) => (
              <li key={escenario.id}>
                <button
                  onClick={() => abrirEscenario(escenario.id)}
                  className="flex w-full items-baseline justify-between gap-3 text-left"
                >
                  <span className="text-[13.5px]">{escenario.nombre}</span>
                  <span className="cua-mono shrink-0 text-[11px]" style={{ color: "#e0a83a" }}>
                    {dias} días
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelLabel>Escenarios abiertos</PanelLabel>
        {datos.activos.length === 0 ? (
          <p className="cua-faint text-[13px]">Nada abierto ahora mismo.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--cua-border)" }}>
            {datos.activos.map((e) => (
              <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                <button onClick={() => abrirEscenario(e.id)} className="w-full text-left">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px]">{e.nombre}</span>
                    <span className="cua-mono shrink-0 text-[11px]" style={{ color: "var(--cua-faint)" }}>
                      {CUARTEL_ESTADO_LABEL[e.estado]}
                    </span>
                  </div>
                  <div className="cua-faint cua-mono mt-1 text-[11px]">
                    {CUARTEL_CATEGORIA_LABEL[e.categoria]} · {e.rutas.length} rutas
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Distribucion({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="cua-mono w-24 shrink-0 text-[11px]" style={{ color: "var(--cua-muted)" }}>
        {label}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="cua-mono w-8 shrink-0 text-right text-[11px]">{valor}</div>
    </div>
  );
}

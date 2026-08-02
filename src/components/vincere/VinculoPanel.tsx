"use client";

import {
  VincereProyecto,
  VincereVinculoTipo,
  VINCERE_VINCULO_DESC,
  VINCERE_VINCULO_LABEL,
  participaDelNegocio,
  vinculoVacio,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { Panel, PanelLabel } from "./primitives";

const TIPOS: VincereVinculoTipo[] = ["propio", "socio", "cliente", "evaluando", "ninguno"];

const TIPO_COLOR: Record<VincereVinculoTipo, string> = {
  propio: "#5cc98e",
  socio: "#2dd4bf",
  cliente: "#e0a83a",
  evaluando: "#a39c92",
  ninguno: "#6b645c",
};

// Semana de trabajo de referencia para leer la carga. No es un límite duro:
// es la vara contra la que se mide si queda espacio para un caso más.
const HORAS_SEMANA_REFERENCIA = 40;

export default function VinculoPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const updateVinculo = useVincereStore((s) => s.updateVinculo);
  const proyectos = useVincereStore((s) => s.proyectos);

  const v = proyecto.vinculo ?? vinculoVacio();
  const esCliente = v.tipo === "cliente";
  const esParticipacion = v.tipo === "propio" || v.tipo === "socio";
  const esEvaluando = v.tipo === "evaluando";

  // Carga total comprometida en todos los proyectos, no solo en este. Es lo
  // que convierte el costo de oportunidad en un número: el cuello de botella
  // de un equipo chico es el tiempo, no las ganas.
  const comprometidas = proyectos
    .filter((p) => p.vinculo?.confirmado && p.vinculo.horasSemanales)
    .reduce((t, p) => t + (p.vinculo?.horasSemanales ?? 0), 0);
  const enEvaluacion = proyectos
    .filter((p) => p.vinculo && !p.vinculo.confirmado && p.vinculo.horasSemanales)
    .reduce((t, p) => t + (p.vinculo?.horasSemanales ?? 0), 0);
  const libres = HORAS_SEMANA_REFERENCIA - comprometidas;
  const pctComprometido = Math.min(100, Math.round((comprometidas / HORAS_SEMANA_REFERENCIA) * 100));
  const pctEvaluando = Math.min(100 - pctComprometido, Math.round((enEvaluacion / HORAS_SEMANA_REFERENCIA) * 100));

  return (
    <Panel>
      <PanelLabel>Tu vínculo con este proyecto</PanelLabel>
      <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
        Un cliente al que le cobras y un proyecto donde participas son negocios distintos, y el análisis cambia según
        cuál sea. Si todavía no hay acuerdo, déjalo sin confirmar: lo que se está pensando no se cuenta como ingreso.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button
            key={t}
            onClick={() => updateVinculo(proyecto.id, { tipo: t })}
            className="rounded-full border px-2.5 py-1 vin-t-sm transition-colors"
            style={{
              color: v.tipo === t ? TIPO_COLOR[t] : "var(--vin-dim)",
              borderColor: v.tipo === t ? `${TIPO_COLOR[t]}66` : "var(--vin-border)",
              background: v.tipo === t ? `${TIPO_COLOR[t]}14` : "transparent",
            }}
          >
            {VINCERE_VINCULO_LABEL[t]}
          </button>
        ))}
      </div>
      <p className="vin-muted mb-4 vin-t-sm leading-relaxed">{VINCERE_VINCULO_DESC[v.tipo]}</p>

      {v.tipo !== "ninguno" && (
        <>
          <div className="mb-3 grid gap-3 md:grid-cols-3">
            {esParticipacion && (
              <Campo
                label="Participación %"
                valor={v.participacionPct?.toString() ?? ""}
                onChange={(x) => updateVinculo(proyecto.id, { participacionPct: x ? Number(x) : null })}
                tipo="number"
              />
            )}
            {esCliente && (
              <>
                <Campo
                  label="Tarifa"
                  valor={v.tarifa?.toString() ?? ""}
                  onChange={(x) => updateVinculo(proyecto.id, { tarifa: x ? Number(x) : null })}
                  tipo="number"
                />
                <Campo
                  label="Periodicidad"
                  valor={v.periodicidad}
                  onChange={(x) => updateVinculo(proyecto.id, { periodicidad: x })}
                />
              </>
            )}
            {esEvaluando && (
              <>
                <Campo
                  label="% que pedirías"
                  valor={v.participacionPct?.toString() ?? ""}
                  onChange={(x) => updateVinculo(proyecto.id, { participacionPct: x ? Number(x) : null })}
                  tipo="number"
                />
                <Campo
                  label="O tarifa que cobrarías"
                  valor={v.tarifa?.toString() ?? ""}
                  onChange={(x) => updateVinculo(proyecto.id, { tarifa: x ? Number(x) : null })}
                  tipo="number"
                />
              </>
            )}
            <Campo
              label="Horas por semana"
              valor={v.horasSemanales?.toString() ?? ""}
              onChange={(x) => updateVinculo(proyecto.id, { horasSemanales: x ? Number(x) : null })}
              tipo="number"
            />
          </div>

          <label className="mb-3 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={v.confirmado}
              onChange={(e) => updateVinculo(proyecto.id, { confirmado: e.target.checked })}
              className="h-4 w-4 shrink-0 accent-[var(--vin-accent)]"
            />
            <span className="vin-t-base">
              {v.confirmado ? "Acordado y en marcha" : "Todavía lo estoy pensando"}
            </span>
            {!v.confirmado && (
              <span className="vin-faint vin-t-sm">— no se cuenta como ingreso ni como carga real</span>
            )}
          </label>

          <input
            value={v.notas}
            onChange={(e) => updateVinculo(proyecto.id, { notas: e.target.value })}
            placeholder="Condiciones, revisiones, lo que haga falta recordar"
            className="vin-input"
          />
        </>
      )}

      {/* La capacidad se muestra siempre: es el dato que corrige la ilusión de
          que se puede tomar un caso más. */}
      <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--vin-border)" }}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="vin-faint vin-t-xs uppercase tracking-[0.08em]">Tu carga semanal, todos los proyectos</span>
          <span className="vin-t-sm tabular-nums">
            <span style={{ color: libres <= 0 ? "#e0483a" : libres <= 8 ? "#e0a83a" : "#5cc98e" }}>
              {comprometidas}h
            </span>
            <span className="vin-faint"> comprometidas de ~{HORAS_SEMANA_REFERENCIA}h</span>
          </span>
        </div>
        <div className="vin-bar-track flex h-2 overflow-hidden">
          <div style={{ width: `${pctComprometido}%`, background: "#2dd4bf" }} />
          <div style={{ width: `${pctEvaluando}%`, background: "rgba(224,168,58,0.55)" }} />
        </div>
        <p className="vin-faint mt-2 vin-t-sm leading-relaxed">
          {libres <= 0
            ? "Sin horas libres. Tomar un caso más significa soltar otro, no sumarlo."
            : `Quedan ~${libres}h libres por semana.`}
          {enEvaluacion > 0 && ` ${enEvaluacion}h más están en proyectos que todavía estás evaluando.`}
        </p>
      </div>

      {participaDelNegocio(proyecto.vinculo) && !v.confirmado && (
        <p className="vin-faint mt-3 vin-t-sm leading-relaxed" style={{ color: "#e0a83a" }}>
          Marcado como no confirmado: los análisis van a tratar esta participación como hipótesis, no como ingreso.
        </p>
      )}
    </Panel>
  );
}

function Campo({
  label,
  valor,
  onChange,
  tipo = "text",
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
}) {
  return (
    <div>
      <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">{label}</div>
      <input type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} className="vin-input" />
    </div>
  );
}

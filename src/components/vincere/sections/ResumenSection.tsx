"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { formatFollowers, formatStreams, signed } from "@/lib/vincere/format";
import SectionShell from "../SectionShell";
import StreamsChart from "../StreamsChart";
import { Panel, PanelLabel, StatCard } from "../primitives";

const SCENARIO_DEFS = [
  { name: "Pierde", rate: -8 },
  { name: "Break-even", rate: 0 },
  { name: "Probable", rate: 8 },
  { name: "Gana", rate: 18 },
  { name: "Expansión", rate: 30 },
];

export default function ResumenSection({ proyecto }: { proyecto: VincereProyecto }) {
  const updateResumen = useVincereStore((s) => s.updateResumen);
  const [growth, setGrowth] = useState(12);
  const [editing, setEditing] = useState(false);

  const r = proyecto.resumen;
  const projected = Math.round(r.streamsMes * Math.pow(1 + growth / 100, 3));

  let nearest = 0;
  let minDiff = Infinity;
  SCENARIO_DEFS.forEach((d, i) => {
    const diff = Math.abs(d.rate - growth);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = i;
    }
  });

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="resumen"
      eyebrow="Resumen"
      title="Career Momentum"
      subtitle={`Estado general de la carrera de ${proyecto.nombre} en este momento.`}
      aiTitle="Lectura VINCERE — Momentum"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard value={formatStreams(r.streamsMes)} label={`Streams/mes · ${signed(r.streamsCambioPct)}`} />
        <StatCard value={formatFollowers(r.seguidores)} label={`Seguidores · ${signed(r.seguidoresCambioPct)}`} />
        <StatCard value={`${r.momentumIndex}/100`} label="Momentum Index" />
        <StatCard value={<span className="text-lg">{proyecto.fase}</span>} label="Fase de carrera" />
      </div>

      <Panel>
        <PanelLabel>Streams · últimos meses (miles)</PanelLabel>
        <StreamsChart serie={r.serie} />
      </Panel>

      <Panel>
        <div className="mb-1 flex items-center justify-between">
          <PanelLabel>Ajuste de escenario</PanelLabel>
          <button className="vin-faint text-xs hover:underline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cerrar edición" : "Editar data"}
          </button>
        </div>
        <p className="vin-faint mb-3.5 text-[13px]">Crecimiento mensual esperado: {growth}%</p>
        <input
          type="range"
          min={-10}
          max={30}
          step={1}
          value={growth}
          onChange={(e) => setGrowth(Number(e.target.value))}
          className="vin-range mb-4"
        />
        <p className="vin-serif mb-4 text-xl">
          {formatStreams(projected)} streams proyectados a 90 días
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SCENARIO_DEFS.map((d, i) => {
            const val = Math.round(r.streamsMes * Math.pow(1 + d.rate / 100, 3));
            const active = i === nearest;
            return (
              <div
                key={d.name}
                className="rounded-sm p-3 text-center"
                style={{
                  background: active ? "var(--vin-accent)" : "var(--vin-surface-2)",
                  border: `1px solid ${active ? "var(--vin-accent)" : "var(--vin-border-strong)"}`,
                  color: active ? "var(--vin-text)" : "var(--vin-muted)",
                }}
              >
                <div className="mb-1.5 text-[11px]">{d.name}</div>
                <div className="vin-serif text-[15px]">{formatStreams(val)}</div>
              </div>
            );
          })}
        </div>

        {editing && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1.25rem" }}>
            <NumberInput label="Streams/mes" value={r.streamsMes} onChange={(v) => updateResumen(proyecto.id, { streamsMes: v })} />
            <NumberInput label="Cambio streams %" value={r.streamsCambioPct} onChange={(v) => updateResumen(proyecto.id, { streamsCambioPct: v })} />
            <NumberInput label="Seguidores" value={r.seguidores} onChange={(v) => updateResumen(proyecto.id, { seguidores: v })} />
            <NumberInput label="Cambio seguidores %" value={r.seguidoresCambioPct} onChange={(v) => updateResumen(proyecto.id, { seguidoresCambioPct: v })} />
            <NumberInput label="Momentum Index" value={r.momentumIndex} onChange={(v) => updateResumen(proyecto.id, { momentumIndex: v })} />
          </div>
        )}
      </Panel>
    </SectionShell>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="vin-faint text-[11px] uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vin-input"
      />
    </label>
  );
}

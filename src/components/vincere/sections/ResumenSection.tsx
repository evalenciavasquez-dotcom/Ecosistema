"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { formatFollowers, formatStreams, signed } from "@/lib/vincere/format";
import SectionShell from "../SectionShell";
import StreamsChart from "../StreamsChart";
import AlertasPanel from "../AlertasPanel";
import EvolucionPanel from "../EvolucionPanel";
import MotoresRunner from "../MotoresRunner";
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
      <AlertasPanel proyecto={proyecto} compacto />

      {/* La cifra principal manda: ocupa el ancho, lleva su curva adentro y el
          resto queda a su lado. Cuatro tarjetas iguales no dicen cuál importa. */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="vin-card flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="vin-stat vin-serif" style={{ fontSize: "42px" }}>
                {formatStreams(r.streamsMes)}
              </div>
              <div className="vin-faint vin-t-sm mt-2">Streams al mes</div>
            </div>
            <span
              className="vin-t-base shrink-0 rounded-full px-3 py-1 tabular-nums"
              style={{
                color: r.streamsCambioPct >= 0 ? "var(--vin-ok)" : "var(--vin-risk)",
                background: r.streamsCambioPct >= 0 ? "rgba(78,201,138,0.11)" : "rgba(240,90,72,0.11)",
              }}
            >
              {signed(r.streamsCambioPct)}
            </span>
          </div>
          <div>
            <StreamsChart serie={r.serie} />
            <div className="vin-faint vin-t-xs mt-2">Últimos meses, en miles</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <StatCard
            value={formatFollowers(r.seguidores)}
            label="Seguidores"
            delta={signed(r.seguidoresCambioPct)}
            tono={r.seguidoresCambioPct >= 0 ? "bueno" : "malo"}
          />
          <StatCard value={`${r.momentumIndex}`} label="Momentum Index · sobre 100" />
          <div className="vin-card col-span-2 flex flex-col justify-center gap-1.5 p-5 lg:col-span-1">
            <div className="vin-serif vin-t-lg">{proyecto.fase}</div>
            <div className="vin-faint vin-t-sm">Fase de carrera</div>
          </div>
        </div>
      </div>

      {/* Después de las cifras, no antes: primero se ve dónde está el artista,
          después se ofrece interpretarlo. */}
      <MotoresRunner proyecto={proyecto} />

      <EvolucionPanel proyecto={proyecto} />

      <Panel>
        <div className="mb-1 flex items-center justify-between">
          <PanelLabel>Ajuste de escenario</PanelLabel>
          <button className="vin-faint vin-t-xs hover:underline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cerrar edición" : "Editar data"}
          </button>
        </div>
        <p className="vin-faint mb-3.5 vin-t-sm">Crecimiento mensual esperado: {growth}%</p>
        <input
          type="range"
          min={-10}
          max={30}
          step={1}
          value={growth}
          onChange={(e) => setGrowth(Number(e.target.value))}
          className="vin-range mb-4"
        />
        <p className="vin-serif mb-4 vin-t-xl">
          {formatStreams(projected)} streams proyectados a 90 días
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {SCENARIO_DEFS.map((d, i) => {
            const val = Math.round(r.streamsMes * Math.pow(1 + d.rate / 100, 3));
            const active = i === nearest;
            return (
              <div
                key={d.name}
                className="rounded-xl p-3 text-center"
                style={{
                  background: active ? "var(--vin-accent)" : "var(--vin-surface-2)",
                  border: `1px solid ${active ? "var(--vin-accent)" : "var(--vin-border-strong)"}`,
                  color: active ? "var(--vin-text)" : "var(--vin-muted)",
                }}
              >
                <div className="mb-1.5 vin-t-xs">{d.name}</div>
                <div className="vin-serif vin-t-base">{formatStreams(val)}</div>
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
      <span className="vin-faint vin-t-xs uppercase tracking-wide">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vin-input"
      />
    </label>
  );
}

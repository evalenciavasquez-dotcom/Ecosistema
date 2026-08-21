"use client";

import { useState } from "react";
import { VincereProyecto, VincereOrigenStreams } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { formatFollowers, formatStreams, signed } from "@/lib/vincere/format";
import SectionShell from "../SectionShell";
import StreamsChart from "../StreamsChart";
import AlertasPanel from "../AlertasPanel";
import EvolucionPanel from "../EvolucionPanel";
import MotoresRunner from "../MotoresRunner";
import FanRatePanel from "../FanRatePanel";
import CalidadAudienciaPanel from "../CalidadAudienciaPanel";
import CatalogoPanel from "../CatalogoPanel";
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

      <FanRatePanel proyecto={proyecto} />
      <CalidadAudienciaPanel proyecto={proyecto} />
      <CatalogoPanel proyecto={proyecto} />

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
            <NumberInput
              label="Oyentes mensuales"
              value={r.oyentesMes ?? 0}
              onChange={(v) => updateResumen(proyecto.id, { oyentesMes: v })}
            />
            <NumberInput label="Cambio seguidores %" value={r.seguidoresCambioPct} onChange={(v) => updateResumen(proyecto.id, { seguidoresCambioPct: v })} />
            <NumberInput label="Momentum Index" value={r.momentumIndex} onChange={(v) => updateResumen(proyecto.id, { momentumIndex: v })} />
          </div>
        )}

        {editing && <OrigenStreamsInputs proyecto={proyecto} />}
      </Panel>
    </SectionShell>
  );
}

// De dónde vienen los streams.
//
// Los cuatro porcentajes salen tal cual de Spotify for Artists → Audiencia →
// Fuentes de streams, y por eso el bloque dice dónde buscarlos: si el dato hay
// que ir a copiarlo a otra pantalla, el sistema tiene que decir a cuál.
//
// Se dejan vacíos en vez de en cero. Cero por ciento de playlist es una
// afirmación; no haberlo cargado es otra cosa, y confundirlas haría que el
// indicador hable de un reparto que nadie midió.
function OrigenStreamsInputs({ proyecto }: { proyecto: VincereProyecto }) {
  const updateResumen = useVincereStore((s) => s.updateResumen);
  const o = proyecto.resumen.origenStreams;

  const set = (patch: Partial<VincereOrigenStreams>) =>
    updateResumen(proyecto.id, {
      origenStreams: {
        ...o,
        ...patch,
        // La fecha se sella sola: el desglose de Spotify es una foto de un
        // período, y sin fecha no se sabe si describe el mes pasado o el año.
        fecha: new Date().toISOString().slice(0, 10),
      },
    });

  const suma =
    (o?.playlistPct ?? 0) + (o?.algoritmicoPct ?? 0) + (o?.perfilPct ?? 0) + (o?.externoPct ?? 0);
  const cargado = o != null && suma > 0;
  const pasado = suma > 100.5;

  return (
    <div className="mt-5" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1.25rem" }}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-sm font-medium">De dónde vienen los streams</span>
        {cargado && (
          <span
            className="vin-t-xs tabular-nums"
            style={{ color: pasado ? "var(--vin-risk)" : "var(--vin-faint)" }}
          >
            {pasado
              ? `suman ${Math.round(suma)}% — hay algo mal copiado`
              : suma >= 85
                ? `suman ${Math.round(suma)}%`
                : `suman ${Math.round(suma)}% · queda ${Math.round(100 - suma)}% sin clasificar`}
          </span>
        )}
      </div>
      <p className="vin-faint vin-t-xs mb-3.5">
        Spotify for Artists → Audiencia → Fuentes de streams. No hace falta que sumen 100: lo que
        falte se muestra como sin clasificar en vez de repartirse.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PctInput label="Playlists %" value={o?.playlistPct} onChange={(v) => set({ playlistPct: v })} />
        <PctInput label="Algorítmico %" value={o?.algoritmicoPct} onChange={(v) => set({ algoritmicoPct: v })} />
        <PctInput label="Perfil %" value={o?.perfilPct} onChange={(v) => set({ perfilPct: v })} />
        <PctInput label="Externo %" value={o?.externoPct} onChange={(v) => set({ externoPct: v })} />
      </div>
    </div>
  );
}

function PctInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="vin-faint vin-t-xs uppercase tracking-wide">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={0.1}
        placeholder="—"
        value={value ?? ""}
        onChange={(e) => {
          const t = e.target.value.trim();
          onChange(t === "" ? undefined : Number(t));
        }}
        className="vin-input"
      />
    </label>
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

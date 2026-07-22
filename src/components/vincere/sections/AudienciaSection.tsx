"use client";

import { useState } from "react";
import { VincereAudienciaSegmento, VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { BarRow, Panel, PanelLabel } from "../primitives";

type Campo = "edad" | "plataformas" | "paises";

export default function AudienciaSection({ proyecto }: { proyecto: VincereProyecto }) {
  const setSegmentos = useVincereStore((s) => s.setAudienciaSegmentos);
  const [editing, setEditing] = useState<Campo | null>(null);
  const a = proyecto.audiencia;

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="audiencia"
      eyebrow="Audiencia"
      title="Audiencia y Segmentos"
      subtitle="Quién escucha y dónde."
      aiTitle="Lectura VINCERE — Audiencia"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <SegmentPanel
          label="Edad"
          campo="edad"
          segmentos={a.edad}
          editing={editing === "edad"}
          onToggle={() => setEditing(editing === "edad" ? null : "edad")}
          onChange={(segs) => setSegmentos(proyecto.id, "edad", segs)}
          labelWidth="w-14"
        />
        <SegmentPanel
          label="Plataformas"
          campo="plataformas"
          segmentos={a.plataformas}
          editing={editing === "plataformas"}
          onToggle={() => setEditing(editing === "plataformas" ? null : "plataformas")}
          onChange={(segs) => setSegmentos(proyecto.id, "plataformas", segs)}
          labelWidth="w-16"
        />
      </div>

      <Panel>
        <div className="mb-1 flex items-center justify-between">
          <PanelLabel>Países</PanelLabel>
          <button className="vin-faint text-xs hover:underline" onClick={() => setEditing(editing === "paises" ? null : "paises")}>
            {editing === "paises" ? "Cerrar" : "Editar"}
          </button>
        </div>
        {editing === "paises" ? (
          <SegmentEditor segmentos={a.paises} onChange={(segs) => setSegmentos(proyecto.id, "paises", segs)} />
        ) : a.paises.length === 0 ? (
          <p className="vin-muted text-sm">Sin data de países.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {a.paises.map((c) => (
              <div key={c.label} className="text-center">
                <div className="vin-serif text-[22px]">{c.pct}%</div>
                <div className="vin-faint mt-1 text-xs">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </SectionShell>
  );
}

function SegmentPanel({
  label,
  segmentos,
  editing,
  onToggle,
  onChange,
  labelWidth,
}: {
  label: string;
  campo: Campo;
  segmentos: VincereAudienciaSegmento[];
  editing: boolean;
  onToggle: () => void;
  onChange: (segs: VincereAudienciaSegmento[]) => void;
  labelWidth: string;
}) {
  return (
    <Panel>
      <div className="mb-1 flex items-center justify-between">
        <PanelLabel>{label}</PanelLabel>
        <button className="vin-faint text-xs hover:underline" onClick={onToggle}>
          {editing ? "Cerrar" : "Editar"}
        </button>
      </div>
      {editing ? (
        <SegmentEditor segmentos={segmentos} onChange={onChange} />
      ) : segmentos.length === 0 ? (
        <p className="vin-muted text-sm">Sin data.</p>
      ) : (
        segmentos.map((seg) => <BarRow key={seg.label} label={seg.label} pct={seg.pct} labelWidth={labelWidth} />)
      )}
    </Panel>
  );
}

function SegmentEditor({
  segmentos,
  onChange,
}: {
  segmentos: VincereAudienciaSegmento[];
  onChange: (segs: VincereAudienciaSegmento[]) => void;
}) {
  const [nuevoLabel, setNuevoLabel] = useState("");

  return (
    <div className="space-y-2">
      {segmentos.map((seg, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={seg.label}
            onChange={(e) => onChange(segmentos.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
            className="vin-input flex-1"
          />
          <input
            type="number"
            value={seg.pct}
            onChange={(e) => onChange(segmentos.map((s, j) => (j === i ? { ...s, pct: Number(e.target.value) } : s)))}
            className="vin-input w-20"
          />
          <button
            onClick={() => onChange(segmentos.filter((_, j) => j !== i))}
            className="vin-faint px-1 text-xs hover:underline"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <input
          value={nuevoLabel}
          onChange={(e) => setNuevoLabel(e.target.value)}
          placeholder="Nuevo segmento"
          className="vin-input flex-1"
        />
        <button
          onClick={() => {
            if (!nuevoLabel.trim()) return;
            onChange([...segmentos, { label: nuevoLabel.trim(), pct: 0 }]);
            setNuevoLabel("");
          }}
          className="vin-btn-ghost"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}

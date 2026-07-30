"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

export default function KpisSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addKpi = useVincereStore((s) => s.addKpi);
  const deleteKpi = useVincereStore((s) => s.deleteKpi);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", actual: "", meta: "", unidad: "", nota: "" });

  const kpis = proyecto.kpis;

  function submit() {
    if (!form.label.trim()) return;
    addKpi(proyecto.id, {
      label: form.label.trim(),
      actual: Number(form.actual) || 0,
      meta: Number(form.meta) || 0,
      unidad: form.unidad,
      nota: form.nota,
    });
    setForm({ label: "", actual: "", meta: "", unidad: "", nota: "" });
    setAdding(false);
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="kpis"
      eyebrow="Ejecución"
      title="KPIs"
      subtitle="Avance del trimestre contra meta."
      aiTitle="Lectura VINCERE — Ejecución"
    >
      <div className="flex justify-end">
        <button className="vin-faint text-xs hover:underline" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancelar" : "+ Agregar KPI"}
        </button>
      </div>

      {adding && (
        <Panel>
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Nombre del KPI" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="vin-input md:col-span-2" />
            <input placeholder="Actual" type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} className="vin-input" />
            <input placeholder="Meta" type="number" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} className="vin-input" />
            <input placeholder="Unidad (M, %, …)" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="vin-input" />
            <input placeholder="Nota" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} className="vin-input" />
            <button onClick={submit} className="vin-btn-primary md:col-span-2">Añadir</button>
          </div>
        </Panel>
      )}

      {kpis.length === 0 ? (
        <Panel>
          <p className="vin-muted text-sm">Sin KPIs cargados.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.map((k) => {
            const pct = k.meta ? Math.min(100, Math.round((k.actual / k.meta) * 100)) : 0;
            return (
              <Panel key={k.id}>
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="vin-muted text-[13px]">{k.label}</div>
                  <button onClick={() => deleteKpi(proyecto.id, k.id)} className="vin-faint text-xs hover:underline">✕</button>
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="vin-serif text-[22px]">
                    {k.actual}
                    {k.unidad}
                  </span>
                  <span className="vin-faint text-xs">
                    meta {k.meta}
                    {k.unidad}
                  </span>
                </div>
                <div className="vin-bar-track mb-2.5 h-2">
                  <div className="vin-bar-fill h-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="vin-faint text-[12.5px] leading-relaxed">{k.nota}</div>
              </Panel>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

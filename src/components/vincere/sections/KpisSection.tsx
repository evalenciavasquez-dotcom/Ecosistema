"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";
import { metaSignificativa, valorConUnidad } from "@/lib/vincere/format";

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
        <button className="vin-faint vin-t-xs hover:underline" onClick={() => setAdding((v) => !v)}>
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
          <p className="vin-muted vin-t-sm">Sin KPIs cargados.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.map((k) => {
            // Una meta igual al valor actual —o en cero— no es una meta: es un
            // hueco que alguien rellenó copiando la cifra, cosa que hace la
            // lectura automática cuando el material no la traía. Dibujarla
            // igual produce "795.444 de 795.444" y una barra al 100% en todos
            // los indicadores a la vez, que es la forma más rápida de que un
            // tablero deje de informar.
            const conMeta = metaSignificativa(k.actual, k.meta);
            const pct = conMeta ? Math.min(100, Math.round((k.actual / k.meta) * 100)) : 0;
            return (
              <Panel key={k.id}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="vin-muted vin-t-sm">{k.label}</div>
                  <button onClick={() => deleteKpi(proyecto.id, k.id)} className="vin-faint vin-t-sm hover:underline">✕</button>
                </div>
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <span className="vin-serif vin-t-xl tabular-nums">{valorConUnidad(k.actual, k.unidad)}</span>
                  {conMeta ? (
                    <span className="vin-faint vin-t-sm shrink-0 tabular-nums">
                      meta {valorConUnidad(k.meta, k.unidad)}
                      {/* Cuando el indicador YA está en porcentaje, el avance
                          contra la meta repite la misma cifra: "72% · meta
                          100% · 72%". El bar de abajo lo dice igual. */}
                      {k.unidad?.trim() === "%" ? "" : ` · ${pct}%`}
                    </span>
                  ) : (
                    <span className="vin-faint vin-t-sm shrink-0">sin meta fijada</span>
                  )}
                </div>
                {conMeta && (
                  <div className="vin-bar-track mb-3 h-2">
                    <div className="vin-bar-fill h-full" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {k.nota && <div className="vin-faint vin-t-sm leading-relaxed">{k.nota}</div>}
              </Panel>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

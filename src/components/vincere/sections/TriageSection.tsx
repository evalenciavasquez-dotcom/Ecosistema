"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereQAEntry } from "@/lib/vincere/types";
import { fetchAsk, fetchTriage } from "@/lib/vincere/ai-client";
import { genId } from "@/lib/id";
import { SectionHeader, Panel } from "../primitives";
import EvidenceTag from "../EvidenceTag";
import QuestionBox from "../QuestionBox";

const FASES = ["Emergente", "Consolidación", "Establecido", "No lo sé aún"];

const PRIORIDAD_COLOR: Record<string, string> = {
  Alta: "#e0483a",
  Media: "#e0a83a",
  Baja: "#5cc98e",
};

export default function TriageSection() {
  const triageCasos = useVincereStore((s) => s.triageCasos);
  const addTriageCaso = useVincereStore((s) => s.addTriageCaso);
  const updateVeredicto = useVincereStore((s) => s.updateTriageCasoVeredicto);
  const deleteTriageCaso = useVincereStore((s) => s.deleteTriageCaso);

  const [form, setForm] = useState({ nombre: "", genero: "", fase: "Emergente", descripcion: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaLog, setQaLog] = useState<VincereQAEntry[]>([]);

  async function run() {
    if (loading || !form.nombre.trim() || !form.descripcion.trim()) return;
    setLoading(true);
    setError(null);
    const id = addTriageCaso({
      nombre: form.nombre.trim(),
      genero: form.genero.trim(),
      fase: form.fase,
      descripcion: form.descripcion.trim(),
    });
    try {
      const r = await fetchTriage({
        nombre: form.nombre.trim(),
        genero: form.genero.trim(),
        fase: form.fase,
        descripcion: form.descripcion.trim(),
      });
      updateVeredicto(id, r);
      setForm({ nombre: "", genero: "", fase: "Emergente", descripcion: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el caso");
      deleteTriageCaso(id);
    } finally {
      setLoading(false);
    }
  }

  async function ask(pregunta: string) {
    const contexto = {
      casosRecientes: triageCasos.slice(0, 8).map((c) => ({
        nombre: c.nombre,
        genero: c.genero,
        fase: c.fase,
        descripcion: c.descripcion,
        veredicto: c.veredicto,
        prioridad: c.prioridad,
      })),
    };
    const { respuesta, nivel } = await fetchAsk("Triage VINCERE — casos nuevos", contexto, pregunta);
    setQaLog((prev) => [
      ...prev,
      { id: genId("qa"), pregunta, respuesta, nivel, creadoEn: new Date().toISOString() },
    ]);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Triage"
        title="Triage de casos nuevos"
        subtitle="Describe un caso nuevo y recibe un veredicto de prioridad y motor de entrada al sistema."
      />

      <div className="space-y-5">
        <Panel>
          <div className="grid gap-3.5">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del caso / artista"
              className="vin-input"
            />
            <div className="grid gap-3.5 md:grid-cols-2">
              <input
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value })}
                placeholder="Género / estilo"
                className="vin-input"
              />
              <select value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })} className="vin-input">
                {FASES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción breve del caso…"
              rows={3}
              className="vin-input resize-none"
            />
            {error && <p className="text-xs" style={{ color: "var(--vin-accent)" }}>{error}</p>}
            <button onClick={run} disabled={loading} className="vin-btn-primary justify-self-start">
              {loading ? "Analizando…" : "Analizar caso"}
            </button>
          </div>
        </Panel>

        {triageCasos.length > 0 && (
          <div className="space-y-3">
            {triageCasos.map((c) => (
              <div key={c.id} className="vin-accent-card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[15px] font-medium">{c.nombre}</span>
                    {c.genero && <span className="vin-faint ml-2 text-xs">{c.genero}</span>}
                    <span className="vin-faint ml-2 text-xs">· {c.fase}</span>
                  </div>
                  <button onClick={() => deleteTriageCaso(c.id)} className="vin-faint text-xs hover:underline">
                    ✕
                  </button>
                </div>
                {c.veredicto ? (
                  <>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      {c.prioridad && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{ color: PRIORIDAD_COLOR[c.prioridad], borderColor: `${PRIORIDAD_COLOR[c.prioridad]}66` }}
                        >
                          Prioridad {c.prioridad}
                        </span>
                      )}
                      {c.motorRecomendado && (
                        <span className="vin-muted rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--vin-surface-2)" }}>
                          Entrada: {c.motorRecomendado}
                        </span>
                      )}
                      {c.nivel && <EvidenceTag nivel={c.nivel} />}
                    </div>
                    <p className="text-sm leading-relaxed">{c.veredicto}</p>
                  </>
                ) : (
                  <p className="vin-muted text-sm">Analizando…</p>
                )}
              </div>
            ))}
          </div>
        )}

        <QuestionBox log={qaLog} onAsk={ask} placeholder="¿Este caso encaja con lo que dirige VINCERE?…" />
      </div>
    </div>
  );
}

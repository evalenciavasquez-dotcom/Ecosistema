"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import {
  VincereCantidadData,
  VincereQAEntry,
  VINCERE_CANTIDAD_DATA_DESC,
  VINCERE_CANTIDAD_DATA_LABEL,
  VINCERE_DATA_QUE_SIRVE,
  VINCERE_VINCULO_LABEL,
} from "@/lib/vincere/types";
import { fetchAsk, fetchTriage } from "@/lib/vincere/ai-client";
import { genId } from "@/lib/id";
import { SectionHeader, Panel } from "../primitives";
import EvidenceTag from "../EvidenceTag";
import QuestionBox from "../QuestionBox";

const FASES = ["Emergente", "Consolidación", "Establecido", "No lo sé aún"];

const CANTIDADES: VincereCantidadData[] = ["baja", "media", "alta"];

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

  const [form, setForm] = useState<{
    nombre: string;
    genero: string;
    fase: string;
    descripcion: string;
    dataDisponible: VincereCantidadData;
  }>({ nombre: "", genero: "", fase: "Emergente", descripcion: "", dataDisponible: "baja" });
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
      dataDisponible: form.dataDisponible,
    });
    try {
      const r = await fetchTriage({
        nombre: form.nombre.trim(),
        genero: form.genero.trim(),
        fase: form.fase,
        descripcion: form.descripcion.trim(),
        dataDisponible: form.dataDisponible,
      });
      updateVeredicto(id, r);
      setForm({ nombre: "", genero: "", fase: "Emergente", descripcion: "", dataDisponible: "baja" });
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

            {/* Cuánta data hay. Es lo que decide hasta dónde puede llegar el
                veredicto: el techo de nivel se aplica también en el cliente. */}
            <div>
              <p className="vin-faint mb-2 vin-t-xs uppercase tracking-[0.08em]">Cantidad de data disponible</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {CANTIDADES.map((c) => {
                  const activa = form.dataDisponible === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, dataDisponible: c })}
                      className="rounded-xl border p-2.5 text-left transition-colors"
                      style={{
                        borderColor: activa ? "var(--vin-accent)" : "var(--vin-border)",
                        background: activa ? "var(--vin-surface-2)" : "transparent",
                      }}
                    >
                      <span className="block vin-t-sm font-medium">{VINCERE_CANTIDAD_DATA_LABEL[c]}</span>
                      <span className="vin-faint mt-1 block vin-t-xs leading-relaxed">
                        {VINCERE_CANTIDAD_DATA_DESC[c]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <details className="rounded-xl" style={{ border: "1px solid var(--vin-border)" }}>
              <summary className="vin-muted cursor-pointer px-3 py-2 vin-t-sm">
                Qué data hace un análisis más completo
              </summary>
              <ul className="space-y-1.5 px-3 pb-3">
                {VINCERE_DATA_QUE_SIRVE.map((d, i) => (
                  <li key={i} className="vin-faint vin-t-sm leading-relaxed">
                    · {d}
                  </li>
                ))}
              </ul>
              <p className="vin-faint px-3 pb-3 vin-t-xs leading-relaxed">
                Pídela antes de decir que sí. Después del primer análisis, pedirla se ve como que no sabías.
              </p>
            </details>

            {error && <p className="vin-t-xs" style={{ color: "var(--vin-accent)" }}>{error}</p>}
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
                    <span className="vin-t-base font-medium">{c.nombre}</span>
                    {c.genero && <span className="vin-faint ml-2 vin-t-xs">{c.genero}</span>}
                    <span className="vin-faint ml-2 vin-t-xs">· {c.fase}</span>
                    {c.dataDisponible && (
                      <span className="vin-faint ml-2 vin-t-xs">
                        · data {VINCERE_CANTIDAD_DATA_LABEL[c.dataDisponible].toLowerCase()}
                      </span>
                    )}
                  </div>
                  <button onClick={() => deleteTriageCaso(c.id)} className="vin-faint vin-t-xs hover:underline">
                    ✕
                  </button>
                </div>
                {c.veredicto ? (
                  <>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      {c.prioridad && (
                        <span
                          className="rounded-full border px-2 py-0.5 vin-t-xs font-medium"
                          style={{ color: PRIORIDAD_COLOR[c.prioridad], borderColor: `${PRIORIDAD_COLOR[c.prioridad]}66` }}
                        >
                          Prioridad {c.prioridad}
                        </span>
                      )}
                      {c.motorRecomendado && (
                        <span className="vin-muted rounded-full px-2 py-0.5 vin-t-xs" style={{ background: "var(--vin-surface-2)" }}>
                          Entrada: {c.motorRecomendado}
                        </span>
                      )}
                      {c.nivel && <EvidenceTag nivel={c.nivel} />}
                    </div>
                    <p className="vin-t-sm leading-relaxed">{c.veredicto}</p>

                    {/* El encuadre comercial: cómo entrar y qué cuesta en
                        tiempo. Es una propuesta para confirmar, no un acuerdo. */}
                    {(c.vinculoSugerido || c.comoCobrarlo || c.horasSemanalesEstimadas != null) && (
                      <div
                        className="mt-3 rounded-xl p-3"
                        style={{ background: "var(--vin-surface)", border: "1px solid var(--vin-border)" }}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="vin-faint vin-t-xs uppercase tracking-[0.08em]">Encuadre sugerido</span>
                          {c.vinculoSugerido && (
                            <span
                              className="rounded-full border px-2 py-0.5 vin-t-xs"
                              style={{ color: "var(--vin-muted)", borderColor: "var(--vin-border-strong)" }}
                            >
                              {VINCERE_VINCULO_LABEL[c.vinculoSugerido]}
                            </span>
                          )}
                          {c.horasSemanalesEstimadas != null && (
                            <span className="vin-faint vin-t-sm tabular-nums">
                              ~{c.horasSemanalesEstimadas}h/semana
                            </span>
                          )}
                        </div>
                        {c.comoCobrarlo && <p className="vin-muted vin-t-sm leading-relaxed">{c.comoCobrarlo}</p>}
                        <p className="vin-faint mt-2 vin-t-xs leading-relaxed">
                          Es una propuesta para que la confirmes, no un acuerdo. Al crear el proyecto, defínela en
                          Oportunidad → Tu vínculo.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="vin-muted vin-t-sm">Analizando…</p>
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

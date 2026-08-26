"use client";

import { useState } from "react";
import {
  VincereCoherencia,
  VincereMarca,
  VincereMarcaDiagnostico,
  VincereProyecto,
  VINCERE_COHERENCIA_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchMarca } from "@/lib/vincere/ai-client";
import { buildMarcaContext } from "@/lib/vincere/context";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";
import { tinte } from "@/lib/vincere/color";

const COHERENCIA_COLOR: Record<VincereCoherencia, string> = {
  alineado: "var(--vin-ok)",
  tibio: "var(--vin-warn)",
  desalineado: "var(--vin-risk)",
};

const COHERENCIAS: VincereCoherencia[] = ["alineado", "tibio", "desalineado"];

// Campos de texto de la marca declarada. El antipatrón va aparte más abajo:
// es el que más cuesta llenar y el que más filo da, así que se le da su
// propio espacio en vez de perderlo en una cuadrícula.
const CAMPOS: { key: keyof Pick<VincereMarca, "posicionamiento" | "promesa" | "territorio">; label: string; hint: string }[] = [
  {
    key: "posicionamiento",
    label: "Posicionamiento",
    hint: "La frase que define qué es este artista. Si le sirve igual a otro artista del mismo género, todavía no es un posicionamiento.",
  },
  {
    key: "promesa",
    label: "Promesa",
    hint: "Qué recibe quien lo escucha. No qué hace el artista — qué se lleva el que pone play.",
  },
  {
    key: "territorio",
    label: "Territorio sonoro",
    hint: "Dónde se ubica y junto a quién. Referentes, no aspiraciones.",
  },
];

function puntuacionColor(n: number): string {
  if (n >= 70) return "var(--vin-ok)";
  if (n >= 40) return "var(--vin-warn)";
  return "var(--vin-risk)";
}

export default function MarcaSection({ proyecto }: { proyecto: VincereProyecto }) {
  const updateMarca = useVincereStore((s) => s.updateMarca);
  const addPunto = useVincereStore((s) => s.addPuntoContacto);
  const updatePunto = useVincereStore((s) => s.updatePuntoContacto);
  const deletePunto = useVincereStore((s) => s.deletePuntoContacto);
  const setDiagnostico = useVincereStore((s) => s.setMarcaDiagnostico);
  const showToast = useVincereStore((s) => s.showToast);

  const [editing, setEditing] = useState(false);
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canalNuevo, setCanalNuevo] = useState("");

  const m = proyecto.marca;
  const diag = proyecto.marcaDiagnostico;
  const atributos = m?.atributos ?? [];
  const puntos = m?.puntosContacto ?? [];
  const declarada = Boolean(m?.posicionamiento?.trim() || m?.promesa?.trim() || atributos.length);

  async function analizar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchMarca({ artista: buildMarcaContext(proyecto), nota });
      setDiagnostico(proyecto.id, r);
      setNota("");
      showToast("Diagnóstico de marca generado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la marca");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="marca"
      eyebrow="Marca"
      title="Qué dice ser y qué está recibiendo"
      subtitle="El resto de la plataforma mide lo que el artista produce. Aquí se declara lo que dice ser, y el sistema lo contrasta contra la data: la distancia entre ambas cosas es lo que importa."
      aiTitle="Lectura VINCERE — Marca"
    >
      <div className="flex justify-end">
        <button className="vin-faint vin-t-xs hover:underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar edición" : "Editar marca"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CAMPOS.map((c) => (
          <Panel key={c.key}>
            <div className="vin-faint mb-2 vin-t-xs uppercase tracking-[0.08em]">{c.label}</div>
            {editing ? (
              <>
                <textarea
                  value={m?.[c.key] ?? ""}
                  onChange={(e) => updateMarca(proyecto.id, { [c.key]: e.target.value })}
                  rows={3}
                  className="vin-input resize-none"
                />
                <p className="vin-faint mt-2 vin-t-xs leading-relaxed">{c.hint}</p>
              </>
            ) : (
              <div className="vin-t-base leading-relaxed">
                {m?.[c.key]?.trim() || <span className="vin-faint">—</span>}
              </div>
            )}
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <PanelLabel>Atributos</PanelLabel>
          {editing ? (
            <>
              <input
                value={atributos.join(", ")}
                onChange={(e) =>
                  updateMarca(proyecto.id, {
                    atributos: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="íntimo, nocturno, melancólico"
                className="vin-input"
              />
              <p className="vin-faint mt-2 vin-t-xs">Separados por coma. Tres o cuatro bastan; diez no definen nada.</p>
            </>
          ) : atributos.length ? (
            <div className="flex flex-wrap gap-1.5">
              {atributos.map((a) => (
                <span
                  key={a}
                  className="rounded-full px-2.5 py-1 vin-t-sm"
                  style={{ border: "1px solid var(--vin-border-strong)", color: "var(--vin-muted)" }}
                >
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <span className="vin-faint vin-t-sm">—</span>
          )}
        </Panel>

        <Panel>
          <PanelLabel>Lo que NO es</PanelLabel>
          {editing ? (
            <>
              <textarea
                value={m?.antipatron ?? ""}
                onChange={(e) => updateMarca(proyecto.id, { antipatron: e.target.value })}
                rows={2}
                className="vin-input resize-none"
              />
              <p className="vin-faint mt-2 vin-t-xs leading-relaxed">
                El campo que casi nadie llena. Una marca que no excluye nada no distingue nada.
              </p>
            </>
          ) : (
            <div className="vin-t-base leading-relaxed">
              {m?.antipatron?.trim() || (
                <span className="vin-faint">
                  Sin definir — es la pieza que más filo le daría a esta marca.
                </span>
              )}
            </div>
          )}
        </Panel>
      </div>

      <section>
        <PanelLabel>Puntos de contacto</PanelLabel>
        <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
          Donde la marca se toca de verdad. Un posicionamiento impecable no sirve si tres canales dicen cosas distintas.
        </p>
        <div className="space-y-2.5">
          {puntos.map((pc) => (
            <div key={pc.id} className="vin-card border-l-2 p-4" style={{ borderLeftColor: COHERENCIA_COLOR[pc.coherencia] }}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="vin-t-base font-medium">{pc.canal}</span>
                <div className="flex items-center gap-1.5">
                  {COHERENCIAS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updatePunto(proyecto.id, pc.id, { coherencia: c })}
                      className="rounded-full border px-2 py-0.5 vin-t-xs transition-colors"
                      style={{
                        color: pc.coherencia === c ? COHERENCIA_COLOR[c] : "var(--vin-dim)",
                        borderColor: pc.coherencia === c ? tinte(COHERENCIA_COLOR[c], 40) : "var(--vin-border)",
                        background: pc.coherencia === c ? tinte(COHERENCIA_COLOR[c], 8) : "transparent",
                      }}
                    >
                      {VINCERE_COHERENCIA_LABEL[c]}
                    </button>
                  ))}
                  <button
                    onClick={() => deletePunto(proyecto.id, pc.id)}
                    className="vin-faint px-1 vin-t-xs hover:underline"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <textarea
                value={pc.queProyecta}
                onChange={(e) => updatePunto(proyecto.id, pc.id, { queProyecta: e.target.value })}
                rows={2}
                placeholder="Qué dice hoy este canal sobre quién es el artista"
                className="vin-input resize-none vin-t-base"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={canalNuevo}
            onChange={(e) => setCanalNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canalNuevo.trim()) {
                addPunto(proyecto.id, { canal: canalNuevo.trim(), queProyecta: "", coherencia: "tibio" });
                setCanalNuevo("");
              }
            }}
            placeholder="Añadir canal: Spotify, Instagram, vivo, prensa…"
            className="vin-input flex-1"
            style={{ minWidth: "220px" }}
          />
          <button
            onClick={() => {
              if (!canalNuevo.trim()) return;
              addPunto(proyecto.id, { canal: canalNuevo.trim(), queProyecta: "", coherencia: "tibio" });
              setCanalNuevo("");
            }}
            disabled={!canalNuevo.trim()}
            className="vin-btn-ghost"
          >
            Añadir
          </button>
        </div>
      </section>

      <Panel>
        <PanelLabel>Contrastar contra la data</PanelLabel>
        <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
          {declarada
            ? "El sistema cruza esta marca con el catálogo, la audiencia, las zonas y los canales, y devuelve dónde se abre la brecha."
            : "Todavía no hay marca declarada. Se puede analizar igual: el sistema trabaja al revés y deduce qué marca tiene hoy este artista según su data."}
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Algo que quieras que mire en particular (opcional)"
          className="vin-input mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={analizar} disabled={cargando} className="vin-btn-primary">
            {cargando ? "Contrastando marca y data…" : diag ? "Volver a analizar" : "Analizar marca"}
          </button>
          {cargando && <span className="vin-faint vin-t-xs">Cruzando canales, catálogo y audiencia.</span>}
        </div>
        {error && (
          <p className="mt-3 vin-t-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {diag && <DiagnosticoMarca diag={diag} onEliminar={() => setDiagnostico(proyecto.id, null)} />}
    </SectionShell>
  );
}

function DiagnosticoMarca({ diag, onEliminar }: { diag: VincereMarcaDiagnostico; onEliminar: () => void }) {
  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="vin-eyebrow mb-2">Diagnóstico de marca</div>
            <div className="flex items-baseline gap-3">
              <span
                className="vin-serif vin-t-display leading-none"
                style={{ color: puntuacionColor(diag.puntuacionCoherencia) }}
              >
                {diag.puntuacionCoherencia}
              </span>
              <span className="vin-faint vin-t-xs">de coherencia entre lo declarado y lo recibido</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={diag.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 vin-t-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <p className="vin-t-base leading-relaxed">{diag.coherencia}</p>
        <p className="vin-faint mt-2.5 vin-t-xs">
          Generado el{" "}
          {new Date(diag.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {diag.brechas.length > 0 && (
        <section>
          <PanelLabel>Dónde se abre la brecha</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {diag.brechas.map((b, i) => (
              <div key={i} className="vin-card p-4">
                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="vin-faint mb-1 vin-t-xs uppercase tracking-[0.08em]">Declara</div>
                    <p className="vin-t-base leading-relaxed">{b.declarado}</p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
                  >
                    <div className="mb-1 vin-t-xs uppercase tracking-[0.08em]" style={{ color: "var(--vin-accent)" }}>
                      Recibe
                    </div>
                    <p className="vin-t-base leading-relaxed">{b.recibido}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <EvidenceTag nivel={b.nivel} />
                  <p className="vin-muted flex-1 vin-t-base leading-relaxed">{b.lectura}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <PanelLabel>Diferenciación</PanelLabel>
          <p className="vin-t-base leading-relaxed">{diag.diferenciacion}</p>
        </Panel>

        {diag.senalesDeMarca.length > 0 && (
          <Panel>
            <PanelLabel>La marca que la data revela</PanelLabel>
            <p className="vin-faint mb-3 vin-t-xs leading-relaxed">Lo que este artista ya proyecta, se declare o no.</p>
            <ul className="space-y-2">
              {diag.senalesDeMarca.map((s, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span className="vin-faint">—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {diag.riesgos.length > 0 && (
          <div
            className="rounded-xl p-5"
            style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
          >
            <PanelLabel>
              <span style={{ color: "var(--vin-accent)" }}>Riesgos de marca</span>
            </PanelLabel>
            <ul className="space-y-2">
              {diag.riesgos.map((r, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span style={{ color: "var(--vin-accent)" }}>—</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diag.movimientos.length > 0 && (
          <Panel>
            <PanelLabel>Movimientos</PanelLabel>
            <ul className="space-y-2">
              {diag.movimientos.map((mv, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span className="vin-faint tabular-nums">{i + 1}.</span>
                  <span>{mv}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>Veredicto</span>
        </PanelLabel>
        <p className="vin-t-base leading-relaxed">{diag.veredicto}</p>
      </div>

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

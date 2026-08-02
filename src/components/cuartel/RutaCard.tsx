"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import { fetchPreguntaInstructor, etiquetaRuta } from "@/lib/cuartel/ai-client";
import {
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LEGAL_LABEL,
  CUARTEL_LUZ_COLOR,
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_PREGUNTA_LABEL,
  CUARTEL_RUTA_DESCRIPCION,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CuartelCerteza,
  CuartelEscenario,
  CuartelLegalNivel,
  CuartelLuz,
  CuartelRuta,
} from "@/lib/cuartel/types";
import { CertezaTag, ErrorNota, ValidezBadge } from "./primitives";

const LUCES: CuartelLuz[] = ["verde", "amarillo", "rojo"];
const CERTEZAS = Object.keys(CUARTEL_CERTEZA_LABEL) as CuartelCerteza[];
const NIVELES_LEGALES = Object.keys(CUARTEL_LEGAL_LABEL) as CuartelLegalNivel[];

export default function RutaCard({ escenario, ruta }: { escenario: CuartelEscenario; ruta: CuartelRuta }) {
  const setSombrero = useCuartelStore((s) => s.setSombrero);
  const setMetrica = useCuartelStore((s) => s.setMetrica);
  const setLegal = useCuartelStore((s) => s.setLegal);
  const setCertezaRiesgos = useCuartelStore((s) => s.setCertezaRiesgos);
  const eliminarRuta = useCuartelStore((s) => s.eliminarRuta);

  const [abierta, setAbierta] = useState(false);
  const veredicto = calcularVeredicto(ruta);
  const descartada = veredicto.validez === "descartada";
  const etiqueta = etiquetaRuta(ruta) ?? ruta.tipo;

  return (
    <div className={`cua-card p-5 ${descartada ? "cua-descartada" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="cua-serif text-xl leading-tight" style={descartada ? { textDecoration: "line-through" } : undefined}>
            {etiqueta}
          </div>
          <p className="cua-faint mt-1.5 text-[12.5px] leading-relaxed">{CUARTEL_RUTA_DESCRIPCION[ruta.tipo]}</p>
        </div>
        <ValidezBadge validez={veredicto.validez} />
      </div>

      <p
        className="mt-3 text-[13px] leading-relaxed"
        style={{ color: descartada ? "#e0483a" : "var(--cua-muted)" }}
      >
        {veredicto.motivo}
      </p>

      {veredicto.faltantes.length > 0 && (
        <ul className="cua-faint mt-2 space-y-1 text-[12px]">
          {veredicto.faltantes.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      )}

      <button
        className="cua-mono mt-4 text-[11px] uppercase tracking-wider"
        style={{ color: "var(--cua-accent)" }}
        onClick={() => setAbierta((v) => !v)}
      >
        {abierta ? "Cerrar análisis" : "Abrir análisis de la ruta"}
      </button>

      {abierta && (
        <div className="mt-5 space-y-6">
          <section>
            <div className="cua-label mb-3">Los 6 sombreros</div>
            <div className="space-y-3.5">
              {CUARTEL_SOMBREROS.map((s) => {
                const meta = CUARTEL_SOMBRERO_META[s];
                return (
                  <div key={s}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px]">
                        <span aria-hidden>{meta.icono}</span> {meta.label}
                      </span>
                      <span className="cua-faint text-[11.5px]">{meta.pregunta}</span>
                      {s === "riesgos" && <CertezaTag certeza={ruta.certezaRiesgos} />}
                    </div>
                    <textarea
                      className="cua-textarea"
                      rows={2}
                      value={ruta.sombreros[s]}
                      onChange={(e) => setSombrero(escenario.id, ruta.id, s, e.target.value)}
                    />
                    {s === "riesgos" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="cua-faint text-[11.5px]">Quién afirma esto:</span>
                        <select
                          className="cua-select"
                          value={ruta.certezaRiesgos}
                          onChange={(e) => setCertezaRiesgos(escenario.id, ruta.id, e.target.value as CuartelCerteza)}
                        >
                          {CERTEZAS.map((c) => (
                            <option key={c} value={c}>
                              {CUARTEL_CERTEZA_LABEL[c]}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="cua-label mb-1.5">Semáforo de riesgo</div>
            <p className="cua-faint mb-3 text-[12px] leading-relaxed">
              Las cuatro métricas son siempre las mismas, para que dos rutas de dos escenarios distintos sigan siendo
              comparables. Sobre estas corre el candado.
            </p>
            <div className="space-y-3">
              {CUARTEL_METRICAS.map((m) => {
                const meta = CUARTEL_METRICA_META[m];
                const actual = ruta.semaforo[m];
                return (
                  <div key={m} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px]">{meta.label}</div>
                      <div className="cua-faint text-[11.5px] leading-relaxed">{meta.pregunta}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {LUCES.map((luz) => {
                        const activa = actual === luz;
                        return (
                          <button
                            key={luz}
                            title={meta[luz]}
                            onClick={() => setMetrica(escenario.id, ruta.id, m, activa ? null : luz)}
                            className="cua-mono rounded-sm border px-2.5 py-1 text-[10.5px] uppercase tracking-wider"
                            style={{
                              borderColor: activa ? CUARTEL_LUZ_COLOR[luz] : "var(--cua-border-strong)",
                              background: activa ? `${CUARTEL_LUZ_COLOR[luz]}22` : "transparent",
                              color: activa ? CUARTEL_LUZ_COLOR[luz] : "var(--cua-faint)",
                            }}
                          >
                            {luz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {ruta.tipo === "sostener" && (
              <p className="cua-faint mt-3 text-[12px] leading-relaxed">
                🔒 Esta es la ruta de sostener: con 2 de 4 métricas en rojo se descarta sola. La validez se calcula, no se
                edita.
              </p>
            )}
          </section>

          <section>
            <div className="cua-label mb-1.5">Capa legal / fiscal</div>
            <p className="cua-faint mb-3 text-[12px] leading-relaxed">
              Corre en paralelo a los sombreros, solo si esta ruta tiene un ángulo legal, contractual o fiscal real de
              vida personal. Este sistema identifica cuándo llamar a un abogado o a un contador colombiano — nunca actúa
              en su lugar.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NIVELES_LEGALES.map((nivel) => {
                const activa = ruta.legal.nivel === nivel;
                return (
                  <button
                    key={nivel}
                    onClick={() => setLegal(escenario.id, ruta.id, { ...ruta.legal, nivel })}
                    className="cua-mono rounded-sm border px-2.5 py-1 text-[10.5px] uppercase tracking-wider"
                    style={{
                      borderColor: activa ? "var(--cua-accent)" : "var(--cua-border-strong)",
                      background: activa ? "var(--cua-accent-soft)" : "transparent",
                      color: activa ? "var(--cua-accent)" : "var(--cua-faint)",
                    }}
                  >
                    {CUARTEL_LEGAL_LABEL[nivel]}
                  </button>
                );
              })}
            </div>
            {ruta.legal.nivel !== "no-aplica" && (
              <textarea
                className="cua-textarea mt-3"
                rows={2}
                placeholder="Qué documento, contrato o gestión conviene, y antes de qué paso."
                value={ruta.legal.nota}
                onChange={(e) => setLegal(escenario.id, ruta.id, { ...ruta.legal, nota: e.target.value })}
              />
            )}
          </section>

          <InstructorPanel escenario={escenario} ruta={ruta} />

          {escenario.rutas.length > 3 && (
            <BorrarRuta onBorrar={() => eliminarRuta(escenario.id, ruta.id)} etiqueta={etiqueta} />
          )}
        </div>
      )}
    </div>
  );
}

// El Instructor. Vive dentro de la ruta y no en una pantalla aparte porque su
// función es bloquear ESTA ruta: sin una pregunta de contraste o confrontación
// respondida, la validez no se calcula por más completo que esté el resto.
function InstructorPanel({ escenario, ruta }: { escenario: CuartelEscenario; ruta: CuartelRuta }) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const agregarPregunta = useCuartelStore((s) => s.agregarPregunta);
  const responderPregunta = useCuartelStore((s) => s.responderPregunta);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});

  const sinResponder = ruta.turnos.find((t) => !t.respuesta);

  async function pedirPregunta() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchPreguntaInstructor(escenario, ruta, escenarios);
      agregarPregunta(escenario.id, ruta.id, res.tipo, res.pregunta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la pregunta");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section>
      <div className="cua-label mb-1.5">El Instructor</div>
      <p className="cua-faint mb-3 text-[12px] leading-relaxed">
        Pregunta con criterio: no adula, no dice que sí a todo. Ninguna ruta llega a tener validez calculada sin al menos
        una pregunta de Contraste o Confrontación respondida.
      </p>

      {ruta.turnos.length > 0 && (
        <div className="mb-3 space-y-3">
          {ruta.turnos.map((t) => (
            <div key={t.id} className="cua-accent-card p-3.5">
              <div className="cua-mono mb-1.5 text-[10.5px] uppercase tracking-wider" style={{ color: "var(--cua-accent)" }}>
                {CUARTEL_PREGUNTA_LABEL[t.tipo]}
              </div>
              <p className="text-[13.5px] leading-relaxed">{t.pregunta}</p>

              {t.respuesta ? (
                <p className="cua-muted mt-2.5 border-l-2 pl-3 text-[13px] leading-relaxed" style={{ borderColor: "var(--cua-border-strong)" }}>
                  {t.respuesta}
                </p>
              ) : (
                <div className="mt-3">
                  <textarea
                    className="cua-textarea"
                    rows={2}
                    placeholder="Respondé sin editarte."
                    value={borrador[t.id] ?? ""}
                    onChange={(e) => setBorrador((b) => ({ ...b, [t.id]: e.target.value }))}
                  />
                  <button
                    className="cua-btn-primary mt-2"
                    disabled={!(borrador[t.id] ?? "").trim()}
                    onClick={() => {
                      responderPregunta(escenario.id, ruta.id, t.id, (borrador[t.id] ?? "").trim());
                      setBorrador((b) => ({ ...b, [t.id]: "" }));
                    }}
                  >
                    Responder
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="cua-btn-ghost" onClick={pedirPregunta} disabled={cargando || !!sinResponder}>
        {cargando ? "Pensando…" : ruta.turnos.length === 0 ? "Que el Instructor ponga esta ruta a prueba" : "Otra pregunta"}
      </button>
      {sinResponder && !cargando && (
        <p className="cua-faint mt-2 text-[12px]">Hay una pregunta sin responder. Contestá esa antes de pedir otra.</p>
      )}
      {error && <ErrorNota>{error}</ErrorNota>}
    </section>
  );
}

// Reversibilidad (PRD §14): nada se borra de un clic. La confirmación es
// explícita y dice qué se pierde.
function BorrarRuta({ onBorrar, etiqueta }: { onBorrar: () => void; etiqueta: string }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button className="cua-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--cua-dim)" }} onClick={() => setConfirmando(true)}>
        Eliminar esta ruta
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px]" style={{ color: "#e0483a" }}>
        Se borra “{etiqueta}” con su análisis y sus preguntas. No se puede deshacer.
      </span>
      <button className="cua-btn-ghost" onClick={onBorrar}>
        Borrar
      </button>
      <button className="cua-btn-ghost" onClick={() => setConfirmando(false)}>
        Cancelar
      </button>
    </div>
  );
}

"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto, instructorCumplido } from "@/lib/cuartel/candado";
import { etiquetaRuta } from "@/lib/cuartel/ai-client";
import {
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LEGAL_LABEL,
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_RUTA_COLOR,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CuartelCerteza,
  CuartelEscenario,
  CuartelLegalNivel,
  CuartelLuz,
  CuartelRuta,
} from "@/lib/cuartel/types";
import { CertezaTag, LuzDot, ValidezBadge } from "./primitives";

const CERTEZAS = Object.keys(CUARTEL_CERTEZA_LABEL) as CuartelCerteza[];
const NIVELES_LEGALES = Object.keys(CUARTEL_LEGAL_LABEL) as CuartelLegalNivel[];

// El punto del semáforo cicla al tocarlo. El gris (sin evaluar) queda dentro
// del ciclo a propósito: si no se pudiera volver a él, una luz puesta por error
// no tendría manera de deshacerse, y "sin evaluar" es información real.
function siguienteLuz(actual: CuartelLuz | null): CuartelLuz | null {
  if (actual === null) return "rojo";
  if (actual === "rojo") return "amarillo";
  if (actual === "amarillo") return "verde";
  return null;
}

export default function RutaCard({
  escenario,
  ruta,
  editable,
  onAbrirInstructor,
}: {
  escenario: CuartelEscenario;
  ruta: CuartelRuta;
  editable: boolean;
  onAbrirInstructor: () => void;
}) {
  const setSombrero = useCuartelStore((s) => s.setSombrero);
  const setMetrica = useCuartelStore((s) => s.setMetrica);
  const setLegal = useCuartelStore((s) => s.setLegal);
  const setCertezaRiesgos = useCuartelStore((s) => s.setCertezaRiesgos);
  const eliminarRuta = useCuartelStore((s) => s.eliminarRuta);

  const veredicto = calcularVeredicto(ruta);
  const descartada = veredicto.validez === "descartada";
  const puestaAPrueba = instructorCumplido(ruta);

  return (
    <div
      className={`cua-card min-w-0 flex-1 p-5 ${descartada ? "cua-descartada" : ""}`}
      style={{ minWidth: editable ? undefined : 280 }}
    >
      {descartada && (
        <div className="cua-mono mb-2.5 text-[10px] uppercase tracking-[0.05em]" style={{ color: "var(--cua-rojo)" }}>
          ◇ Descartada por candado
        </div>
      )}

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="cua-serif text-[19px] font-semibold" style={{ color: CUARTEL_RUTA_COLOR[ruta.tipo] }}>
          {etiquetaRuta(ruta)}
        </div>
        <ValidezBadge validez={veredicto.validez} />
      </div>

      <div className="mb-4 flex gap-2">
        {CUARTEL_METRICAS.map((m) => {
          const meta = CUARTEL_METRICA_META[m];
          const luz = ruta.semaforo[m];
          return (
            <LuzDot
              key={m}
              luz={luz}
              titulo={`${meta.label}: ${luz ? meta[luz] : "sin evaluar"}`}
              onClick={editable ? () => setMetrica(escenario.id, ruta.id, m, siguienteLuz(luz)) : undefined}
            />
          );
        })}
      </div>

      {descartada && (
        <p className="mb-3.5 text-[12.5px] leading-relaxed" style={{ color: "var(--cua-rojo)" }}>
          {veredicto.motivo}
        </p>
      )}

      {CUARTEL_SOMBREROS.map((s) => {
        const meta = CUARTEL_SOMBRERO_META[s];
        const texto = ruta.sombreros[s];
        return (
          <div key={s} className="flex gap-2.5 py-[9px]" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
            <div
              className="mt-1 h-[9px] w-[9px] shrink-0 rounded-sm"
              style={{ background: meta.swatch }}
              title={meta.pregunta}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="cua-mono text-[10px] uppercase tracking-[0.05em]"
                  style={{ color: "var(--cua-muted)" }}
                >
                  {meta.label}
                </span>
                {s === "riesgos" && <CertezaTag certeza={ruta.certezaRiesgos} />}
              </div>

              {editable ? (
                <>
                  <textarea
                    className="cua-textarea mt-1.5"
                    rows={2}
                    placeholder={meta.pregunta}
                    value={texto}
                    onChange={(e) => setSombrero(escenario.id, ruta.id, s, e.target.value)}
                  />
                  {s === "riesgos" && (
                    <select
                      className="cua-select mt-1.5"
                      value={ruta.certezaRiesgos}
                      onChange={(e) => setCertezaRiesgos(escenario.id, ruta.id, e.target.value as CuartelCerteza)}
                    >
                      {CERTEZAS.map((c) => (
                        <option key={c} value={c}>
                          Quién lo afirma: {CUARTEL_CERTEZA_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              ) : (
                <div
                  className="mt-[3px] text-[13px] leading-[1.5]"
                  style={{ color: texto ? "var(--cua-text-2)" : "var(--cua-faint)" }}
                >
                  {texto || "Pendiente de completar."}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="mt-3.5 pt-3" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
        {editable ? (
          <>
            <div className="cua-mono mb-2 text-[10px] uppercase tracking-[0.05em]" style={{ color: "var(--cua-muted)" }}>
              Legal / fiscal
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NIVELES_LEGALES.map((nivel) => {
                const activo = ruta.legal.nivel === nivel;
                return (
                  <button
                    key={nivel}
                    onClick={() => setLegal(escenario.id, ruta.id, { ...ruta.legal, nivel })}
                    className="cua-mono rounded-sm border px-2.5 py-1 text-[10.5px] uppercase tracking-[0.05em]"
                    style={{
                      borderColor: activo ? "var(--cua-accent)" : "var(--cua-border-strong)",
                      color: activo ? "var(--cua-accent)" : "var(--cua-muted)",
                      background: activo ? "var(--cua-active)" : "transparent",
                    }}
                  >
                    {CUARTEL_LEGAL_LABEL[nivel]}
                  </button>
                );
              })}
            </div>
            {ruta.legal.nivel !== "no-aplica" && (
              <textarea
                className="cua-textarea mt-2"
                rows={2}
                placeholder="Qué documento o gestión conviene, y antes de qué paso. Esto identifica cuándo llamar a un abogado o contador — no lo reemplaza."
                value={ruta.legal.nota}
                onChange={(e) => setLegal(escenario.id, ruta.id, { ...ruta.legal, nota: e.target.value })}
              />
            )}
          </>
        ) : (
          <div
            className="cua-mono text-[11px]"
            style={{
              color:
                ruta.legal.nivel === "necesario"
                  ? "var(--cua-rojo)"
                  : ruta.legal.nivel === "recomendable"
                    ? "var(--cua-amarillo)"
                    : "var(--cua-faint)",
            }}
          >
            Legal/fiscal: {CUARTEL_LEGAL_LABEL[ruta.legal.nivel].toLowerCase()}
          </div>
        )}
      </div>

      <div className="mt-3.5">
        {puestaAPrueba ? (
          <button
            className="cua-mono text-[11.5px]"
            style={{ color: "var(--cua-verde)" }}
            onClick={onAbrirInstructor}
          >
            ✓ Validada por El Instructor
          </button>
        ) : (
          <button
            className="cua-mono inline-block rounded-sm border px-3.5 py-2 text-[11.5px] uppercase tracking-[0.04em]"
            style={{ color: "var(--cua-accent)", borderColor: "#4a3f26" }}
            onClick={onAbrirInstructor}
          >
            Hablar con El Instructor
          </button>
        )}
      </div>

      {!descartada && veredicto.faltantes.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11.5px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          {veredicto.faltantes.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      )}

      {editable && escenario.rutas.length > 3 && (
        <BorrarRuta etiqueta={etiquetaRuta(ruta) ?? ruta.tipo} onBorrar={() => eliminarRuta(escenario.id, ruta.id)} />
      )}
    </div>
  );
}

// Reversibilidad (PRD §14): nada se borra de un clic, y la confirmación dice
// qué se pierde.
function BorrarRuta({ etiqueta, onBorrar }: { etiqueta: string; onBorrar: () => void }) {
  const showToast = useCuartelStore((s) => s.showToast);
  return (
    <button
      className="cua-mono mt-4 text-[10.5px] uppercase tracking-[0.05em]"
      style={{ color: "var(--cua-faint)" }}
      onClick={() => {
        if (window.confirm(`Se borra la ruta “${etiqueta}” con su análisis y sus preguntas. No se puede deshacer.`)) {
          onBorrar();
          showToast("Ruta eliminada.");
        }
      }}
    >
      Eliminar esta ruta
    </button>
  );
}

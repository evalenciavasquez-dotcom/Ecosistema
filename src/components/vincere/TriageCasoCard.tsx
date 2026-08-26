"use client";

import {
  VincereTriageCaso,
  VincereTriageDecision,
  VINCERE_DECISION_LABEL,
  VINCERE_VINCULO_LABEL,
} from "@/lib/vincere/types";
import EvidenceTag from "./EvidenceTag";
import { tinte } from "@/lib/vincere/color";

// El veredicto de un caso.
//
// Dos arreglos sobre la versión anterior, los dos de jerarquía:
//
// 1. EL FALLO ERA LO MÁS PEQUEÑO DE LA TARJETA. «Entrar con condiciones» vivía
//    como texto ámbar en la esquina superior derecha, del tamaño de un pie de
//    página, mientras el nombre del artista ocupaba el titular. Pero el nombre
//    no es la noticia —ya sabes de quién estás hablando—: la noticia es qué se
//    decidió. Ahora el fallo es el titular y el artista lo encabeza en chico.
//
// 2. NO HABÍA NADA QUE HACER. La única acción sobre un caso era la ✕, que lo
//    borra. Decir «no entro» y olvidar que el caso existió eran el mismo botón,
//    en la pantalla que se supone que es el expediente de las decisiones de
//    entrada. Ahora hay tres salidas y las tres quedan registradas.

const PRIORIDAD: Record<string, { color: string; que: string }> = {
  Alta: { color: "var(--vin-risk)", que: "Entrar ya" },
  Media: { color: "var(--vin-warn)", que: "Entrar con condiciones" },
  Baja: { color: "var(--vin-ok)", que: "No es prioridad" },
};

const DECISION_COLOR: Record<VincereTriageDecision, string> = {
  entramos: "var(--vin-ok)",
  "pedimos-data": "var(--vin-warn)",
  "no-entramos": "var(--vin-faint)",
};

export default function TriageCasoCard({
  caso,
  onEliminar,
  onEntrar,
  onDecidir,
}: {
  caso: VincereTriageCaso;
  onEliminar?: () => void;
  // Entrar es la única de las tres que además HACE algo fuera del caso: le
  // abre proyecto al artista. Por eso viaja aparte de las otras dos.
  onEntrar?: () => void;
  onDecidir?: (d: VincereTriageDecision | null) => void;
}) {
  const p = caso.prioridad ? PRIORIDAD[caso.prioridad] : null;
  const decidido = caso.decision;

  return (
    <div className="vin-accent-card overflow-hidden">
      <div className="px-5 pb-4 pt-4">
        {/* Quién, en chico. Es el sujeto, no la noticia. */}
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="vin-label" style={{ letterSpacing: ".08em" }}>
            {caso.nombre}
            <span className="vin-faint ml-2" style={{ textTransform: "none", letterSpacing: 0 }}>
              {[caso.genero, caso.fase, caso.creadoEn].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {caso.nivel && <EvidenceTag nivel={caso.nivel} />}
            {onEliminar && (
              <button onClick={onEliminar} className="vin-faint vin-t-sm hover:underline" title="Quitar del expediente">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* El fallo. Es lo único que hay que leer para saber qué se decidió. */}
        {p && (
          <h3 className="vin-display vin-t-xl" style={{ color: p.color, textWrap: "balance" }}>
            {p.que}
          </h3>
        )}

        {caso.motorRecomendado && (
          <p className="vin-muted mt-1.5 vin-t-sm">
            Por dónde se empieza: <span style={{ color: "var(--vin-text)" }}>{caso.motorRecomendado}</span>
          </p>
        )}
      </div>

      {!caso.veredicto ? (
        <p className="vin-muted px-5 pb-4 vin-t-sm">Analizando…</p>
      ) : (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1rem" }}>
          {/* Justificado y con partición de palabras. En una columna estrecha,
              justificar sin guiones abre ríos de espacio en blanco entre las
              palabras; el lang="es" es lo que le dice al navegador con qué
              reglas partir. */}
          <p
            lang="es"
            className="vin-t-base leading-relaxed"
            style={{ maxWidth: "68ch", textAlign: "justify", hyphens: "auto" }}
          >
            {caso.veredicto}
          </p>

          {/* Las tres salidas. Entrar es la afirmativa y va sólida; las otras
              dos son igual de válidas y por eso están al lado, no escondidas. */}
          {(onEntrar || onDecidir) && (
            <div className="mt-4">
              {decidido ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 vin-t-sm font-medium"
                    style={{
                      color: DECISION_COLOR[decidido],
                      background: "var(--vin-surface-2)",
                      border: `1px solid ${tinte(DECISION_COLOR[decidido], 33)}`,
                    }}
                  >
                    {VINCERE_DECISION_LABEL[decidido]}
                    {caso.decididoEn ? ` · ${caso.decididoEn}` : ""}
                  </span>
                  {decidido === "entramos" && onEntrar && (
                    <button onClick={onEntrar} className="vin-btn-ghost !py-1.5 vin-t-sm">
                      Abrir su proyecto →
                    </button>
                  )}
                  {onDecidir && (
                    <button onClick={() => onDecidir(null)} className="vin-faint vin-t-sm hover:underline">
                      Cambiar la decisión
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  {onEntrar && (
                    <button onClick={onEntrar} className="vin-btn-primary !py-2 vin-t-sm">
                      Entramos — abrirle proyecto
                    </button>
                  )}
                  {onDecidir && (
                    <>
                      <button
                        onClick={() => onDecidir("pedimos-data")}
                        className="vin-btn-ghost !py-2 vin-t-sm"
                        title="Se registra que la decisión está esperando data, no ganas"
                      >
                        Falta data para decidir
                      </button>
                      <button
                        onClick={() => onDecidir("no-entramos")}
                        className="vin-btn-ghost !py-2 vin-t-sm"
                        title="Queda el «no» razonado en el expediente, sin borrar el caso"
                      >
                        No entramos
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sustento: se consulta, no se lee de corrido. Va plegado para que
              el veredicto no quede sepultado bajo su propia bibliografía. */}
          {caso.web && (
            <details className="mt-4 rounded-xl" style={{ border: "1px solid var(--vin-border)" }}>
              <summary className="vin-muted cursor-pointer px-3.5 py-2.5 vin-t-sm">
                Qué encontró en la web
                {caso.web.hallazgos.length > 0 ? ` · ${caso.web.hallazgos.length} hallazgos` : ""}
              </summary>
              <div className="px-3.5 pb-3.5">
                <p lang="es" className="vin-t-sm leading-relaxed" style={{ maxWidth: "68ch", textAlign: "justify", hyphens: "auto" }}>
                  {caso.web.resumen}
                </p>
                {caso.web.hallazgos.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {caso.web.hallazgos.slice(0, 6).map((h, i) => (
                      <li key={i} className="vin-muted vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
                        · {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          )}

          {(caso.vinculoSugerido || caso.comoCobrarlo || caso.horasSemanalesEstimadas != null) && (
            <details className="mt-2.5 rounded-xl" style={{ border: "1px solid var(--vin-border)" }}>
              <summary className="vin-muted cursor-pointer px-3.5 py-2.5 vin-t-sm">
                Cómo entrar y qué cuesta
                {caso.vinculoSugerido ? ` · ${VINCERE_VINCULO_LABEL[caso.vinculoSugerido]}` : ""}
                {caso.horasSemanalesEstimadas != null ? ` · ~${caso.horasSemanalesEstimadas}h/semana` : ""}
              </summary>
              <div className="px-3.5 pb-3.5">
                {caso.comoCobrarlo && (
                  <p lang="es" className="vin-t-sm leading-relaxed" style={{ maxWidth: "68ch", textAlign: "justify", hyphens: "auto" }}>
                    {caso.comoCobrarlo}
                  </p>
                )}
                <p className="vin-faint mt-2 vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
                  Es una propuesta para que la confirmes, no un acuerdo. Al crear el proyecto, defínela en Oportunidad
                  → Tu vínculo.
                </p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

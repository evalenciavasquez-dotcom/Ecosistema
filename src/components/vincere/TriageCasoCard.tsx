"use client";

import { VincereTriageCaso, VINCERE_VINCULO_LABEL } from "@/lib/vincere/types";
import EvidenceTag from "./EvidenceTag";

// El veredicto de un caso.
//
// La versión anterior lo escupía como un párrafo corrido debajo de dos chips,
// y leerlo daba pereza — que en una herramienta de decisión no es una queja de
// estilo: si el veredicto no se lee, la decisión se toma sin él.
//
// Lo que cambia acá es el orden de lectura. Primero el fallo en una línea
// (entro / no entro, y por dónde), después el argumento, y al final el sustento
// —web y encuadre— que solo se mira cuando alguien discute. Antes los tres
// pesaban lo mismo.

const PRIORIDAD: Record<string, { color: string; que: string }> = {
  Alta: { color: "var(--vin-risk)", que: "Entrar ya" },
  Media: { color: "var(--vin-warn)", que: "Entrar con condiciones" },
  Baja: { color: "var(--vin-ok)", que: "No es prioridad" },
};

export default function TriageCasoCard({
  caso,
  onEliminar,
}: {
  caso: VincereTriageCaso;
  onEliminar?: () => void;
}) {
  const p = caso.prioridad ? PRIORIDAD[caso.prioridad] : null;

  return (
    <div className="vin-accent-card overflow-hidden">
      {/* Cabecera: quién, y el fallo. Es lo único que hay que leer para saber
          qué se decidió; todo lo demás es por qué. */}
      <div
        className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4"
        style={{ borderBottom: caso.veredicto ? "1px solid var(--vin-border)" : "none" }}
      >
        <div className="min-w-0">
          <div className="vin-t-lg font-medium leading-tight">{caso.nombre}</div>
          <div className="vin-faint vin-t-sm mt-1">
            {[caso.genero, caso.fase, caso.creadoEn].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {p && (
            <span
              className="rounded-full px-2.5 py-1 vin-t-sm font-medium"
              style={{ color: p.color, background: `${p.color}1f`, border: `1px solid ${p.color}55` }}
            >
              {p.que}
            </span>
          )}
          {caso.nivel && <EvidenceTag nivel={caso.nivel} />}
          {onEliminar && (
            <button onClick={onEliminar} className="vin-faint vin-t-sm hover:underline" aria-label="Eliminar caso">
              ✕
            </button>
          )}
        </div>
      </div>

      {!caso.veredicto ? (
        <p className="vin-muted px-5 py-4 vin-t-sm">Analizando…</p>
      ) : (
        <div className="px-5 py-4">
          {caso.motorRecomendado && (
            <p className="vin-t-sm mb-3">
              <span className="vin-faint">Por dónde se empieza: </span>
              <span className="font-medium">{caso.motorRecomendado}</span>
            </p>
          )}

          {/* El argumento, en tamaño de lectura y con ancho de lectura. Un
              párrafo a todo el ancho de la pantalla se abandona en la segunda
              línea porque el ojo pierde el renglón al volver. */}
          <p className="vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
            {caso.veredicto}
          </p>

          {/* Sustento: se consulta, no se lee de corrido. Va plegado para que
              el veredicto no quede sepultado bajo su propia bibliografía. */}
          {caso.web && (
            <details className="mt-4 rounded-xl" style={{ border: "1px solid var(--vin-border)" }}>
              <summary className="vin-muted cursor-pointer px-3.5 py-2.5 vin-t-sm">
                Qué encontró en la web
                {caso.web.hallazgos.length > 0 ? ` · ${caso.web.hallazgos.length} hallazgos` : ""}
              </summary>
              <div className="px-3.5 pb-3.5">
                <p className="vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
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
                  <p className="vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
                    {caso.comoCobrarlo}
                  </p>
                )}
                <p className="vin-faint mt-2 vin-t-xs leading-relaxed" style={{ maxWidth: "68ch" }}>
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

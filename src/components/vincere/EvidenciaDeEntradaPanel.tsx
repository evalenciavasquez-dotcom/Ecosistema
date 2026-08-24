"use client";

import { EvidenciaDeEntrada, FUENTE_LABEL } from "@/lib/vincere/entrada";
import { VINCERE_NIVEL_LABEL } from "@/lib/vincere/types";

// Sobre qué se está decidiendo.
//
// Reemplaza los tres botones de "cantidad de data" que había antes. La
// diferencia no es de forma: aquellos le preguntaban a Eduardo cuánta
// evidencia tenía y después limitaban el veredicto con su propia respuesta —
// o sea lo auditaban a él, no al caso. Esto cuenta el material que hay.
//
// Se muestra MIENTRAS escribe, no después del veredicto, y por eso es útil:
// ver que el techo sube de 1 a 3 al adjuntar un archivo convierte "falta data"
// en una acción concreta con su recompensa a la vista.

const COLOR_TECHO: Record<number, string> = {
  1: "var(--vin-risk)",
  2: "var(--vin-warn)",
  3: "var(--vin-ok)",
  4: "var(--vin-ok)",
};

export default function EvidenciaDeEntradaPanel({ evidencia }: { evidencia: EvidenciaDeEntrada }) {
  const { fuentes, techo, porQue, falta, suficienteParaVeredicto } = evidencia;
  const color = suficienteParaVeredicto ? COLOR_TECHO[techo] : "var(--vin-faint)";

  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--vin-border)", background: "var(--vin-surface-2)" }}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-sm font-medium">Sobre qué estás decidiendo</span>
        {suficienteParaVeredicto ? (
          <span className="vin-t-sm tabular-nums" style={{ color }}>
            El veredicto no podrá pasar de nivel {techo} · {VINCERE_NIVEL_LABEL[techo]}
          </span>
        ) : (
          <span className="vin-faint vin-t-sm">todavía no hay nada que leer</span>
        )}
      </div>

      {fuentes.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {fuentes.map((f) => (
            <span
              key={f}
              className="rounded-full px-2.5 py-0.5 vin-t-xs"
              style={{ border: "1px solid var(--vin-border-strong)", color: "var(--vin-muted)" }}
            >
              {FUENTE_LABEL[f]}
            </span>
          ))}
        </div>
      )}

      <p className="vin-muted vin-t-sm leading-relaxed" style={{ maxWidth: "70ch" }}>
        {porQue}
      </p>

      {falta.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {falta.map((f, i) => (
            <li key={i} className="vin-faint vin-t-sm leading-relaxed" style={{ maxWidth: "70ch" }}>
              · {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

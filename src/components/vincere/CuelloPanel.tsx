"use client";

import { useMemo } from "react";
import { VincereProyecto, VINCERE_NIVEL_LABEL } from "@/lib/vincere/types";
import { cuelloDeBotella, EstadoEtapa, EtapaEvaluada } from "@/lib/vincere/cuello";
import { Panel } from "./primitives";

// Si hay un solo peso para gastar, ¿dónde va?
//
// El sistema mide once cosas y once lecturas no son una estrategia. Este panel
// es el que convierte medición en decisión, y por eso va arriba de todo: antes
// de los streams, antes del fan rate, antes de cualquier número suelto.
//
// La cadena se dibuja en el orden en que se ARREGLA, con el alcance al final.
// Y las etapas posteriores al cuello van apagadas a propósito: trabajar en
// ellas hoy es trabajo perdido, y apagarlas dice eso sin tener que explicarlo.

const COLOR: Record<EstadoEtapa, string> = {
  roto: "var(--vin-risk)",
  ok: "var(--vin-ok)",
  noSeSabe: "var(--vin-faint)",
};

const SIMBOLO: Record<EstadoEtapa, string> = {
  roto: "×",
  ok: "✓",
  noSeSabe: "?",
};

export default function CuelloPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const c = useMemo(() => cuelloDeBotella(proyecto), [proyecto]);

  const posicionCuello = c.cuello ? c.etapas.findIndex((e) => e.etapa === c.cuello!.etapa) : -1;

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-base font-medium">El cuello de botella</span>
        <span className="vin-faint vin-t-sm">si hay un solo peso para gastar, ¿dónde va?</span>
      </div>

      <p className="vin-serif vin-t-xl leading-snug" style={{ maxWidth: "60ch" }}>
        {c.titular}
      </p>

      {/* La cadena. Se lee de izquierda a derecha en orden de arreglo: el
          alcance queda al final porque es lo único que se puede comprar, y
          comprarlo encima de una fuga es la forma más cara de gastar. */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {c.etapas.map((e, i) => (
          <Eslabon
            key={e.etapa}
            e={e}
            esCuello={i === posicionCuello}
            despuesDelCuello={posicionCuello >= 0 && i > posicionCuello}
          />
        ))}
      </div>

      <p className="vin-t-base mt-6 leading-relaxed" style={{ maxWidth: "70ch" }}>
        {c.queHacer}
      </p>

      {c.advertencia && (
        <p
          className="vin-t-sm mt-4 rounded-xl px-4 py-3 leading-relaxed"
          style={{
            maxWidth: "70ch",
            color: "var(--vin-warn)",
            background: "var(--vin-warn-wash)",
            border: "1px solid var(--vin-warn-line)",
          }}
        >
          {c.advertencia}
        </p>
      )}

      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
        Nivel {c.nivel} · {VINCERE_NIVEL_LABEL[c.nivel]}. La cadena se arregla en este orden y el alcance va último a
        propósito: es la única etapa que se puede comprar, y por eso es la que siempre se vende primero.
      </p>
    </Panel>
  );
}

function Eslabon({
  e,
  esCuello,
  despuesDelCuello,
}: {
  e: EtapaEvaluada;
  esCuello: boolean;
  despuesDelCuello: boolean;
}) {
  const color = COLOR[e.estado];
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: esCuello ? "var(--vin-risk-wash)" : "var(--vin-surface-2)",
        border: `1px solid ${esCuello ? "var(--vin-risk-line)" : "var(--vin-border)"}`,
        // Lo que va después del cuello no se atiende todavía. Apagarlo es la
        // manera de decirlo sin un párrafo.
        opacity: despuesDelCuello ? 0.45 : 1,
      }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="vin-t-sm tabular-nums" style={{ color }}>
          {SIMBOLO[e.estado]}
        </span>
        <span className="vin-t-sm font-medium">{e.label}</span>
      </div>
      <div className="vin-faint vin-t-xs mt-1.5 leading-snug">{e.pregunta}</div>
      <div className="vin-t-xs mt-2 leading-snug" style={{ color: e.estado === "ok" ? undefined : color }}>
        {e.evidencia}
      </div>
      {e.falta && <div className="vin-faint vin-t-xs mt-1.5 leading-snug">Falta: {e.falta}</div>}
    </div>
  );
}

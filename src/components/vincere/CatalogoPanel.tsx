"use client";

import { useMemo } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import {
  concentracionDeCatalogo,
  ESTADO_CATALOGO_LABEL,
  DEPENDENCIA_PCT,
  DIVERSIFICADO_PCT,
  FUENTE_DEPENDENCIA,
  FUENTE_DIVERSIFICACION,
} from "@/lib/vincere/catalogo";
import { formatStreams } from "@/lib/vincere/format";
import { Panel, PanelLabel } from "./primitives";

// ¿Es un artista o es una canción con un nombre pegado?
//
// El titular es un conteo —en cuántas canciones está la mitad de la carrera—
// y no un puntaje. Un conteo no necesita umbral para entenderse: si da 1, ya
// está dicho todo. El porcentaje y el veredicto van debajo, para quien quiera
// el detalle.

const COLOR_ESTADO: Record<string, string> = {
  dependencia: "var(--vin-risk)",
  concentrado: "var(--vin-warn)",
  repartido: "var(--vin-ok)",
  sinVeredicto: "var(--vin-muted)",
};

export default function CatalogoPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const c = useMemo(() => concentracionDeCatalogo(proyecto), [proyecto]);

  if (!c) {
    return (
      <Panel>
        <PanelLabel>Concentración del catálogo</PanelLabel>
        <p className="vin-muted vin-t-base leading-relaxed" style={{ maxWidth: "70ch" }}>
          Hacen falta al menos dos canciones con streams para saber de cuántas depende la carrera. Con una sola, la
          respuesta es 100% y no dice nada.
        </p>
      </Panel>
    );
  }

  const color = COLOR_ESTADO[c.estado];

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-base font-medium">Concentración del catálogo</span>
        <span className="vin-faint vin-t-sm">¿de cuántas canciones depende la carrera?</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div>
          <div className="vin-serif vin-stat tabular-nums" style={{ color }}>
            {c.cancionesParaLaMitad}
          </div>
          <div className="vin-faint vin-t-sm mt-1.5">
            {c.cancionesParaLaMitad === 1 ? "canción tiene" : "canciones tienen"} la mitad de los streams · de{" "}
            {c.canciones} cargadas
          </div>
        </div>
        <div>
          <div className="vin-serif vin-stat tabular-nums" style={{ color }}>
            {c.top1Pct}%
          </div>
          <div className="vin-faint vin-t-sm mt-1.5">
            pesa la más fuerte · un reparto parejo daría {c.parejoPct}%
          </div>
        </div>
      </div>

      {/* La forma del catálogo de un vistazo. Una lista de porcentajes obliga a
          armar el dibujo de cabeza; la barra ya es el dibujo. */}
      <div
        className="mt-5 flex h-2.5 w-full gap-px overflow-hidden rounded-full"
        style={{ background: "var(--vin-border)" }}
      >
        {c.top.map((s, i) => (
          <div
            key={s.nombre + i}
            title={`${s.nombre} · ${s.pct}% · ${formatStreams(s.streams)}`}
            style={{
              width: `${s.pct}%`,
              background: i === 0 ? color : "var(--vin-border-strong)",
              opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.12),
            }}
          />
        ))}
      </div>
      <div className="vin-faint vin-t-sm mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {c.top.slice(0, 4).map((s, i) => (
          <span key={s.nombre + i} style={i === 0 ? { color } : undefined}>
            {s.pct}% {s.nombre}
          </span>
        ))}
        {c.top.length > 4 && <span>y {c.top.length - 4} más</span>}
      </div>

      <p className="vin-t-base mt-5 leading-relaxed" style={{ maxWidth: "70ch" }}>
        <span style={{ color }}>{ESTADO_CATALOGO_LABEL[c.estado]}.</span> {c.lectura}
      </p>
      <p className="vin-muted vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch" }}>
        {c.queHacer}
      </p>

      {/* El límite va visible y no en una nota al pie: el número se parece
          demasiado a una medición como para dejarlo pasar por una. */}
      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
        {c.limite}
      </p>

      <p className="vin-faint vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch" }}>
        El {DIVERSIFICADO_PCT}% de diversificación es de{" "}
        <a href={FUENTE_DIVERSIFICACION.url} target="_blank" rel="noreferrer" className="underline">
          {FUENTE_DIVERSIFICACION.fuente}
        </a>{" "}
        y el {DEPENDENCIA_PCT}% con su descuento en el múltiplo, de{" "}
        <a href={FUENTE_DEPENDENCIA.url} target="_blank" rel="noreferrer" className="underline">
          {FUENTE_DEPENDENCIA.fuente}
        </a>
        . Consultados en {FUENTE_DEPENDENCIA.consultadoEn}.
      </p>
    </Panel>
  );
}

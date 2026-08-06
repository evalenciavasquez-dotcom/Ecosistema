"use client";

import { useMemo, useState } from "react";
import { VincereCancion } from "@/lib/vincere/types";
import { compararFirma, referenciasSugeridas, DimensionComparada } from "@/lib/vincere/firma";
import { Panel } from "./primitives";

// En qué se parece y en qué no la canción abierta a las que ya funcionaron.
//
// Se dibuja como una regla por dimensión: el rango de las referencias como
// barra, y la candidata como marca. Un número suelto no dice si 21 es mucho o
// poco; verlo contra la banda sí.

function Regla({ d }: { d: DimensionComparada }) {
  // El eje cubre el rango de referencia más un margen, o hasta la candidata si
  // se sale — para que la marca siempre quede dentro del dibujo.
  const lo = Math.min(d.refMin, d.candidata);
  const hi = Math.max(d.refMax, d.candidata);
  const margen = Math.max((hi - lo) * 0.18, 0.5);
  const min = lo - margen;
  const max = hi + margen;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;

  const fuera = d.direccion !== "dentro";
  const color = fuera ? "var(--vin-warn)" : "var(--vin-ok)";

  return (
    <div className="flex flex-col gap-2 border-b py-4 last:border-b-0" style={{ borderColor: "var(--vin-border)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="vin-t-base font-medium">{d.label}</span>
        <span className="vin-t-sm tabular-nums" style={{ color }}>
          {d.candidata}
          <span className="vin-faint"> · las que funcionan: {d.refMin}–{d.refMax}</span>
        </span>
      </div>

      <div className="relative h-6">
        {/* La banda donde viven las referencias. */}
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{
            left: `${pos(d.refMin)}%`,
            width: `${Math.max(pos(d.refMax) - pos(d.refMin), 1.5)}%`,
            background: "rgba(78,201,138,0.28)",
            border: "1px solid rgba(78,201,138,0.5)",
          }}
        />
        {/* El eje completo, tenue. */}
        <div
          className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2"
          style={{ background: "var(--vin-border)", zIndex: -1 }}
        />
        {/* La candidata. */}
        <div
          className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pos(d.candidata)}%`, background: color }}
          title={`${d.candidata} ${d.unidad}`}
        />
      </div>

      <p className="vin-faint vin-t-sm leading-relaxed">
        {fuera && (
          <span style={{ color: "var(--vin-warn)" }}>
            {d.distancia} {d.unidadEnFrase}{" "}
            {d.direccion === "porDebajo" ? "por debajo" : "por encima"} del rango.{" "}
          </span>
        )}
        {d.queSignifica}
      </p>
    </div>
  );
}

export default function FirmaPanel({
  cancion,
  catalogo,
}: {
  cancion: VincereCancion;
  catalogo: VincereCancion[];
}) {
  const [abierto, setAbierto] = useState(false);

  const refs = useMemo(() => referenciasSugeridas(catalogo, cancion.id, 3), [catalogo, cancion.id]);
  const firma = useMemo(() => (cancion.audio && refs.length >= 2 ? compararFirma(cancion, refs) : null), [cancion, refs]);

  if (!cancion.audio) {
    return (
      <Panel>
        <div className="vin-t-base mb-2 font-medium">Firma sonora</div>
        <p className="vin-muted vin-t-sm leading-relaxed">
          Sube el audio de «{cancion.nombre}» para compararla contra las canciones que ya le funcionaron al artista.
        </p>
      </Panel>
    );
  }

  if (!firma) {
    return (
      <Panel>
        <div className="vin-t-base mb-2 font-medium">Firma sonora</div>
        <p className="vin-muted vin-t-sm leading-relaxed">
          Hacen falta al menos dos canciones más con audio medido para tener contra qué comparar. Hoy hay{" "}
          {refs.length}.
        </p>
      </Panel>
    );
  }

  const enLinea = firma.dimensiones.filter((d) => d.direccion === "dentro");
  const fuera = firma.fueraDeRango;

  return (
    <div className="vin-accent-card p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-eyebrow">Firma sonora</span>
        <button onClick={() => setAbierto((v) => !v)} className="vin-faint vin-t-sm hover:underline">
          {abierto ? "ocultar el detalle" : `ver las ${firma.dimensiones.length} medidas`}
        </button>
      </div>

      <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "72ch" }}>
        {fuera.length === 0 ? (
          <>
            «{firma.candidata}» cae dentro del rango de {firma.referencias.join(", ")} en las{" "}
            {firma.dimensiones.length} medidas comparables.
          </>
        ) : (
          <>
            Contra {firma.referencias.join(", ")}, «{firma.candidata}» se sale sobre todo en{" "}
            <span style={{ color: "var(--vin-warn)" }}>{fuera[0].label.toLowerCase()}</span>
            {fuera[1] && (
              <>
                {" "}
                y <span style={{ color: "var(--vin-warn)" }}>{fuera[1].label.toLowerCase()}</span>
              </>
            )}
            .
            {enLinea.length > 0 && (
              <>
                {" "}
                En {enLinea.map((d) => d.label.toLowerCase()).join(" y ")} está en línea.
              </>
            )}
          </>
        )}
      </p>

      {fuera.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {fuera.slice(0, 4).map((d) => (
            <span
              key={d.clave}
              className="rounded-full px-3 py-1.5 vin-t-sm"
              style={{ border: "1px solid var(--vin-warn)55", color: "var(--vin-warn)" }}
            >
              {d.label} {d.direccion === "porDebajo" ? "↓" : "↑"} {d.distancia}
            </span>
          ))}
        </div>
      )}

      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "72ch" }}>
        {firma.advertencia}
      </p>

      {abierto && (
        <div className="mt-5 border-t pt-1" style={{ borderColor: "var(--vin-border)" }}>
          {firma.dimensiones.map((d) => (
            <Regla key={d.clave} d={d} />
          ))}

          {firma.noComparables.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              <span className="vin-faint vin-t-sm">Lo que no se pudo comparar:</span>
              {firma.noComparables.map((n, i) => (
                <p key={i} className="vin-faint vin-t-sm leading-relaxed">
                  · {n}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

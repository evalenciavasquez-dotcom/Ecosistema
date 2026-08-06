"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { ACCION_COLOR, ACCION_LABEL, ACCION_QUE_HACER, mapaDePlazas } from "@/lib/vincere/plazas";
import { Panel } from "./primitives";

// Dónde poner el peso de pauta y dónde no.
//
// El titular va arriba y en grande porque es la frase que se le dice al cliente
// en una reunión. El detalle por plaza está debajo para sostenerla.

export default function MapaPlazasPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const m = mapaDePlazas(proyecto);
  const [abierto, setAbierto] = useState(false);

  if (!m.plazas.length) {
    return (
      <Panel>
        <div className="vin-t-base mb-2 font-medium">Dónde rinde el presupuesto</div>
        <p className="vin-muted vin-t-sm leading-relaxed">{m.titular}</p>
        {m.avisos.map((a, i) => (
          <p key={i} className="vin-faint vin-t-sm mt-2 leading-relaxed">
            {a}
          </p>
        ))}
      </Panel>
    );
  }

  const paraPauta = m.plazas.filter((z) => z.prioridadPauta != null);

  return (
    <div className="vin-accent-card p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-eyebrow">Dónde rinde el presupuesto</span>
        <button onClick={() => setAbierto((v) => !v)} className="vin-faint vin-t-sm hover:underline">
          {abierto ? "ocultar el detalle" : `ver las ${m.plazas.length} plazas`}
        </button>
      </div>

      <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "72ch" }}>
        {m.titular}
      </p>

      {paraPauta.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {paraPauta.map((z) => (
            <span
              key={z.ciudad}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 vin-t-sm"
              style={{ border: `1px solid ${ACCION_COLOR[z.accion]}55`, color: ACCION_COLOR[z.accion] }}
            >
              <span className="tabular-nums opacity-70">#{z.prioridadPauta}</span>
              <span style={{ color: "var(--vin-text)" }}>{z.ciudad}</span>
              <span className="opacity-80">{ACCION_LABEL[z.accion].toLowerCase()}</span>
            </span>
          ))}
        </div>
      )}

      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "72ch" }}>
        El orden no es por tamaño de plaza: es por dónde cada peso mueve más. Una plaza caliente ya te encontró, así
        que pautar ahí compra audiencia que ya tenías — el error más común y más caro de un lanzamiento.
      </p>

      {abierto && (
        <div className="mt-5 flex flex-col border-t pt-2" style={{ borderColor: "var(--vin-border)" }}>
          {m.plazas.map((z) => (
            <div
              key={z.ciudad}
              className="flex flex-col gap-1.5 border-b py-3.5 last:border-b-0"
              style={{ borderColor: "var(--vin-border)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="vin-t-base font-medium">{z.ciudad}</span>
                {z.pais && <span className="vin-faint vin-t-sm">{z.pais}</span>}
                <span className="vin-faint vin-t-sm tabular-nums">calor {z.calor}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 vin-t-xs"
                  style={{ border: `1px solid ${ACCION_COLOR[z.accion]}55`, color: ACCION_COLOR[z.accion] }}
                >
                  {ACCION_LABEL[z.accion]}
                </span>
                {z.prioridadPauta != null && (
                  <span className="vin-faint vin-t-sm">pauta #{z.prioridadPauta}</span>
                )}
                {z.showsPrevios > 0 && (
                  <span className="vin-faint vin-t-sm">
                    {z.showsPrevios} show{z.showsPrevios > 1 ? "s" : ""}
                    {z.mejorConversionPct != null && ` · mejor taquilla ${z.mejorConversionPct}%`}
                  </span>
                )}
              </div>
              <p className="vin-muted vin-t-sm leading-relaxed">{z.razon}</p>
              <p className="vin-faint vin-t-sm leading-relaxed">{ACCION_QUE_HACER[z.accion]}</p>
            </div>
          ))}
        </div>
      )}

      {m.avisos.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {m.avisos.map((a, i) => (
            <p key={i} className="vin-faint vin-t-sm leading-relaxed">
              {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

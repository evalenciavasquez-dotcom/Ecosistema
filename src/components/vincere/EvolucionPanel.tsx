"use client";

import { useState } from "react";
import { VincereProyecto, VincereSnapshot } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { formatFollowers, formatStreams } from "@/lib/vincere/format";
import { Panel, PanelLabel } from "./primitives";

type Metrica = "streamsMes" | "seguidores" | "momentumIndex";

const METRICAS: { key: Metrica; label: string; formato: (n: number) => string }[] = [
  { key: "streamsMes", label: "Streams/mes", formato: formatStreams },
  { key: "seguidores", label: "Seguidores", formato: formatFollowers },
  { key: "momentumIndex", label: "Momentum", formato: (n) => `${n}/100` },
];

function fechaCorta(iso: string) {
  const [, m, d] = iso.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[Number(m) - 1] ?? ""}`;
}

// Trayectoria de los indicadores entre cargas. La plataforma deja de saber
// solo cómo está la carrera hoy y pasa a saber cómo llegó hasta aquí.
export default function EvolucionPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const capturar = useVincereStore((s) => s.capturarSnapshot);
  const eliminar = useVincereStore((s) => s.eliminarSnapshot);
  const [metrica, setMetrica] = useState<Metrica>("streamsMes");
  const [detalle, setDetalle] = useState(false);

  const historial = proyecto.historial ?? [];
  const activa = METRICAS.find((m) => m.key === metrica)!;

  if (historial.length < 2) {
    return (
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelLabel>Evolución</PanelLabel>
            <p className="vin-muted vin-t-sm">
              {historial.length === 0
                ? "Sin fotos guardadas todavía. Cada carga de data guarda una automáticamente."
                : "Hay una sola foto. Con la próxima carga aparece la trayectoria y la IA podrá leer la evolución, no solo el estado de hoy."}
            </p>
          </div>
          <button onClick={() => capturar(proyecto.id, "Captura manual")} className="vin-btn-ghost whitespace-nowrap">
            Guardar foto de hoy
          </button>
        </div>
      </Panel>
    );
  }

  const valores = historial.map((h) => h[metrica]);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const primero = historial[0];
  const ultimo = historial[historial.length - 1];
  const delta = ultimo[metrica] - primero[metrica];
  const deltaPct = primero[metrica] > 0 ? Math.round((delta / primero[metrica]) * 100) : null;
  const colorDelta = delta > 0 ? "#5cc98e" : delta < 0 ? "#e0483a" : "var(--vin-muted)";

  const puntos = historial.map((h, i) => {
    const x = (i / (historial.length - 1)) * 100;
    const y = 8 + (1 - (h[metrica] - min) / rango) * 84;
    return [x, y] as const;
  });
  const linea = puntos.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const fin = puntos[puntos.length - 1];

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PanelLabel>Evolución · {historial.length} capturas</PanelLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {METRICAS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetrica(m.key)}
              className="rounded-xl px-2.5 py-1 vin-t-sm transition-colors"
              style={{
                background: metrica === m.key ? "rgba(224,72,58,0.14)" : "transparent",
                color: metrica === m.key ? "var(--vin-text)" : "var(--vin-muted)",
                border: `1px solid ${metrica === m.key ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="vin-serif vin-t-xl">{activa.formato(ultimo[metrica])}</span>
        <span className="vin-t-sm" style={{ color: colorDelta }}>
          {delta > 0 ? "+" : ""}
          {activa.formato(Math.abs(delta)).replace(/^/, delta < 0 ? "−" : "")}
          {deltaPct !== null && metrica !== "momentumIndex" ? ` (${delta > 0 ? "+" : ""}${deltaPct}%)` : ""}
        </span>
        <span className="vin-faint vin-t-xs">
          desde {fechaCorta(primero.fecha)} · {historial.length} cargas
        </span>
      </div>

      <div className="relative h-[110px] w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline
            points={linea}
            fill="none"
            stroke="var(--vin-accent)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${fin[0]}%`, top: `${fin[1]}%`, background: "var(--vin-accent)" }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        <span className="vin-faint vin-t-xs">{fechaCorta(primero.fecha)}</span>
        <span className="vin-faint vin-t-xs">{fechaCorta(ultimo.fecha)}</span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t pt-3.5" style={{ borderColor: "var(--vin-border)" }}>
        <button onClick={() => setDetalle((v) => !v)} className="vin-faint vin-t-xs hover:underline">
          {detalle ? "Ocultar capturas" : "Ver todas las capturas"}
        </button>
        <button onClick={() => capturar(proyecto.id, "Captura manual")} className="vin-faint vin-t-xs hover:underline">
          Guardar foto de hoy
        </button>
      </div>

      {detalle && (
        <ul className="mt-3 space-y-2">
          {[...historial].reverse().map((h) => (
            <FilaCaptura key={h.id} snapshot={h} onEliminar={() => eliminar(proyecto.id, h.id)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function FilaCaptura({ snapshot, onEliminar }: { snapshot: VincereSnapshot; onEliminar: () => void }) {
  return (
    <li
      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2"
      style={{ borderColor: "var(--vin-border)" }}
    >
      <span className="vin-t-sm">{fechaCorta(snapshot.fecha)}</span>
      <span className="vin-muted flex flex-wrap items-center gap-2.5 vin-t-xs">
        <span>{formatStreams(snapshot.streamsMes)}</span>
        <span>{formatFollowers(snapshot.seguidores)} seg.</span>
        <span>{snapshot.momentumIndex}/100</span>
        <span className="vin-faint">{snapshot.etiqueta}</span>
        <button onClick={onEliminar} className="vin-faint px-1 hover:underline" title="Eliminar captura">
          ✕
        </button>
      </span>
    </li>
  );
}

"use client";

import { ReactNode } from "react";

export { formatStreams, formatFollowers, signed } from "@/lib/vincere/format";

// La cabecera lleva una barra de acento a su izquierda.
//
// Sin ella la página abría en blanco y gris, sin un solo punto donde apoyar el
// ojo — que junto con el blanco puro y los recuadros era lo que la hacía leer
// como un formulario. La barra no es decoración: marca dónde empieza la
// sección, que es exactamente la información que faltaba a la vista.
export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-9 pl-4" style={{ borderLeft: "3px solid var(--vin-accent)" }}>
      <div className="vin-eyebrow mb-2.5">{eyebrow}</div>
      <h1 className="vin-display vin-t-display" style={{ textWrap: "balance" }}>
        {title}
      </h1>
      {subtitle && <p className="vin-muted vin-t-base mt-3 max-w-[62ch]">{subtitle}</p>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`vin-card p-6 ${className}`}>{children}</div>;
}

// El rótulo ya no lleva mayúsculas por defecto. Había trescientos repartidos
// por la app y ese ruido era la mitad de la sensación de formulario: cuando
// todo grita en versalitas, nada destaca. Se reserva `alto` para lo que de
// verdad encabeza una sección.
export function PanelLabel({ children, alto = false }: { children: ReactNode; alto?: boolean }) {
  return alto ? (
    <div className="vin-label mb-4">{children}</div>
  ) : (
    <div className="vin-muted vin-t-sm mb-3.5 font-medium">{children}</div>
  );
}

// La cifra manda y la etiqueta la acompaña debajo, en pequeño. El delta va
// arriba a la derecha con su color, para que el estado se lea sin leer.
export function StatCard({
  value,
  label,
  delta,
  tono = "neutro",
}: {
  value: ReactNode;
  label: string;
  delta?: string;
  tono?: "neutro" | "bueno" | "malo";
}) {
  const color =
    tono === "bueno" ? "var(--vin-ok)" : tono === "malo" ? "var(--vin-risk)" : "var(--vin-muted)";
  return (
    <div className="vin-card flex flex-col justify-between gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="vin-stat vin-serif min-w-0">{value}</div>
        {delta && (
          <span className="vin-t-sm shrink-0 tabular-nums" style={{ color }}>
            {delta}
          </span>
        )}
      </div>
      <div className="vin-faint vin-t-sm">{label}</div>
    </div>
  );
}

export function BarRow({
  label,
  pct,
  value,
  labelWidth = "w-16",
  opacity = 1,
}: {
  label: string;
  pct: number;
  value?: string;
  labelWidth?: string;
  opacity?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="mb-3 flex items-center gap-3.5">
      <div className={`${labelWidth} vin-muted vin-t-sm shrink-0`}>{label}</div>
      <div className="vin-bar-track h-1.5 flex-1">
        <div className="vin-bar-fill h-full" style={{ width: `${clamped}%`, opacity }} />
      </div>
      <div className="vin-t-sm w-12 shrink-0 text-right tabular-nums">
        {value ?? `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

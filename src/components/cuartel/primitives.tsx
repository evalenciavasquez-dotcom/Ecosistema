"use client";

import { ReactNode } from "react";
import {
  CUARTEL_CERTEZA_DETALLE,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LUZ_COLOR,
  CuartelCerteza,
  CuartelLuz,
  CuartelOrigen,
  CuartelValidez,
} from "@/lib/cuartel/types";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cua-card p-[22px] ${className}`}>{children}</div>;
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return <div className="cua-label mb-3.5">{children}</div>;
}

export function StatCard({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="cua-card px-[18px] py-[18px]">
      <div className="cua-mono text-[30px] leading-none" style={{ color: "var(--cua-accent)" }}>
        {value}
      </div>
      <div className="mt-1.5 text-[12.5px]" style={{ color: "var(--cua-muted)" }}>
        {label}
      </div>
    </div>
  );
}

// Etiqueta de nivel de certeza. Va pegada al dato, no en una leyenda al pie:
// el punto es que nunca se lea un riesgo sin saber quién lo afirma.
export function CertezaTag({ certeza }: { certeza: CuartelCerteza }) {
  const color =
    certeza === "hecho"
      ? "var(--cua-verde)"
      : certeza === "reportado"
        ? "var(--cua-accent-light)"
        : certeza === "interpretacion"
          ? "var(--cua-accent)"
          : "var(--cua-faint)";

  return (
    <span
      className="cua-mono inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.05em]"
      style={{ color, borderColor: color }}
      title={CUARTEL_CERTEZA_DETALLE[certeza]}
    >
      {CUARTEL_CERTEZA_LABEL[certeza]}
    </span>
  );
}

// El semáforo del prototipo son cuatro puntos que se ciclan al tocarlos. El
// gris no es decorativo: es "sin evaluar". Arrancar en amarillo daría por
// hecha una evaluación que nadie hizo.
export function LuzDot({
  luz,
  titulo,
  onClick,
}: {
  luz: CuartelLuz | null;
  titulo: string;
  onClick?: () => void;
}) {
  const color = luz ? CUARTEL_LUZ_COLOR[luz] : "transparent";
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      disabled={!onClick}
      aria-label={titulo}
      className="h-[22px] w-[22px] shrink-0 rounded-full"
      style={{
        background: color,
        border: luz ? "1px solid #17140f" : "1px dashed var(--cua-border-strong)",
        cursor: onClick ? "pointer" : "default",
      }}
    />
  );
}

// Trazabilidad (PRD §14). Solo se marca lo que escribió el sistema: lo demás
// es de Eduardo por defecto, y llenar la pantalla de etiquetas "tuyo" hace que
// se dejen de leer justo las que importan.
export function OrigenTag({ origen }: { origen: CuartelOrigen | null }) {
  if (origen !== "sistema") return null;
  return (
    <span
      className="cua-mono inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.05em]"
      style={{ color: "var(--cua-accent)", borderColor: "var(--cua-accent)" }}
      title="Lo redactó el sistema, no vos. Editarlo lo vuelve tuyo."
    >
      Del sistema
    </span>
  );
}

const VALIDEZ_ESTILO: Record<CuartelValidez, { label: string; color: string }> = {
  valida: { label: "Válida", color: "var(--cua-verde)" },
  pendiente: { label: "Pendiente", color: "var(--cua-amarillo)" },
  descartada: { label: "Descartada", color: "var(--cua-rojo)" },
};

export function ValidezBadge({ validez }: { validez: CuartelValidez }) {
  const info = VALIDEZ_ESTILO[validez];
  return (
    <span
      className="cua-mono shrink-0 rounded-sm border px-2 py-[3px] text-[10px] uppercase tracking-[0.05em]"
      style={{ color: info.color, borderColor: info.color }}
    >
      {info.label}
    </span>
  );
}

export function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12.5px]" style={{ color: "var(--cua-muted)" }}>
        {label}
      </div>
      {ayuda && (
        <div className="mb-1.5 text-[11.5px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          {ayuda}
        </div>
      )}
      {children}
    </label>
  );
}

export function ErrorNota({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--cua-rojo)" }}>
      {children}
    </p>
  );
}

export function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="cua-mono mt-2.5 text-[11px] italic leading-relaxed" style={{ color: "var(--cua-faint)" }}>
      {children}
    </p>
  );
}

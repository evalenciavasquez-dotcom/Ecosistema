"use client";

import { ReactNode } from "react";
import {
  CUARTEL_CERTEZA_DETALLE,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LUZ_COLOR,
  CuartelCerteza,
  CuartelLuz,
  CuartelValidez,
} from "@/lib/cuartel/types";

export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <div className="cua-eyebrow mb-2.5">{eyebrow}</div>
      <h1 className="cua-serif text-3xl font-medium leading-tight md:text-4xl">{title}</h1>
      {subtitle && <p className="cua-muted mt-2.5 max-w-2xl text-sm leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cua-card p-5 ${className}`}>{children}</div>;
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return <div className="cua-label mb-3.5">{children}</div>;
}

export function StatCard({ value, label, color }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div className="cua-card p-4">
      <div className="cua-serif text-2xl leading-none" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="cua-faint cua-mono mt-2 text-[11px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Etiqueta de nivel de certeza. Va pegada al dato, no en una leyenda al pie:
// el punto es que nunca se lea un riesgo sin saber quién lo afirma.
export function CertezaTag({ certeza }: { certeza: CuartelCerteza }) {
  const color =
    certeza === "hecho"
      ? "#5cc98e"
      : certeza === "reportado"
        ? "#2dd4bf"
        : certeza === "interpretacion"
          ? "#d99a2b"
          : "#a09889";

  return (
    <span
      className="cua-mono inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] tracking-wide"
      style={{ color, borderColor: `${color}66` }}
      title={CUARTEL_CERTEZA_DETALLE[certeza]}
    >
      {CUARTEL_CERTEZA_LABEL[certeza]}
    </span>
  );
}

export function LuzChip({ luz }: { luz: CuartelLuz | null }) {
  if (!luz) {
    return (
      <span className="cua-mono text-[11px]" style={{ color: "var(--cua-dim)" }}>
        sin evaluar
      </span>
    );
  }
  const color = CUARTEL_LUZ_COLOR[luz];
  return (
    <span className="cua-mono inline-flex items-center gap-1.5 text-[11px]" style={{ color }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {luz}
    </span>
  );
}

const VALIDEZ_ESTILO: Record<CuartelValidez, { label: string; color: string }> = {
  valida: { label: "Válida", color: "#5cc98e" },
  pendiente: { label: "Pendiente", color: "#a09889" },
  descartada: { label: "Descartada por el candado", color: "#e0483a" },
};

export function ValidezBadge({ validez }: { validez: CuartelValidez }) {
  const info = VALIDEZ_ESTILO[validez];
  return (
    <span
      className="cua-mono inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider"
      style={{ color: info.color, borderColor: `${info.color}55` }}
    >
      {validez === "descartada" && <span aria-hidden>🔒</span>}
      {info.label}
    </span>
  );
}

export function Campo({
  label,
  ayuda,
  children,
}: {
  label: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="cua-label mb-2">{label}</div>
      {ayuda && <div className="cua-faint mb-2 text-[12px] leading-relaxed">{ayuda}</div>}
      {children}
    </label>
  );
}

export function ErrorNota({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "#e0483a" }}>
      {children}
    </p>
  );
}

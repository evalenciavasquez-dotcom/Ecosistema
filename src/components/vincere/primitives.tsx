"use client";

import { ReactNode } from "react";

export { formatStreams, formatFollowers, signed } from "@/lib/vincere/format";

export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-7">
      <div className="vin-eyebrow mb-2.5">{eyebrow}</div>
      <h1 className="vin-serif text-3xl font-medium leading-tight md:text-4xl">{title}</h1>
      {subtitle && <p className="vin-muted mt-2.5 max-w-2xl text-sm leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`vin-card p-5 ${className}`}>{children}</div>;
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return <div className="vin-label mb-3.5">{children}</div>;
}

export function StatCard({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="vin-card p-4">
      <div className="vin-serif text-2xl leading-none">{value}</div>
      <div className="vin-faint mt-2 text-xs">{label}</div>
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
    <div className="mb-2.5 flex items-center gap-3">
      <div className={`${labelWidth} shrink-0 text-xs vin-muted`}>{label}</div>
      <div className="vin-bar-track h-2 flex-1">
        <div className="vin-bar-fill h-full" style={{ width: `${clamped}%`, opacity }} />
      </div>
      <div className="w-12 shrink-0 text-right text-xs">{value ?? `${Math.round(pct)}%`}</div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

function elapsedLabel(inicioISO: string, now: number): string {
  const seg = Math.max(0, Math.floor((now - new Date(inicioISO).getTime()) / 1000));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function TimerChip() {
  const timerActivo = useAppStore((s) => s.timerActivo);
  const proyectos = useAppStore((s) => s.proyectos);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerActivo) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timerActivo]);

  if (!timerActivo) return null;

  const nombre = proyectos.find((p) => p.id === timerActivo.proyectoId)?.nombre ?? "Proyecto";

  return (
    <button
      onClick={() => stopTimer()}
      title="Detener y registrar el tiempo"
      className="flex items-center gap-2 rounded-full bg-accent-green/15 border border-accent-green/40 px-3 py-1.5 text-xs font-medium text-accent-green"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
      </span>
      <span className="max-w-24 truncate sm:max-w-40">{nombre}</span>
      <span className="tabular-nums">{elapsedLabel(timerActivo.inicio, now)}</span>
      <span aria-hidden>■</span>
    </button>
  );
}

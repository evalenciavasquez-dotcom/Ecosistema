"use client";

import { useState } from "react";
import { VincereInsight } from "@/lib/vincere/types";
import EvidenceTag from "./EvidenceTag";

interface Props {
  title: string;
  insights: VincereInsight[];
  onGenerate: () => Promise<void>;
  emptyHint?: string;
}

export default function AIInsights({ title, insights, onGenerate, emptyHint }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la lectura");
    } finally {
      setLoading(false);
    }
  }

  const has = insights.length > 0;

  return (
    <div className="vin-accent-card p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
          <span className="vin-eyebrow">{title}</span>
        </div>
        <button onClick={handleGenerate} disabled={loading} className="vin-btn-ghost whitespace-nowrap !py-1.5 !text-xs">
          {loading ? "Interpretando…" : has ? "Actualizar lectura" : "Generar lectura VINCERE"}
        </button>
      </div>

      {error && <p className="mb-3 text-xs" style={{ color: "var(--vin-accent)" }}>{error}</p>}

      {has ? (
        <ul className="space-y-3.5">
          {insights.map((ins) => (
            <li key={ins.id} className="flex flex-col gap-1.5">
              <p className="text-sm leading-relaxed">{ins.texto}</p>
              <EvidenceTag nivel={ins.nivel} />
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className="vin-muted text-sm">
            {emptyHint ?? "Aún no hay lectura de IA para esta sección. Genérala para interpretar la data cargada."}
          </p>
        )
      )}
    </div>
  );
}

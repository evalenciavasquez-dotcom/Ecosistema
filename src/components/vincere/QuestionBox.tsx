"use client";

import { useState } from "react";
import { VincereQAEntry } from "@/lib/vincere/types";
import EvidenceTag from "./EvidenceTag";

interface Props {
  log: VincereQAEntry[];
  onAsk: (pregunta: string) => Promise<void>;
  placeholder?: string;
}

export default function QuestionBox({ log, onAsk, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const pregunta = value.trim();
    if (!pregunta || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onAsk(pregunta);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar la IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vin-card p-5">
      <div className="vin-label mb-3.5">Preguntas abiertas</div>

      {log.length > 0 && (
        <ul className="mb-4 space-y-3">
          {log.map((entry) => (
            <li key={entry.id} className="rounded-md p-3" style={{ background: "var(--vin-surface-2)" }}>
              <p className="vin-muted text-xs font-medium">{entry.pregunta}</p>
              <p className="mt-1.5 text-sm leading-relaxed">{entry.respuesta}</p>
              <div className="mt-2">
                <EvidenceTag nivel={entry.nivel} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 text-xs" style={{ color: "var(--vin-accent)" }}>{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAsk();
          }}
          placeholder={placeholder ?? "¿Por qué cayó esto? ¿Lanzo en octubre?…"}
          className="vin-input flex-1"
        />
        <button onClick={handleAsk} disabled={loading || !value.trim()} className="vin-btn-primary whitespace-nowrap">
          {loading ? "Pensando…" : "Preguntar"}
        </button>
      </div>
    </div>
  );
}

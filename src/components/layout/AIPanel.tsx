"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { selectInsights } from "@/lib/selectors";
import { answerQuery } from "@/lib/assistant";
import { EvidenceBadge } from "@/components/ui/badges";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  texto: string;
  evidenceLevel?: "verificado" | "documentado" | "reportado" | "interpretacion";
  etiqueta?: string;
}

function askWithFreshState(text: string, setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { proyectos, personas, decisiones, acciones } = useAppStore.getState();
  const answer = answerQuery(trimmed, { proyectos, personas, decisiones, acciones });
  setMessages((prev) => [
    ...prev,
    { id: `u-${Date.now()}`, role: "user", texto: trimmed },
    {
      id: `s-${Date.now()}`,
      role: "system",
      texto: answer.texto,
      evidenceLevel: answer.evidenceLevel,
      etiqueta: answer.etiqueta,
    },
  ]);
}

export function AnalysisPanelBody() {
  const proyectos = useAppStore((s) => s.proyectos);
  const personas = useAppStore((s) => s.personas);
  const decisiones = useAppStore((s) => s.decisiones);

  const insights = selectInsights(proyectos, personas, decisiones);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prevState) => {
      if (state.pendingAssistantQuery && state.pendingAssistantQuery !== prevState.pendingAssistantQuery) {
        askWithFreshState(state.pendingAssistantQuery, setMessages);
        useAppStore.getState().clearAssistantQuery();
      }
    });
    return () => unsub();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    askWithFreshState(query, setMessages);
    setQuery("");
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {insights.length === 0 && (
          <p className="text-xs text-muted">Sin señales relevantes por ahora.</p>
        )}
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-xl bg-surface-2 border border-border-subtle p-4">
            <p className="text-sm leading-snug">{insight.texto}</p>
            <div className="flex items-center gap-2 mt-3">
              <EvidenceBadge level={insight.evidenceLevel} />
              <span className="text-xs text-muted">{insight.etiqueta}</span>
            </div>
          </div>
        ))}

        {messages.length > 0 && (
          <div className="pt-2 mt-2 border-t border-border-subtle space-y-3">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="text-sm text-right">
                  <span className="inline-block rounded-xl bg-accent-blue/15 text-foreground px-3 py-2">
                    {m.texto}
                  </span>
                </div>
              ) : (
                <div key={m.id} className="rounded-xl bg-surface-2 border border-border-subtle p-4">
                  <p className="text-sm leading-snug">{m.texto}</p>
                  <div className="flex items-center gap-2 mt-3">
                    {m.evidenceLevel && <EvidenceBadge level={m.evidenceLevel} />}
                    {m.etiqueta && <span className="text-xs text-muted">{m.etiqueta}</span>}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border-subtle flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pregúntale al sistema..."
          className="flex-1 rounded-full bg-surface-2 border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-accent-blue transition-colors"
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue text-white"
          aria-label="Enviar"
        >
          →
        </button>
      </form>
    </>
  );
}

export default function AIPanel() {
  return (
    <aside className="hidden xl:flex w-96 shrink-0 flex-col border-l border-border-subtle bg-surface">
      <div className="px-5 py-5 border-b border-border-subtle">
        <div className="text-sm font-semibold">Motor de análisis estratégico</div>
        <div className="text-xs text-muted mt-0.5">El núcleo — presente en todo momento</div>
      </div>
      <AnalysisPanelBody />
    </aside>
  );
}

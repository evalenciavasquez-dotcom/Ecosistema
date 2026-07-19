"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { selectInsights, selectPersonasEsperando, proyectoNombre } from "@/lib/selectors";
import { answerQuery } from "@/lib/assistant";
import { computeCajaPorCuenta, computeProyeccion, computeRunway, computeSplitPersonalProyectos } from "@/lib/finanzas";
import { hoyISO } from "@/lib/tiempo";
import { EvidenceBadge } from "@/components/ui/badges";

interface ChatMessage {
  id: string;
  role: "user" | "system";
  texto: string;
  evidenceLevel?: "verificado" | "documentado" | "reportado" | "interpretacion";
  etiqueta?: string;
  pending?: boolean;
}

async function askWithFreshState(text: string, setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { proyectos, personas, decisiones, acciones, movimientos } = useAppStore.getState();
  const userMsgId = `u-${Date.now()}`;
  const pendingId = `s-${Date.now()}`;
  setMessages((prev) => [
    ...prev,
    { id: userMsgId, role: "user", texto: trimmed },
    { id: pendingId, role: "system", texto: "Pensando…", pending: true },
  ]);

  const hoy = hoyISO();
  const decisionesAbiertas = decisiones
    .filter((d) => d.estado === "Abierta")
    .map((d) => ({
      pregunta: d.pregunta,
      nivelRiesgo: d.nivelRiesgo,
      impactoEconomico: d.impactoEconomico,
      recomendacionSistema: d.recomendacionSistema,
      proyecto: proyectoNombre(proyectos, d.proyectoId),
    }));
  const accionesAbiertas = acciones
    .filter((a) => a.estado !== "Completada" && a.estado !== "Cancelada")
    .map((a) => ({ titulo: a.titulo, estado: a.estado, fecha: a.fecha, proyecto: proyectoNombre(proyectos, a.proyectoId) }));
  const movimientosSinConciliar = movimientos.filter((m) => m.estado === "sin_conciliar").length;
  const movimientosEsperadosVencidos = movimientos
    .filter((m) => m.estado === "esperado" && m.fecha && m.fecha < hoy)
    .map((m) => ({ descripcion: m.descripcion, monto: m.monto, moneda: m.moneda, tipo: m.tipo, fecha: m.fecha }));
  const personasEsperando = selectPersonasEsperando(personas).map((p) => ({
    nombre: p.nombre,
    diasSinResponder: p.diasSinResponder,
    empresaProyecto: p.empresaProyecto,
  }));

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pregunta: trimmed,
        proyectos: proyectos.map((p) => ({
          nombre: p.nombre,
          estado: p.estado,
          prioridad: p.prioridad,
          situacionEconomica: p.situacionEconomica,
          riesgos: p.riesgos,
          oportunidades: p.oportunidades,
          evidenceLevel: p.evidenceLevel,
        })),
        decisionesAbiertas,
        runway: computeRunway(movimientos, hoy),
        proyeccion: computeProyeccion(movimientos, hoy),
        cajaPorCuenta: computeCajaPorCuenta(movimientos),
        splitPersonalProyectos: computeSplitPersonalProyectos(movimientos),
        movimientosSinConciliar,
        movimientosEsperadosVencidos,
        personasEsperando,
        accionesAbiertas,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.result) throw new Error(body.error ?? "Sin respuesta");
    const { respuesta, evidenceLevel, etiqueta } = body.result;
    setMessages((prev) =>
      prev.map((m) => (m.id === pendingId ? { id: pendingId, role: "system", texto: respuesta, evidenceLevel, etiqueta } : m))
    );
  } catch {
    // Sin IA disponible (sin API key, sin red) — respaldo instantáneo por reglas,
    // más limitado pero mejor que dejar la pregunta sin respuesta.
    const answer = answerQuery(trimmed, { proyectos, personas, decisiones, acciones });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === pendingId
          ? { id: pendingId, role: "system", texto: answer.texto, evidenceLevel: answer.evidenceLevel, etiqueta: answer.etiqueta }
          : m
      )
    );
  }
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
                  <p className={`text-sm leading-snug ${m.pending ? "text-muted italic" : ""}`}>{m.texto}</p>
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

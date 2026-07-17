"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { EvidenceBadge, RiesgoBadge } from "@/components/ui/badges";
import {
  Decision,
  ESCENARIO_DESCRIPCION,
  ESCENARIO_LABEL,
  EscenarioTipo,
  NivelRiesgo,
} from "@/lib/types";
import { proyectoNombre } from "@/lib/selectors";

const ESCENARIO_ORDEN: EscenarioTipo[] = [
  "avanzar",
  "avanzar_condicionado",
  "probar",
  "renegociar",
  "esperar",
  "pausar",
  "salir",
  "no_hacer_nada",
];

export default function DecisionesPage() {
  const decisiones = useAppStore((s) => s.decisiones);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const selected = decisiones.find((d) => d.id === selectedId) ?? null;

  if (selected) {
    return <DecisionDetail decision={selected} onClose={() => setSelectedId(null)} />;
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-4 py-3 text-xs text-muted overflow-x-auto whitespace-nowrap">
        <span>Diagnóstico → Escenarios → Recomendación → Condiciones → Acción → Seguimiento → Aprendizaje</span>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2"
        >
          + Nueva decisión
        </button>
      </div>

      <div className="space-y-3">
        {decisiones.length === 0 && <p className="text-sm text-muted">No hay decisiones registradas.</p>}
        {decisiones.map((d) => (
          <DecisionCard key={d.id} decision={d} onClick={() => setSelectedId(d.id)} />
        ))}
      </div>

      {showNew && <NuevaDecisionModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function DecisionCard({ decision, onClick }: { decision: Decision; onClick: () => void }) {
  const proyectos = useAppStore((s) => s.proyectos);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-border-subtle bg-surface p-4 hover:border-accent-blue/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">{decision.pregunta}</p>
        <RiesgoBadge nivel={decision.nivelRiesgo} />
      </div>
      <div className="text-xs text-muted mt-2">
        {proyectoNombre(proyectos, decision.proyectoId)}
        {decision.fechaLimite && <> · Límite {decision.fechaLimite}</>}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <EvidenceBadge level={decision.evidenceLevel} />
        {decision.estado !== "Abierta" && (
          <span className="text-xs text-accent-green">{decision.estado}</span>
        )}
      </div>
      {decision.recomendacionSistema && (
        <div className="text-xs text-muted mt-2 rounded-lg bg-surface-2 px-3 py-2">
          Recomendación: {decision.recomendacionSistema}
        </div>
      )}
    </button>
  );
}

function DecisionDetail({ decision, onClose }: { decision: Decision; onClose: () => void }) {
  const proyectos = useAppStore((s) => s.proyectos);
  const resolverDecision = useAppStore((s) => s.resolverDecision);
  const [respuesta, setRespuesta] = useState(decision.decisionFinal);

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
        ← Volver a decisiones
      </button>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight leading-snug">{decision.pregunta}</h2>
          <RiesgoBadge nivel={decision.nivelRiesgo} />
        </div>
        <p className="text-sm text-muted mt-2">{decision.contexto}</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <EvidenceBadge level={decision.evidenceLevel} />
          <span className="text-xs text-muted">{proyectoNombre(proyectos, decision.proyectoId)}</span>
          {decision.fechaLimite && <span className="text-xs text-muted">· Límite {decision.fechaLimite}</span>}
        </div>
      </div>

      {decision.impactoEconomico && (
        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Impacto económico</div>
          <div className="text-sm mt-1.5">{decision.impactoEconomico}</div>
        </div>
      )}

      {decision.recomendacionSistema && (
        <div className="rounded-xl border border-accent-blue/40 bg-accent-blue/10 p-4">
          <div className="text-[11px] uppercase tracking-wide text-accent-blue">Recomendación del sistema</div>
          <div className="text-sm mt-1.5">{decision.recomendacionSistema}</div>
        </div>
      )}

      <div>
        <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Comparación de escenarios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ESCENARIO_ORDEN.map((tipo) => {
            const ev = decision.escenarios.find((e) => e.tipo === tipo);
            const esRecomendado =
              decision.recomendacionSistema &&
              normalizeMatch(decision.recomendacionSistema, ESCENARIO_LABEL[tipo]);
            return (
              <div
                key={tipo}
                className={`rounded-xl border p-3 ${
                  esRecomendado ? "border-accent-blue/50 bg-accent-blue/5" : "border-border-subtle bg-surface"
                }`}
              >
                <div className="text-sm font-medium">{ESCENARIO_LABEL[tipo]}</div>
                <div className="text-[11px] text-muted mt-0.5">{ESCENARIO_DESCRIPCION[tipo]}</div>
                <p className="text-xs mt-2">{ev?.analisis || "Sin análisis registrado todavía."}</p>
              </div>
            );
          })}
        </div>
      </div>

      {decision.condiciones.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Condiciones</h3>
          <ul className="space-y-1.5 list-disc list-inside text-sm">
            {decision.condiciones.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wide text-muted">Decisión final</div>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={2}
          placeholder="¿Qué decidiste finalmente?"
          className="w-full resize-none rounded-lg bg-surface-2 border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
        />
        <div className="flex justify-end">
          <button
            onClick={() => resolverDecision(decision.id, respuesta)}
            disabled={!respuesta.trim()}
            className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-40"
          >
            Registrar decisión
          </button>
        </div>
        {decision.estado === "Decidida" && (
          <p className="text-xs text-accent-green">Decisión registrada — estado: {decision.estado}</p>
        )}
      </div>
    </div>
  );
}

function normalizeMatch(a: string, b: string): boolean {
  return a.toLowerCase().includes(b.toLowerCase());
}

function NuevaDecisionModal({ onClose }: { onClose: () => void }) {
  const addDecision = useAppStore((s) => s.addDecision);
  const proyectos = useAppStore((s) => s.proyectos);
  const [pregunta, setPregunta] = useState("");
  const [contexto, setContexto] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [fechaLimite, setFechaLimite] = useState("");
  const [nivelRiesgo, setNivelRiesgo] = useState<NivelRiesgo>("Medio");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pregunta.trim()) return;
    addDecision({
      pregunta: pregunta.trim(),
      contexto,
      proyectoId: proyectoId || null,
      fechaLimite,
      nivelRiesgo,
      evidenceLevel: "reportado",
      opciones: [],
      escenarios: ESCENARIO_ORDEN.map((tipo) => ({ tipo, analisis: "" })),
      impactoEconomico: "",
      recomendacionSistema: "",
      decisionFinal: "",
      condiciones: [],
      resultadoPosterior: "",
      estado: "Abierta",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <h3 className="font-semibold">Nueva decisión</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Pregunta exacta</label>
          <input
            autoFocus
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Contexto</label>
          <textarea
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Proyecto</label>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Riesgo</label>
            <select
              value={nivelRiesgo}
              onChange={(e) => setNivelRiesgo(e.target.value as NivelRiesgo)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="Alto">Alto</option>
              <option value="Medio">Medio</option>
              <option value="Bajo">Bajo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Fecha límite</label>
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancelar
          </button>
          <button type="submit" className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

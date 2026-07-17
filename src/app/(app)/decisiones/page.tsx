"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { EvidenceBadge, RiesgoBadge } from "@/components/ui/badges";
import { Pill } from "@/components/ui/Pill";
import {
  CONCLUSION_RENTABILIDAD_LABEL,
  Decision,
  ESCENARIO_DESCRIPCION,
  ESCENARIO_LABEL,
  EscenarioTipo,
  NivelRiesgo,
  StrategicCase,
} from "@/lib/types";
import { buildAnalysisContext, proyectoNombre } from "@/lib/selectors";
import { genId } from "@/lib/id";

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
  const personas = useAppStore((s) => s.personas);
  const movimientos = useAppStore((s) => s.movimientos);
  const evidencias = useAppStore((s) => s.evidencias);
  const historial = useAppStore((s) => s.historial);
  const decisiones = useAppStore((s) => s.decisiones);
  const strategicCases = useAppStore((s) => s.strategicCases);
  const addStrategicCase = useAppStore((s) => s.addStrategicCase);
  const resolverDecision = useAppStore((s) => s.resolverDecision);
  const [respuesta, setRespuesta] = useState(decision.decisionFinal);
  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState("");

  const strategicCase = strategicCases.find((c) => c.decisionId === decision.id) ?? null;

  async function handleAnalyze() {
    setAnalizando(true);
    setErrorAnalisis("");
    try {
      const ctx = buildAnalysisContext(decision, proyectos, personas, movimientos, evidencias, historial, decisiones);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorAnalisis(data.error || "No se pudo generar el análisis.");
        return;
      }
      const nuevoCaso: StrategicCase = {
        id: genId("case"),
        decisionId: decision.id,
        ...data.result,
        nivelAnalisis: "3",
        modeloUsado: "claude-sonnet-5",
        creadoEn: new Date().toISOString(),
      };
      addStrategicCase(nuevoCaso);
    } catch {
      setErrorAnalisis("Error de conexión al generar el análisis.");
    } finally {
      setAnalizando(false);
    }
  }

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

      <div className="rounded-xl border border-border-subtle bg-surface p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Caso estratégico</div>
          <div className="text-xs text-muted mt-0.5">
            {strategicCase
              ? "Analizado con IA — diagnóstico, DOFA, rentabilidad, escenarios y recomendación completos."
              : "Genera un análisis profundo: hechos vs. hipótesis, DOFA, rentabilidad, costo de oportunidad, personas y escenarios."}
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analizando}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50 shrink-0"
        >
          {analizando ? "Analizando…" : strategicCase ? "Regenerar análisis" : "Analizar con IA"}
        </button>
      </div>
      {errorAnalisis && <p className="text-xs text-accent-red">{errorAnalisis}</p>}

      {strategicCase ? (
        <StrategicCaseView strategicCase={strategicCase} />
      ) : (
        <>
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
        </>
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

function StrategicCaseView({ strategicCase: c }: { strategicCase: StrategicCase }) {
  const riesgoTone = { Alto: "red", Medio: "amber", Bajo: "green" } as const;

  return (
    <div className="space-y-6">
      <Section title="Resumen ejecutivo">
        <p className="text-sm leading-relaxed">{c.resumenEjecutivo}</p>
      </Section>

      <Section title="Punto de vista del sistema">
        <p className="text-sm leading-relaxed rounded-xl border border-accent-blue/40 bg-accent-blue/10 p-4">
          {c.puntoDeVista}
        </p>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Hechos verificados">
          {c.hechos.length === 0 && <Empty />}
          <ul className="space-y-2">
            {c.hechos.map((h, i) => (
              <li key={i} className="text-xs rounded-lg bg-surface p-2.5 border border-border-subtle">
                <div className="flex items-center gap-2 mb-1">
                  <EvidenceBadge level={h.nivel} />
                  <span className="text-muted">{h.fuente}</span>
                </div>
                {h.afirmacion}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Hipótesis / interpretación">
          {c.hipotesis.length === 0 && <Empty />}
          <ul className="space-y-2">
            {c.hipotesis.map((h, i) => (
              <li key={i} className="text-xs rounded-lg bg-surface p-2.5 border border-border-subtle">
                <div className="flex items-center gap-2 mb-1">
                  <EvidenceBadge level={h.nivel} />
                  <span className="text-muted">{h.fuente}</span>
                </div>
                {h.afirmacion}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {(c.vacios.length > 0 || c.contradicciones.length > 0) && (
        <Section title="Vacíos y contradicciones">
          <ul className="space-y-1.5 list-disc list-inside text-sm">
            {c.vacios.map((v, i) => (
              <li key={`v-${i}`}>{v}</li>
            ))}
            {c.contradicciones.map((v, i) => (
              <li key={`c-${i}`} className="text-accent-amber">
                {v}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Dónde ganas / dónde pierdes">
        <div className="space-y-2">
          {c.gananciasPerdidas.map((g, i) => (
            <div key={i} className="rounded-xl border border-border-subtle bg-surface p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">{g.dimension}</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-accent-green font-medium">Ganas: </span>
                  {g.ganancia}
                </div>
                <div>
                  <span className="text-accent-red font-medium">Pierdes: </span>
                  {g.perdida}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rentabilidad">
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
          <Pill tone="blue">{CONCLUSION_RENTABILIDAD_LABEL[c.rentabilidad.conclusion]}</Pill>
          <DetailRow label="Financiera" value={c.rentabilidad.financiera} />
          <DetailRow label="De tiempo" value={c.rentabilidad.tiempo} />
          <DetailRow label="Estratégica" value={c.rentabilidad.estrategica} />
          <DetailRow label="Personal" value={c.rentabilidad.personal} />
        </div>
      </Section>

      <Section title="Costo de oportunidad">
        <ul className="space-y-1.5 list-disc list-inside text-sm">
          {c.costoOportunidad.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </Section>

      <Section title="DOFA">
        <div className="grid grid-cols-2 gap-3">
          <DofaBox label="Fortalezas" tone="green" items={c.dofa.fortalezas} />
          <DofaBox label="Debilidades" tone="red" items={c.dofa.debilidades} />
          <DofaBox label="Oportunidades" tone="blue" items={c.dofa.oportunidades} />
          <DofaBox label="Amenazas" tone="amber" items={c.dofa.amenazas} />
        </div>
      </Section>

      {c.stakeholders.length > 0 && (
        <Section title="Personas, poder e incentivos">
          <div className="space-y-2">
            {c.stakeholders.map((s, i) => (
              <div key={i} className="rounded-xl border border-border-subtle bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.nombre}</span>
                  <Pill tone={riesgoTone[s.poder]}>Poder {s.poder}</Pill>
                </div>
                <p className="text-xs text-muted mt-1">Interés: {s.interes}</p>
                <p className="text-xs text-muted mt-0.5">Riesgo: {s.riesgo}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Viabilidad">
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
          <DetailRow label="Operativa" value={c.viabilidad.operativa} />
          <DetailRow label="Económica" value={c.viabilidad.economica} />
          <DetailRow label="Estratégica" value={c.viabilidad.estrategica} />
        </div>
      </Section>

      <Section title="Comparación de escenarios">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ESCENARIO_ORDEN.map((tipo) => {
            const ev = c.escenarios.find((e) => e.tipo === tipo);
            if (!ev) return null;
            return (
              <div key={tipo} className="rounded-xl border border-border-subtle bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{ESCENARIO_LABEL[tipo]}</span>
                  <Pill tone={riesgoTone[ev.riesgo]}>{ev.riesgo}</Pill>
                </div>
                <p className="text-xs mt-2">{ev.analisis}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] text-muted">
                  <span>Beneficio: {ev.beneficio}</span>
                  <span>Costo: {ev.costo}</span>
                  <span>Probabilidad: {ev.probabilidadExito}</span>
                  <span>Impacto $: {ev.impactoFinanciero}</span>
                </div>
                <p className="text-[11px] mt-2 italic text-muted">{ev.consecuenciaPrincipal}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Recomendación ejecutiva">
        <div className="rounded-xl border border-accent-blue/50 bg-accent-blue/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold">{c.recomendacion.decision}</p>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-accent-blue">{c.recomendacion.confianza}%</div>
              <div className="text-[10px] text-muted uppercase tracking-wide">Confianza</div>
            </div>
          </div>
          <p className="text-sm">{c.recomendacion.razonPrincipal}</p>
          <p className="text-xs text-muted">{c.recomendacion.confianzaExplicacion}</p>
          {c.recomendacion.condicionesMinimas.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Condiciones mínimas</div>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {c.recomendacion.condicionesMinimas.map((cond, i) => (
                  <li key={i}>{cond}</li>
                ))}
              </ul>
            </div>
          )}
          {c.recomendacion.limites.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Límites — qué no asumir</div>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {c.recomendacion.limites.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-accent-blue/20">
            <DetailRow label="Fecha de revisión" value={c.recomendacion.fechaRevision} />
            <DetailRow label="Señal de salida" value={c.recomendacion.senalSalida} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-muted mb-2">{title}</h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted">{label}: </span>
      {value}
    </div>
  );
}

function DofaBox({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "green" | "red" | "blue" | "amber";
  items: string[];
}) {
  const borderTone = {
    green: "border-accent-green/40",
    red: "border-accent-red/40",
    blue: "border-accent-blue/40",
    amber: "border-accent-amber/40",
  }[tone];
  return (
    <div className={`rounded-xl border ${borderTone} bg-surface p-3`}>
      <Pill tone={tone}>{label}</Pill>
      <ul className="text-xs mt-2 space-y-1 list-disc list-inside">
        {items.length === 0 ? <li className="text-muted list-none">Sin registros.</li> : items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted">Sin registros.</p>;
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

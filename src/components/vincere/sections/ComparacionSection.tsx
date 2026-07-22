"use client";

import { VincereProyecto } from "@/lib/vincere/types";
import { comparacionKey, useVincereStore } from "@/lib/vincere/store";
import { buildComparacionContext } from "@/lib/vincere/context";
import { fetchAsk, fetchInterpret } from "@/lib/vincere/ai-client";
import { formatFollowers, formatStreams, signed } from "@/lib/vincere/format";
import { genId } from "@/lib/id";
import { SectionHeader } from "../primitives";
import AIInsights from "../AIInsights";
import QuestionBox from "../QuestionBox";

export default function ComparacionSection({ a, b }: { a: VincereProyecto; b: VincereProyecto }) {
  const comparaciones = useVincereStore((s) => s.comparaciones);
  const setInsights = useVincereStore((s) => s.setComparacionInsights);
  const addQA = useVincereStore((s) => s.addComparacionQA);

  const key = comparacionKey(a.id, b.id);
  const comp = comparaciones[key] ?? { insights: [], qaLog: [] };
  const title = `Lectura comparativa — ${a.nombre} vs ${b.nombre}`;

  async function generate() {
    const result = await fetchInterpret(title, buildComparacionContext(a, b));
    setInsights(
      a.id,
      b.id,
      result.map((r) => ({ id: genId("ins"), texto: r.texto, nivel: r.nivel }))
    );
  }

  async function ask(pregunta: string) {
    const { respuesta, nivel } = await fetchAsk(title, buildComparacionContext(a, b), pregunta);
    addQA(a.id, b.id, { id: genId("qa"), pregunta, respuesta, nivel, creadoEn: new Date().toISOString() });
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Comparación"
        title={`${a.nombre} vs ${b.nombre}`}
        subtitle="Referencia de mercado cargada manualmente. La IA ajusta la lectura por macro-fase — no compara un proyecto emergente con uno consolidado como si fueran iguales."
      />

      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <ProjectCard proyecto={a} accent />
          <ProjectCard proyecto={b} />
        </div>

        <AIInsights
          title="Lectura comparativa VINCERE"
          insights={comp.insights}
          onGenerate={generate}
          emptyHint="Genera la lectura comparativa para leer la diferencia ajustada por macro-fase, no solo los números."
        />
        <QuestionBox log={comp.qaLog} onAsk={ask} placeholder="¿Contra quién estoy compitiendo de verdad?…" />
      </div>
    </div>
  );
}

function ProjectCard({ proyecto, accent = false }: { proyecto: VincereProyecto; accent?: boolean }) {
  const nivel = proyecto.tipo === "competencia" ? 2 : 4;
  const r = proyecto.resumen;
  return (
    <div className="vin-card p-6">
      <div
        className="mb-3.5 text-[11px] uppercase tracking-[0.1em]"
        style={{ color: accent ? "var(--vin-accent)" : "var(--vin-muted)" }}
      >
        {proyecto.nombre}
        {proyecto.tipo === "competencia" ? " (referencia)" : ""} · Nivel {nivel}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric value={formatStreams(r.streamsMes)} label={`Streams/mes · ${signed(r.streamsCambioPct)}`} />
        <Metric value={formatFollowers(r.seguidores)} label={`Seguidores · ${signed(r.seguidoresCambioPct)}`} />
        <Metric value={`${r.momentumIndex}/100`} label="Momentum Index" />
        <Metric value={<span className="text-[15px]">{proyecto.fase}</span>} label="Fase" />
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="vin-serif text-[26px] leading-none">{value}</div>
      <div className="vin-faint mt-1.5 text-xs">{label}</div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  VincereImpacto,
  VincereProyecto,
  VincereStressTest,
  VincereVariableTipo,
  VINCERE_VARIABLE_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchStressTest } from "@/lib/vincere/ai-client";
import { investigacionExterna } from "@/lib/vincere/context";
import { genId } from "@/lib/id";
import { SectionHeader, Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const TIPO_COLOR: Record<VincereVariableTipo, string> = {
  ganadora: "#5cc98e",
  perdedora: "#e0483a",
  incierta: "#e0a83a",
};

const IMPACTO_PESO: Record<VincereImpacto, number> = { alto: 0, medio: 1, bajo: 2 };

// El escenario probable es el que se lee primero; los extremos enmarcan.
const ESCENARIO_ACENTO: Record<string, string> = {
  Pierde: "#e0483a",
  "Break-even": "#a39c92",
  Probable: "#e0483a",
  Gana: "#5cc98e",
  Expansión: "#2dd4bf",
};

function leerArchivo(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve({ data: result.slice(result.indexOf(",") + 1), mediaType: file.type });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function StressTestSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addStressTest = useVincereStore((s) => s.addStressTest);
  const eliminar = useVincereStore((s) => s.eliminarStressTest);
  const showToast = useVincereStore((s) => s.showToast);

  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tests = proyecto.stressTests ?? [];
  const activo = tests.find((t) => t.id === abierto) ?? tests[0] ?? null;

  const contexto = {
    nombre: proyecto.nombre,
    genero: proyecto.genero,
    fase: proyecto.fase,
    momentum: proyecto.resumen,
    diagnostico: proyecto.diagnostico,
    catalogo: proyecto.canciones.map((c) => ({
      nombre: c.nombre,
      streams: c.streams,
      retencionPct: c.retencionPct,
      skipPct: c.skipPct,
    })),
    audiencia: proyecto.audiencia,
    zonasCalor: proyecto.zonasCalor,
    // Muchas propuestas de terceros son fechas o giras. Sin esto, el
    // stress-test evaluaba una oferta para una plaza sobre la que el propio
    // sistema ya se había pronunciado, y podía contradecirse consigo mismo.
    ...(proyecto.touringDiagnostico
      ? {
          loQueYaDijoTouring: {
            listoParaGira: proyecto.touringDiagnostico.listoParaGira,
            plazas: proyecto.touringDiagnostico.plazas.map((pl) => ({
              ciudad: pl.ciudad,
              veredicto: pl.veredicto,
              salaQueAguanta: pl.tamanoSala,
            })),
            trampas: proyecto.touringDiagnostico.trampas,
          },
        }
      : {}),
    ...(proyecto.arDiagnostico
      ? {
          loQueYaDijoAR: {
            primeroPerseguir: proyecto.arDiagnostico.primeroPerseguir,
            senalesDeAlerta: proyecto.arDiagnostico.senalesDeAlerta,
          },
        }
      : {}),
    kpis: proyecto.kpis,
    decisionesAbiertas: proyecto.decisiones.filter((d) => d.estado === "Pendiente").map((d) => d.texto),
    historial: (proyecto.historial ?? []).slice(-6),
    // Si ya se investigó al tercero que propone el plan o la plaza donde se
    // quiere tocar, esa evidencia externa entra a la evaluación.
    investigacionExterna: investigacionExterna(proyecto, "todo", 3),
  };

  async function evaluar() {
    if (cargando || (!archivo && !texto.trim())) return;
    setCargando(true);
    setError(null);
    try {
      const payload: Parameters<typeof fetchStressTest>[0] = { artista: contexto, texto, nota };
      if (archivo) {
        const { data, mediaType } = await leerArchivo(archivo);
        payload.data = data;
        payload.mediaType = mediaType;
      }
      const r = await fetchStressTest(payload);
      const conId: VincereStressTest = { ...r, id: genId("stress") };
      addStressTest(proyecto.id, conId);
      setAbierto(conId.id);
      setTexto("");
      setNota("");
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      showToast(`Plan evaluado: ${conId.titulo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo evaluar el plan");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Plan Stress-Test"
        title="Someter un plan a prueba"
        subtitle={`Pega el plan que te propusieron y el sistema lo evalúa contra la realidad de ${proyecto.nombre}: qué lo hace funcionar, qué lo rompe, los cinco escenarios y qué exigir antes de aceptar.`}
      />

      <div className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setArchivo(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-sm p-6 text-center transition-colors"
          style={{
            border: `1px dashed ${arrastrando ? "var(--vin-accent)" : "var(--vin-border-strong)"}`,
            background: arrastrando ? "rgba(224,72,58,0.06)" : "var(--vin-surface)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          {archivo ? (
            <p className="text-sm">{archivo.name}</p>
          ) : (
            <p className="vin-muted text-sm">Suelta aquí el PDF o la captura del plan, o haz clic para elegirlo</p>
          )}
        </div>

        <Panel>
          <PanelLabel>O pega el plan</PanelLabel>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder="Pega aquí la propuesta: qué ofrecen, qué piden, plazos, cifras, condiciones…"
            className="vin-input mb-3"
            style={{ resize: "vertical", lineHeight: "1.6" }}
          />
          <PanelLabel>Qué quieres saber (opcional)</PanelLabel>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. «me preocupa el anticipo», «¿vale la pena por la exposición?»"
            className="vin-input"
          />
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={evaluar} disabled={cargando || (!archivo && !texto.trim())} className="vin-btn-primary">
            {cargando ? "Sometiendo el plan a prueba…" : "Evaluar plan"}
          </button>
          {cargando && (
            <span className="vin-faint text-xs">
              Cruzando el plan con fase, catálogo, audiencia y KPIs — tarda más que una lectura de sección.
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}

        {tests.length === 0 && !cargando && (
          <Panel>
            <p className="vin-muted text-sm">
              Sin planes evaluados todavía. Sirve para cualquier propuesta que te llegue: un contrato de sello, una
              oferta de booking, un plan de lanzamiento de un manager, una gira que te proponen.
            </p>
          </Panel>
        )}

        {tests.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {tests.map((t) => (
              <button
                key={t.id}
                onClick={() => setAbierto(t.id)}
                className="rounded-sm px-2.5 py-1 text-[11.5px] transition-colors"
                style={{
                  background: activo?.id === t.id ? "rgba(224,72,58,0.14)" : "transparent",
                  color: activo?.id === t.id ? "var(--vin-text)" : "var(--vin-muted)",
                  border: `1px solid ${activo?.id === t.id ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
                }}
              >
                {t.titulo}
              </button>
            ))}
          </div>
        )}

        {activo && (
          <ResultadoStressTest
            test={activo}
            onEliminar={() => {
              eliminar(proyecto.id, activo.id);
              setAbierto(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResultadoStressTest({ test, onEliminar }: { test: VincereStressTest; onEliminar: () => void }) {
  const variables = [...test.variables].sort((a, b) => IMPACTO_PESO[a.impacto] - IMPACTO_PESO[b.impacto]);

  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="vin-eyebrow mb-2">Stress-Test · {test.fuente}</div>
            <h2 className="vin-serif text-2xl leading-snug">{test.titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={test.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 text-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed">{test.resumenPlan}</p>
        <p className="vin-faint mt-2.5 text-xs">
          Evaluado el{" "}
          {new Date(test.creadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div
        className="rounded-sm p-5"
        style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>Veredicto</span>
        </PanelLabel>
        <p className="text-[15px] leading-relaxed">{test.veredicto}</p>
      </div>

      {test.supuestos.length > 0 && (
        <Panel>
          <PanelLabel>Lo que el plan da por hecho sin decirlo</PanelLabel>
          <p className="vin-faint mb-3 text-xs leading-relaxed">
            Los planes rara vez se caen por lo que declaran. Se caen por esto.
          </p>
          <ul className="space-y-2">
            {test.supuestos.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span style={{ color: "var(--vin-accent)" }}>—</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {variables.length > 0 && (
        <section>
          <PanelLabel>Variables que deciden el resultado</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {variables.map((v, i) => (
              <div key={i} className="vin-card border-l-2 p-4" style={{ borderLeftColor: TIPO_COLOR[v.tipo] }}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-medium">{v.variable}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: TIPO_COLOR[v.tipo], borderColor: `${TIPO_COLOR[v.tipo]}66` }}
                  >
                    {VINCERE_VARIABLE_LABEL[v.tipo]}
                  </span>
                  <span className="vin-faint text-[10px] uppercase tracking-wide">impacto {v.impacto}</span>
                  <EvidenceTag nivel={v.nivel} />
                </div>
                <p className="vin-muted text-[13.5px] leading-relaxed">{v.lectura}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <PanelLabel>Los cinco escenarios</PanelLabel>
        <div className="mt-3 space-y-2.5">
          {test.escenarios.map((e) => (
            <div key={e.nombre} className="vin-card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <span
                  className="rounded-sm px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    color: ESCENARIO_ACENTO[e.nombre] ?? "var(--vin-muted)",
                    border: `1px solid ${ESCENARIO_ACENTO[e.nombre] ?? "var(--vin-border-strong)"}66`,
                  }}
                >
                  {e.nombre}
                </span>
                <EvidenceTag nivel={e.nivel} />
              </div>
              <p className="mb-2 text-[14px] leading-relaxed">{e.queOcurre}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <p className="vin-muted text-[13px] leading-relaxed">
                  <span className="vin-faint">En la carrera: </span>
                  {e.quePasaSiSeDa}
                </p>
                <p className="vin-muted text-[13px] leading-relaxed">
                  <span className="vin-faint">Qué tan plausible: </span>
                  {e.probabilidad}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {test.puntoDeQuiebre && (
          <div
            className="rounded-sm p-5"
            style={{ background: "rgba(224,72,58,0.06)", border: "1px solid rgba(224,72,58,0.25)" }}
          >
            <PanelLabel>
              <span style={{ color: "var(--vin-accent)" }}>Punto de quiebre</span>
            </PanelLabel>
            <p className="text-[14px] leading-relaxed">{test.puntoDeQuiebre}</p>
          </div>
        )}

        {test.condiciones.length > 0 && (
          <Panel>
            <PanelLabel>Qué exigir antes de aceptar</PanelLabel>
            <ul className="space-y-2">
              {test.condiciones.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span className="vin-faint tabular-nums">{i + 1}.</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

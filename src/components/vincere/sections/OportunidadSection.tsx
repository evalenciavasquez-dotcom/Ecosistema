"use client";

import { useState } from "react";
import {
  VincereOportunidad,
  VincereProyecto,
  VincereViaDeEntrada,
  VINCERE_MODALIDAD_LABEL,
  VINCERE_SEMAFORO_COLOR,
  VINCERE_SEMAFORO_LABEL,
  semaforoDe,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchOportunidad } from "@/lib/vincere/ai-client";
import { buildOportunidadContext } from "@/lib/vincere/context";
import SectionShell from "../SectionShell";
import VinculoPanel from "../VinculoPanel";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

export default function OportunidadSection({ proyecto }: { proyecto: VincereProyecto }) {
  const setOportunidad = useVincereStore((s) => s.setOportunidad);
  const showToast = useVincereStore((s) => s.showToast);
  const proyectos = useVincereStore((s) => s.proyectos);

  // Solo cuenta lo acordado: sumar lo que todavía se está pensando inflaría la
  // carga y haría rechazar casos que sí entran.
  const cargaSemanalTotal = proyectos
    .filter((x) => x.vinculo?.confirmado && x.vinculo.horasSemanales)
    .reduce((t, x) => t + (x.vinculo?.horasSemanales ?? 0), 0);

  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const op = proyecto.oportunidad;

  async function analizar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchOportunidad({
        artista: buildOportunidadContext(proyecto, cargaSemanalTotal),
        nota,
      });
      setOportunidad(proyecto.id, r);
      setNota("");
      showToast(`Oportunidad evaluada: ${r.puntaje}/100`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo evaluar la oportunidad");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="oportunidad"
      eyebrow="Oportunidad de Negocio"
      title="¿Conviene sumarnos, y cómo?"
      subtitle="La pregunta anterior a todas las demás. Los otros motores dirigen a alguien que ya está adentro; este decide si entra, con qué estructura y a cambio de qué."
      aiTitle="Lectura VINCERE — Oportunidad"
    >
      <VinculoPanel proyecto={proyecto} />

      <Panel>
        <PanelLabel>Evaluar la oportunidad</PanelLabel>
        <p className="vin-faint mb-3 text-xs leading-relaxed">
          Cruza todo lo que el sistema sabe de este artista —momentum, marca, catálogo, audiencia, shows, KPIs y las
          lecturas que ya emitieron los otros motores— y devuelve un puntaje con su estructura de entrada.
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Contexto tuyo: «me lo presentó su manager», «tengo poco tiempo este trimestre» (opcional)"
          className="vin-input mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={analizar} disabled={cargando} className="vin-btn-primary">
            {cargando ? "Evaluando la oportunidad…" : op ? "Volver a evaluar" : "Evaluar oportunidad"}
          </button>
          {cargando && (
            <span className="vin-faint text-xs">
              Es el análisis más exigente del sistema: puntúa, estructura las vías y proyecta escenarios.
            </span>
          )}
        </div>
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {op && <AnalisisOportunidad op={op} onEliminar={() => setOportunidad(proyecto.id, null)} />}
    </SectionShell>
  );
}

function AnalisisOportunidad({ op, onEliminar }: { op: VincereOportunidad; onEliminar: () => void }) {
  const semaforo = semaforoDe(op.puntaje);
  const color = VINCERE_SEMAFORO_COLOR[semaforo];

  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* El puntaje es lo primero que se lee: grande y con su color. */}
            <div
              className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full"
              style={{ border: `2px solid ${color}`, background: `${color}12` }}
            >
              <span className="vin-serif text-4xl leading-none tabular-nums" style={{ color }}>
                {op.puntaje}
              </span>
              <span className="vin-faint mt-0.5 text-[10px]">de 100</span>
            </div>
            <div className="min-w-0">
              <div className="vin-eyebrow mb-2">Oportunidad de negocio</div>
              <div
                className="mb-2 inline-block rounded-sm px-2.5 py-1 text-[13px] font-medium"
                style={{ color, border: `1px solid ${color}66`, background: `${color}14` }}
              >
                {VINCERE_SEMAFORO_LABEL[semaforo]}
              </div>
              <EscalaPuntaje puntaje={op.puntaje} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={op.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 text-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed">{op.porQueEsePuntaje}</p>
        <p className="vin-faint mt-2.5 text-xs">
          Generado el{" "}
          {new Date(op.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {op.loQueLoSube.length > 0 && (
          <div
            className="rounded-sm p-5"
            style={{ background: "rgba(92,201,142,0.06)", border: "1px solid rgba(92,201,142,0.25)" }}
          >
            <PanelLabel>
              <span style={{ color: "#5cc98e" }}>Lo que lo sube</span>
            </PanelLabel>
            <ul className="space-y-2">
              {op.loQueLoSube.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span style={{ color: "#5cc98e" }}>↑</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {op.loQueLoBaja.length > 0 && (
          <div
            className="rounded-sm p-5"
            style={{ background: "rgba(224,72,58,0.06)", border: "1px solid rgba(224,72,58,0.25)" }}
          >
            <PanelLabel>
              <span style={{ color: "var(--vin-accent)" }}>Lo que lo baja</span>
            </PanelLabel>
            <ul className="space-y-2">
              {op.loQueLoBaja.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span style={{ color: "var(--vin-accent)" }}>↓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {op.viaRecomendada && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "var(--vin-accent)" }}>Cómo entrar</span>
          </PanelLabel>
          <p className="text-[15px] leading-relaxed">{op.viaRecomendada}</p>
        </div>
      )}

      {op.vias.length > 0 && (
        <section>
          <PanelLabel>Vías de entrada</PanelLabel>
          <p className="vin-faint mb-3 text-xs leading-relaxed">
            Cada una con su economía y su puerta de salida. Un trato donde solo una parte se compromete no es un trato.
          </p>
          <div className="space-y-3">
            {op.vias.map((v, i) => (
              <Via key={i} via={v} />
            ))}
          </div>
        </section>
      )}

      {op.escenarios.length > 0 && (
        <section>
          <PanelLabel>Escenarios</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {op.escenarios.map((e, i) => (
              <div key={i} className="vin-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2.5">
                  <span className="text-[14.5px] font-medium">{e.nombre}</span>
                  <EvidenceTag nivel={e.nivel} />
                </div>
                <p className="mb-2 text-[14px] leading-relaxed">{e.queOcurre}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="vin-muted text-[13px] leading-relaxed">
                    <span className="vin-faint">De nuestro lado: </span>
                    {e.queSignificaParaNosotros}
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
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {op.porQueNosotros && (
          <Panel>
            <PanelLabel>Por qué nosotros</PanelLabel>
            <p className="vin-faint mb-2 text-[11.5px] leading-relaxed">
              El artista también nos elige. Sin esto el análisis mira una sola cara de la mesa.
            </p>
            <p className="text-[14px] leading-relaxed">{op.porQueNosotros}</p>
          </Panel>
        )}
        {op.costoDeOportunidad && (
          <Panel>
            <PanelLabel>Costo de oportunidad</PanelLabel>
            <p className="vin-faint mb-2 text-[11.5px] leading-relaxed">
              Qué dejamos de hacer si tomamos esto. El cuello de botella es el tiempo, no las ganas.
            </p>
            <p className="text-[14px] leading-relaxed">{op.costoDeOportunidad}</p>
          </Panel>
        )}
      </div>

      {op.serviciosQueOfrecemos.length > 0 && (
        <Panel>
          <PanelLabel>Qué le podemos ofrecer</PanelLabel>
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            Sale de lo que su data muestra que necesita, no de un catálogo genérico.
          </p>
          <ul className="space-y-2">
            {op.serviciosQueOfrecemos.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span className="vin-faint">—</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {op.senalesDeAlerta.length > 0 && (
          <div
            className="rounded-sm p-5"
            style={{ background: "rgba(224,72,58,0.06)", border: "1px solid rgba(224,72,58,0.25)" }}
          >
            <PanelLabel>
              <span style={{ color: "var(--vin-accent)" }}>Señales de alerta</span>
            </PanelLabel>
            <ul className="space-y-2">
              {op.senalesDeAlerta.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span style={{ color: "var(--vin-accent)" }}>—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {op.queFaltaSaber.length > 0 && (
          <Panel>
            <PanelLabel>Qué averiguar antes de comprometerse</PanelLabel>
            <ul className="space-y-2">
              {op.queFaltaSaber.map((q, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <span className="vin-faint tabular-nums">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="rounded-sm p-5" style={{ background: `${color}12`, border: `1px solid ${color}47` }}>
        <PanelLabel>
          <span style={{ color }}>Veredicto</span>
        </PanelLabel>
        <p className="text-[15px] leading-relaxed">{op.veredicto}</p>
      </div>

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

// Regla de 0 a 100 con la marca donde cayó. Sitúa el número: un 60 solo no
// dice nada; un 60 con el 40 y el 70 marcados sí.
function EscalaPuntaje({ puntaje }: { puntaje: number }) {
  return (
    <div className="w-full max-w-[280px]">
      <div className="relative h-1.5 overflow-hidden rounded-full" style={{ background: "var(--vin-surface-2)" }}>
        <div className="absolute inset-y-0 left-0 w-[40%]" style={{ background: "rgba(224,72,58,0.45)" }} />
        <div className="absolute inset-y-0 left-[40%] w-[30%]" style={{ background: "rgba(224,168,58,0.45)" }} />
        <div className="absolute inset-y-0 left-[70%] right-0" style={{ background: "rgba(92,201,142,0.45)" }} />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2"
          style={{ left: `${puntaje}%`, background: "var(--vin-text)" }}
        />
      </div>
      <div className="vin-faint mt-1 flex justify-between text-[9.5px] tabular-nums">
        <span>0 · no</span>
        <span>40</span>
        <span>70</span>
        <span>100 · ya</span>
      </div>
    </div>
  );
}

function Via({ via }: { via: VincereViaDeEntrada }) {
  return (
    <div className="vin-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="vin-serif text-lg">{VINCERE_MODALIDAD_LABEL[via.modalidad]}</span>
          <EvidenceTag nivel={via.nivel} />
        </div>
        <span
          className="rounded-sm px-2.5 py-1 text-[12.5px] font-medium tabular-nums"
          style={{ color: "var(--vin-accent)", border: "1px solid rgba(224,72,58,0.35)" }}
        >
          {via.participacion}
        </span>
      </div>

      <p className="mb-3 text-[14px] leading-relaxed">{via.comoFunciona}</p>

      <div className="mb-3 grid gap-2.5 md:grid-cols-2">
        <div className="rounded-sm p-3" style={{ background: "var(--vin-surface)" }}>
          <div className="vin-faint mb-1 text-[10.5px] uppercase tracking-[0.08em]">Qué aportamos</div>
          <p className="text-[13px] leading-relaxed">{via.queAportamos}</p>
        </div>
        <div className="rounded-sm p-3" style={{ background: "var(--vin-surface)" }}>
          <div className="vin-faint mb-1 text-[10.5px] uppercase tracking-[0.08em]">Qué esperamos recuperar</div>
          <p className="text-[13px] leading-relaxed">{via.queEsperamosRecuperar}</p>
        </div>
      </div>

      <div className="mb-3 grid gap-2.5 md:grid-cols-2">
        <ListaCompromisos titulo="Nos comprometemos a" items={via.compromisosNuestros} />
        <ListaCompromisos titulo="El artista se compromete a" items={via.compromisosDelArtista} />
      </div>

      <div className="grid gap-2.5 md:grid-cols-2">
        <div
          className="rounded-sm p-3"
          style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.25)" }}
        >
          <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: "#2dd4bf" }}>
            Cómo se revisa o se sale
          </div>
          <p className="text-[13px] leading-relaxed">{via.clausulaDeRevision}</p>
        </div>
        <div
          className="rounded-sm p-3"
          style={{ background: "rgba(224,72,58,0.06)", border: "1px solid rgba(224,72,58,0.22)" }}
        >
          <div className="mb-1 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: "var(--vin-accent)" }}>
            Riesgo de esta vía
          </div>
          <p className="text-[13px] leading-relaxed">{via.riesgo}</p>
        </div>
      </div>
    </div>
  );
}

function ListaCompromisos({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">{titulo}</div>
      <ul className="space-y-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
            <span className="vin-faint">·</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

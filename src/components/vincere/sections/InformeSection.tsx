"use client";

import { useState } from "react";
import { VincereInforme, VincereProyecto, VincerePrioridadPaso } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { buildInformeContext } from "@/lib/vincere/context";
import { fetchInforme, registerNotion } from "@/lib/vincere/ai-client";
import { downloadMarkdown, informeToMarkdown } from "@/lib/vincere/informe-export";
import { SectionHeader, Panel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const PRIORIDAD_COLOR: Record<VincerePrioridadPaso, string> = {
  Alta: "#e0483a",
  Media: "#e0a83a",
  Baja: "#a39c92",
};

export default function InformeSection({ proyecto }: { proyecto: VincereProyecto }) {
  const setInforme = useVincereStore((s) => s.setInforme);
  const showToast = useVincereStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const informe = proyecto.informe ?? null;

  async function generar() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInforme(buildInformeContext(proyecto));
      setInforme(proyecto.id, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir el informe");
    } finally {
      setLoading(false);
    }
  }

  async function archivar() {
    if (!informe || registering) return;
    setRegistering(true);
    const result = await registerNotion({
      proyecto: proyecto.nombre,
      seccion: "Informe Final",
      titulo: informe.titulo,
      detalle: informeToMarkdown(informe, proyecto),
    });
    setRegistering(false);
    if (result.status === "ok") showToast("Informe archivado en Notion");
    else if (result.status === "not_configured") showToast("Notion no está configurado — configúralo para archivar el histórico");
    else showToast(`No se pudo archivar: ${result.error}`);
  }

  return (
    <div>
      <div className="vin-no-print">
        <SectionHeader
          eyebrow="Informe Final"
          title="El entregable"
          subtitle="La lectura consolidada del proyecto: cruza todos los motores en un solo documento con postura, riesgos y próximos pasos. Es lo que se presenta y se archiva."
        />
      </div>

      <div className="vin-no-print mb-5 flex flex-wrap items-center gap-3">
        <button onClick={generar} disabled={loading} className="vin-btn-primary">
          {loading ? "Emitiendo informe…" : informe ? "Volver a emitir" : "Emitir informe final"}
        </button>
        {informe && (
          <>
            <button onClick={() => downloadMarkdown(informe, proyecto)} className="vin-btn-ghost">
              Descargar
            </button>
            <button onClick={() => window.print()} className="vin-btn-ghost">
              Imprimir / PDF
            </button>
            <button onClick={archivar} disabled={registering} className="vin-btn-ghost">
              {registering ? "Archivando…" : "Archivar en Notion"}
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="vin-no-print mb-4 text-xs" style={{ color: "var(--vin-accent)" }}>
          {error}
        </p>
      )}

      {loading && !informe && (
        <Panel>
          <p className="vin-muted text-sm">
            Cruzando momentum, catálogo, audiencia, zonas, decisiones y KPIs… El informe tarda más que una lectura de
            sección porque razona sobre todo el proyecto junto.
          </p>
        </Panel>
      )}

      {!informe && !loading && (
        <Panel>
          <p className="vin-muted text-sm">
            Todavía no se ha emitido un informe para {proyecto.nombre}. Cuanta más data y más lecturas VINCERE tengas
            generadas en las secciones, más sólido sale — el informe las integra y las lleva más lejos.
          </p>
        </Panel>
      )}

      {informe && <InformeDocumento informe={informe} proyecto={proyecto} />}
    </div>
  );
}

function InformeDocumento({ informe, proyecto }: { informe: VincereInforme; proyecto: VincereProyecto }) {
  const fecha = new Date(informe.generadoEn).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="vin-print-area vin-card p-6 md:p-10">
      <header className="mb-8 border-b pb-6" style={{ borderColor: "var(--vin-border)" }}>
        <div className="vin-eyebrow mb-2.5">Informe de dirección · VINCERE</div>
        <h2 className="vin-serif mb-3 text-2xl font-medium leading-snug md:text-[32px]">{informe.titulo}</h2>
        <div className="vin-muted flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          <span style={{ color: "var(--vin-text)" }}>{proyecto.nombre}</span>
          <span>·</span>
          <span>{proyecto.genero}</span>
          <span>·</span>
          <span>Fase: {proyecto.fase}</span>
          <span>·</span>
          <span>{fecha}</span>
          <EvidenceTag nivel={informe.nivelGlobal} />
        </div>
      </header>

      <section className="mb-8">
        <h3 className="vin-serif mb-3 text-xl">Sinopsis Central</h3>
        <p className="text-[15px] leading-[1.75]">{informe.sinopsis}</p>
      </section>

      {informe.veredicto && (
        <section
          className="mb-8 rounded-sm p-5"
          style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
        >
          <div className="vin-label mb-2" style={{ color: "var(--vin-accent)" }}>
            Veredicto
          </div>
          <p className="text-[15px] leading-relaxed">{informe.veredicto}</p>
        </section>
      )}

      {informe.bloques.map((bloque, i) => (
        <section key={i} className="mb-7">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <h3 className="vin-serif text-lg">
              {i + 1}. {bloque.titulo}
            </h3>
            <EvidenceTag nivel={bloque.nivel} />
          </div>
          {bloque.parrafos.map((p, j) => (
            <p key={j} className="mb-2.5 text-[15px] leading-[1.7]">
              {p}
            </p>
          ))}
        </section>
      ))}

      {(informe.riesgos.length > 0 || informe.oportunidades.length > 0) && (
        <div className="mb-8 grid gap-5 md:grid-cols-2">
          {informe.riesgos.length > 0 && (
            <section>
              <h3 className="vin-serif mb-3 text-lg">Riesgos</h3>
              <ul className="space-y-3.5">
                {informe.riesgos.map((r, i) => (
                  <li key={i} className="border-l-2 pl-3.5" style={{ borderColor: "var(--vin-accent)" }}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.riesgo}</span>
                      <EvidenceTag nivel={r.nivel} />
                    </div>
                    <p className="vin-muted text-[13.5px] leading-relaxed">{r.consecuencia}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {informe.oportunidades.length > 0 && (
            <section>
              <h3 className="vin-serif mb-3 text-lg">Oportunidades</h3>
              <ul className="space-y-3.5">
                {informe.oportunidades.map((o, i) => (
                  <li key={i} className="border-l-2 pl-3.5" style={{ borderColor: "#5cc98e" }}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{o.oportunidad}</span>
                      <EvidenceTag nivel={o.nivel} />
                    </div>
                    <p className="vin-muted text-[13.5px] leading-relaxed">{o.porQue}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {informe.proximosPasos.length > 0 && (
        <section className="border-t pt-6" style={{ borderColor: "var(--vin-border)" }}>
          <h3 className="vin-serif mb-4 text-lg">Próximos Pasos</h3>
          <ul className="space-y-3">
            {informe.proximosPasos.map((p, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3"
                style={{ borderColor: "var(--vin-border)" }}
              >
                <span className="flex-1 text-sm leading-relaxed" style={{ minWidth: "min(100%, 18rem)" }}>
                  {p.accion}
                </span>
                <span className="vin-muted flex items-center gap-2 text-xs">
                  <span>{p.responsable}</span>
                  <span>·</span>
                  <span>{p.plazo}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    style={{ color: PRIORIDAD_COLOR[p.prioridad], borderColor: `${PRIORIDAD_COLOR[p.prioridad]}66` }}
                  >
                    {p.prioridad}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="vin-faint mt-8 border-t pt-4 text-[11px] leading-relaxed" style={{ borderColor: "var(--vin-border)" }}>
        Emitido por VINCERE Intelligence Platform · Cada afirmación lleva nivel de evidencia 1-4 (4 alta evidencia · 3
        evidencia sólida · 2 evidencia parcial · 1 especulativo).
      </footer>
    </article>
  );
}

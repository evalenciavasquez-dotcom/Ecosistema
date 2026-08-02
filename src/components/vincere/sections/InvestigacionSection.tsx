"use client";

import { useState } from "react";
import {
  VincereInvestigacion,
  VincereInvestigacionTipo,
  VincereProyecto,
  VINCERE_INVESTIGACION_LABEL,
  VINCERE_INVESTIGACION_PLACEHOLDER,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchResearch } from "@/lib/vincere/ai-client";
import { genId } from "@/lib/id";
import { SectionHeader, Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const TIPOS: VincereInvestigacionTipo[] = ["artista", "cancion", "mercado", "libre"];

// El dominio dice más de la solidez de una fuente que su título: se muestra.
function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function InvestigacionSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addInvestigacion = useVincereStore((s) => s.addInvestigacion);
  const eliminar = useVincereStore((s) => s.eliminarInvestigacion);
  const aplicarSenales = useVincereStore((s) => s.aplicarSenalesPlaza);
  const addAlertas = useVincereStore((s) => s.addAlertas);
  const showToast = useVincereStore((s) => s.showToast);

  // La consulta vive en el store: así puede llegar escrita desde el panel de
  // una canción (los similares que detectó un análisis externo) sin efectos de
  // sincronía, y sobrevive si navegas a otro motor y vuelves.
  const consulta = useVincereStore((s) => s.investigacionConsulta);
  const setConsulta = useVincereStore((s) => s.setInvestigacionConsulta);

  const [tipo, setTipo] = useState<VincereInvestigacionTipo>("artista");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  const investigaciones = proyecto.investigaciones ?? [];
  const activa = investigaciones.find((i) => i.id === abierta) ?? investigaciones[0] ?? null;

  // Contexto propio: lo encontrado afuera solo vale medido contra esto.
  const contexto = {
    nombre: proyecto.nombre,
    genero: proyecto.genero,
    fase: proyecto.fase,
    tipo: proyecto.tipo,
    momentum: proyecto.resumen,
    diagnostico: proyecto.diagnostico,
    catalogo: proyecto.canciones.map((c) => ({ nombre: c.nombre, streams: c.streams })),
    audiencia: proyecto.audiencia,
    zonasCalor: proyecto.zonasCalor,
  };

  async function investigar() {
    if (cargando || consulta.trim().length < 3) return;
    setCargando(true);
    setError(null);
    try {
      const { investigacion, alertas } = await fetchResearch({
        tipo,
        consulta: consulta.trim(),
        artista: contexto,
      });
      const conId: VincereInvestigacion = { ...investigacion, id: genId("inv") };
      addInvestigacion(proyecto.id, conId);
      if (alertas.length) {
        addAlertas(
          proyecto.id,
          alertas.map((a) => ({ ...a, origen: `Investigación · ${conId.titulo}` }))
        );
      }
      setAbierta(conId.id);
      setConsulta("");
      showToast(
        investigacion.sinFuentes
          ? "Investigación hecha, pero la web no devolvió fuentes"
          : `Investigación lista · ${investigacion.fuentes.length} fuentes`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la investigación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Investigación"
        title="Buscar afuera"
        subtitle={`El único motor que no depende de la data que tú cargas. Busca en la web artistas, canciones, plazas o preguntas de industria, y devuelve los hallazgos con su fuente para cruzarlos con ${proyecto.nombre}.`}
      />

      <div className="space-y-5">
        <Panel>
          <PanelLabel>Qué tipo de búsqueda</PanelLabel>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className="rounded-xl px-3 py-1.5 vin-t-sm transition-colors"
                style={{
                  background: tipo === t ? "rgba(224,72,58,0.14)" : "transparent",
                  color: tipo === t ? "var(--vin-text)" : "var(--vin-muted)",
                  border: `1px solid ${tipo === t ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
                }}
              >
                {VINCERE_INVESTIGACION_LABEL[t]}
              </button>
            ))}
          </div>

          <PanelLabel>Qué quieres saber</PanelLabel>
          {/* Área de texto y no un campo de una línea: una consulta que llega
              desde el panel de una canción trae contexto y se cortaría. */}
          <textarea
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                investigar();
              }
            }}
            rows={consulta.length > 90 ? 3 : 2}
            placeholder={VINCERE_INVESTIGACION_PLACEHOLDER[tipo]}
            className="vin-input"
            style={{ resize: "vertical", lineHeight: "1.6" }}
          />
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={investigar} disabled={cargando || consulta.trim().length < 3} className="vin-btn-primary">
            {cargando ? "Buscando en la web…" : "Investigar"}
          </button>
          {cargando && (
            <span className="vin-faint vin-t-xs">
              Buscando, cruzando fuentes y midiéndolo contra {proyecto.nombre} — tarda más que una lectura de sección.
            </span>
          )}
        </div>

        {error && (
          <p className="vin-t-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}

        {investigaciones.length === 0 && !cargando && (
          <Panel>
            <p className="vin-muted vin-t-sm leading-relaxed">
              Sin investigaciones todavía. Esto reemplaza lo que buscarías a mano antes de una decisión: quién es
              realmente el artista con el que te proponen un feature, si el título que quieres usar ya está saturado,
              qué escena hay de verdad en la ciudad donde te ofrecen tocar.
            </p>
            <p className="vin-faint mt-3 vin-t-xs leading-relaxed">
              Cada hallazgo llega con la fuente de donde salió. Lo que no tiene fuente se marca como criterio, no como
              evidencia — y nunca pasa de nivel 2.
            </p>
          </Panel>
        )}

        {investigaciones.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {investigaciones.map((i) => (
              <button
                key={i.id}
                onClick={() => setAbierta(i.id)}
                className="rounded-xl px-2.5 py-1 vin-t-sm transition-colors"
                style={{
                  background: activa?.id === i.id ? "rgba(224,72,58,0.14)" : "transparent",
                  color: activa?.id === i.id ? "var(--vin-text)" : "var(--vin-muted)",
                  border: `1px solid ${activa?.id === i.id ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
                }}
              >
                {i.titulo}
              </button>
            ))}
          </div>
        )}

        {activa && (
          <ResultadoInvestigacion
            investigacion={activa}
            onEliminar={() => {
              eliminar(proyecto.id, activa.id);
              setAbierta(null);
            }}
            onAplicarCalor={() => {
              aplicarSenales(proyecto.id, activa.id, activa.senalesPlaza);
              showToast(`${activa.senalesPlaza.length} plazas llevadas a Zonas de Calor`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResultadoInvestigacion({
  investigacion,
  onEliminar,
  onAplicarCalor,
}: {
  investigacion: VincereInvestigacion;
  onEliminar: () => void;
  onAplicarCalor: () => void;
}) {
  const inv = investigacion;

  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="vin-eyebrow mb-2">
              Investigación · {VINCERE_INVESTIGACION_LABEL[inv.tipo]}
            </div>
            <h2 className="vin-serif vin-t-xl leading-snug">{inv.titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={inv.nivelGlobal} />
            <button
              onClick={onEliminar}
              className="vin-faint vin-no-print px-1 vin-t-xs hover:underline"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        </div>
        <p className="vin-t-base leading-relaxed">{inv.resumen}</p>
        <p className="vin-faint mt-2.5 vin-t-xs">
          «{inv.consulta}» · {new Date(inv.creadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
          {inv.fuentes.length > 0 && ` · ${inv.fuentes.length} fuentes`}
        </p>
      </div>

      {inv.sinFuentes && (
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(224,168,58,0.08)", border: "1px solid rgba(224,168,58,0.3)" }}
        >
          <p className="vin-t-base leading-relaxed">
            La búsqueda no devolvió fuentes utilizables sobre esto. Lo que sigue es criterio del sistema, no evidencia
            verificada — por eso nada supera el nivel 2. Prueba con un nombre más exacto o una pregunta más concreta.
          </p>
        </div>
      )}

      {inv.hallazgos.length > 0 && (
        <section>
          <PanelLabel>Qué se encontró</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {inv.hallazgos.map((h, i) => (
              <div key={i} className="vin-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <EvidenceTag nivel={h.nivel} />
                  {h.fuentes.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {h.fuentes.map((n) => {
                        const f = inv.fuentes[n - 1];
                        if (!f) return null;
                        return (
                          <a
                            key={n}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={f.titulo}
                            className="rounded-full px-1.5 py-0.5 vin-t-xs tabular-nums transition-colors hover:underline"
                            style={{ color: "var(--vin-muted)", border: "1px solid var(--vin-border-strong)" }}
                          >
                            {n}
                          </a>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="vin-faint vin-t-xs uppercase tracking-wide">sin fuente · criterio</span>
                  )}
                </div>
                <p className="mb-2 vin-t-base leading-relaxed">{h.texto}</p>
                <p className="vin-muted vin-t-base leading-relaxed">
                  <span className="vin-faint">Para nosotros: </span>
                  {h.implicacion}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {inv.senalesPlaza.length > 0 && (
        <Panel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <PanelLabel>Plazas que aparecieron</PanelLabel>
            <button
              onClick={onAplicarCalor}
              className="vin-btn-ghost vin-no-print"
              style={{ padding: "5px 11px", fontSize: "12px" }}
            >
              {inv.aplicadaEnCalor ? "Volver a aplicar a Zonas de Calor" : "Llevar a Zonas de Calor"}
            </button>
          </div>
          <p className="vin-faint mb-3.5 vin-t-xs leading-relaxed">
            Son propuestas de intensidad a partir de lo encontrado afuera. No entran solas al mapa: tú decides si pesan
            lo mismo que tus datos de plataforma.
          </p>
          <div className="space-y-2.5">
            {inv.senalesPlaza.map((s, i) => (
              <div key={i} className="flex flex-wrap items-start gap-3">
                <div className="w-36 shrink-0">
                  <div className="vin-t-base leading-snug">{s.ciudad}</div>
                  <div className="vin-faint vin-t-xs tabular-nums">calor {s.calorSugerido}</div>
                </div>
                <div className="vin-bar-track mt-1.5 h-2 w-24 shrink-0">
                  <div className="vin-bar-fill h-full" style={{ width: `${s.calorSugerido}%` }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="vin-muted vin-t-sm leading-relaxed">{s.senal}</p>
                  <div className="mt-1.5">
                    <EvidenceTag nivel={s.nivel} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {inv.aplicadaEnCalor && (
            <p className="vin-faint mt-3.5 vin-t-xs">Ya aplicadas al mapa de calor de este proyecto.</p>
          )}
        </Panel>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {inv.implicacionesCatalogo.length > 0 && (
          <Panel>
            <PanelLabel>Qué le dice a nuestro catálogo</PanelLabel>
            <ul className="space-y-2">
              {inv.implicacionesCatalogo.map((x, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span style={{ color: "var(--vin-accent)" }}>—</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {inv.preguntasAbiertas.length > 0 && (
          <Panel>
            <PanelLabel>Lo que la web no respondió</PanelLabel>
            <ul className="space-y-2">
              {inv.preguntasAbiertas.map((x, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span className="vin-faint tabular-nums">{i + 1}.</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {inv.fuentes.length > 0 && (
        <Panel>
          <PanelLabel>Fuentes consultadas</PanelLabel>
          <ol className="space-y-2">
            {inv.fuentes.map((f, i) => (
              <li key={f.url} className="flex gap-2.5 vin-t-sm leading-relaxed">
                <span className="vin-faint shrink-0 tabular-nums">{i + 1}.</span>
                <span className="min-w-0">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--vin-text)" }}
                  >
                    {f.titulo}
                  </a>
                  <span className="vin-faint"> · {dominio(f.url)}</span>
                  {f.fecha && <span className="vin-faint"> · {f.fecha}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

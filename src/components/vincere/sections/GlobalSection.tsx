"use client";

import { useMemo, useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { indicadoresGlobales } from "@/lib/vincere/global";
import {
  calcularNps,
  vocesDetractoras,
  LecturaNps,
  NpsSobre,
  NPS_SOBRE_LABEL,
  NPS_SOBRE_PREGUNTA,
  NPS_SOBRE_QUE_MIDE,
  MINIMO_UTIL,
  ADVERTENCIA_NPS,
} from "@/lib/vincere/nps";
import { SectionHeader, Panel, PanelLabel } from "../primitives";

// La vista de un lunes.
//
// Todo lo demás mira un artista a la vez. Acá se cruza todo, y con un sesgo
// deliberado: abre por lo VENCIDO SIN CERRAR, no por las cifras bonitas. Un
// marcador que no se cierra siempre parece que va ganando, y esa es la forma
// más fácil de que este sistema se vuelva decorado.

// El color sigue a la CONFIANZA, no al puntaje.
//
// Pintar de verde un +50 cuyo rango va de -35 a 100 sería una mentira visual:
// el texto diría que no se sabe ni el signo mientras el número se ve como un
// logro, y de esas dos cosas la que se captura para una presentación es el
// verde. Cuando el rango cruza el cero el número va en gris, porque eso es
// exactamente lo que significa: todavía no dice nada.
function colorNps(p: number | null, rangoBajo?: number | null, rangoAlto?: number | null): string {
  if (p == null) return "var(--vin-dim)";
  if (rangoBajo != null && rangoAlto != null && rangoBajo < 0 && rangoAlto > 0) return "var(--vin-dim)";
  if (p >= 50) return "var(--vin-ok)";
  if (p >= 0) return "var(--vin-warn)";
  return "var(--vin-risk)";
}

// El puntaje con su margen. El margen no es un adorno: con pocas respuestas es
// tan ancho que el número no distingue nada, y verlo es lo que impide
// presentar ruido como resultado.
function TarjetaNps({ l, sobre }: { l: LecturaNps; sobre: NpsSobre }) {
  return (
    <div className="vin-card p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="vin-t-base font-medium">{NPS_SOBRE_LABEL[sobre]}</span>
        <span className="vin-faint vin-t-sm tabular-nums">
          {l.respuestas} respuesta{l.respuestas === 1 ? "" : "s"}
        </span>
      </div>
      <p className="vin-faint vin-t-sm mb-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
        {NPS_SOBRE_QUE_MIDE[sobre]}
      </p>

      {l.puntaje == null ? (
        <p className="vin-muted vin-t-base leading-relaxed" style={{ maxWidth: "70ch" }}>
          {l.falta}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="vin-t-display vin-serif tabular-nums" style={{ color: colorNps(l.puntaje, l.rangoBajo, l.rangoAlto) }}>
              {l.puntaje > 0 ? "+" : ""}
              {l.puntaje}
            </span>
            {l.margen != null && (
              <span className="vin-muted vin-t-base tabular-nums">
                ± {l.margen} · va de {l.rangoBajo} a {l.rangoAlto}
              </span>
            )}
          </div>

          {/* El reparto. Los pasivos son el bloque que nadie mira y suele ser
              el más grande: no dicen nada malo y tampoco traen a nadie. */}
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--vin-border)" }}>
            <div style={{ width: `${l.pctPromotores}%`, background: "var(--vin-ok)" }} />
            <div style={{ width: `${l.pctPasivos}%`, background: "var(--vin-dim)" }} />
            <div style={{ width: `${l.pctDetractores}%`, background: "var(--vin-risk)" }} />
          </div>
          <div className="vin-faint vin-t-sm mt-2 flex flex-wrap gap-x-5">
            <span style={{ color: "var(--vin-ok)" }}>{l.pctPromotores}% promotores</span>
            <span>{l.pctPasivos}% pasivos</span>
            <span style={{ color: "var(--vin-risk)" }}>{l.pctDetractores}% detractores</span>
          </div>

          <p className="vin-t-base mt-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
            {l.lectura}
          </p>
          {l.falta && (
            <p className="vin-t-sm mt-2 leading-relaxed" style={{ color: "var(--vin-warn)", maxWidth: "70ch" }}>
              {l.falta}
            </p>
          )}
        </>
      )}

      {l.descartadas > 0 && (
        <p className="vin-t-sm mt-3" style={{ color: "var(--vin-warn)" }}>
          {l.descartadas} respuesta(s) fuera del rango 0-10 quedaron descartadas.
        </p>
      )}
    </div>
  );
}

function CapturaNps({ proyecto }: { proyecto: VincereProyecto }) {
  const addRespuestaNps = useVincereStore((s) => s.addRespuestaNps);
  const [sobre, setSobre] = useState<NpsSobre>("artista");
  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [canal, setCanal] = useState("");

  return (
    <Panel>
      <PanelLabel>Registrar una respuesta</PanelLabel>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["artista", "vincere"] as NpsSobre[]).map((s) => (
          <button
            key={s}
            onClick={() => setSobre(s)}
            className="vin-t-sm rounded-full px-3 py-1.5"
            style={{
              border: sobre === s ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
              color: sobre === s ? "var(--vin-text)" : "var(--vin-muted)",
              background: sobre === s ? "rgba(224,72,58,0.12)" : "transparent",
            }}
          >
            {NPS_SOBRE_LABEL[s]}
          </button>
        ))}
      </div>

      <p className="vin-muted vin-t-base mb-3 leading-relaxed" style={{ maxWidth: "70ch" }}>
        «{NPS_SOBRE_PREGUNTA[sobre]}»
      </p>

      {/* Los once botones en vez de un campo numérico: la escala del NPS es
          cerrada y verla completa evita el error de captura antes de que
          ocurra. */}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((v) => (
          <button
            key={v}
            onClick={() => setPuntaje(v)}
            className="vin-t-sm h-9 w-9 rounded-[--r-sm] tabular-nums"
            style={{
              border: puntaje === v ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
              background:
                puntaje === v
                  ? "rgba(224,72,58,0.18)"
                  : v >= 9
                    ? "rgba(78,201,138,0.10)"
                    : v <= 6
                      ? "rgba(224,72,58,0.07)"
                      : "transparent",
              color: puntaje === v ? "var(--vin-text)" : "var(--vin-muted)",
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="vin-faint vin-t-xs mt-1.5 flex gap-5">
        <span>0-6 detractor</span>
        <span>7-8 pasivo</span>
        <span>9-10 promotor</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="vin-input"
          placeholder="Por qué (opcional, pero es lo que más sirve)"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <input
          className="vin-input"
          placeholder="Por dónde se preguntó — correo, show, DM"
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
        />
      </div>

      <button
        className="vin-btn-primary mt-4"
        disabled={puntaje == null}
        onClick={() => {
          if (puntaje == null) return;
          addRespuestaNps(proyecto.id, {
            sobre,
            puntaje,
            comentario: comentario.trim() || undefined,
            canal: canal.trim() || undefined,
            fecha: new Date().toISOString().slice(0, 10),
          });
          setPuntaje(null);
          setComentario("");
        }}
      >
        Guardar respuesta
      </button>
    </Panel>
  );
}

export default function GlobalSection({ proyectoActivo }: { proyectoActivo: VincereProyecto | null }) {
  const proyectos = useVincereStore((s) => s.proyectos);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const selectProyecto = useVincereStore((s) => s.selectProyecto);

  const g = useMemo(() => indicadoresGlobales(proyectos), [proyectos]);

  const npsArtista = useMemo(
    () =>
      calcularNps(
        (proyectoActivo?.npsRespuestas ?? []).filter((r) => r.sobre === "artista"),
        "artista"
      ),
    [proyectoActivo]
  );
  const voces = useMemo(
    () => vocesDetractoras((proyectoActivo?.npsRespuestas ?? []).filter((r) => r.sobre === "artista")),
    [proyectoActivo]
  );

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Indicadores globales"
        title="Todos los proyectos"
        subtitle="La vista que cruza los artistas. Abre por lo que está vencido sin cerrar, no por lo que va bien: un marcador que no se cierra siempre parece que va ganando."
      />

      <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "74ch" }}>
        {g.titular}
      </p>

      {/* LO VENCIDO PRIMERO. Es el sesgo de esta pantalla y es a propósito. */}
      {g.pendientes.length > 0 && (
        <div className="vin-accent-card p-6">
          <div className="vin-eyebrow mb-4">Vencido y sin cerrar</div>
          <div className="flex flex-col gap-3">
            {g.pendientes.slice(0, 12).map((x, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => {
                      selectProyecto(x.proyectoId);
                      setSeccion(x.tipo === "prediccion" ? "predicciones" : "lanzamiento");
                    }}
                    className="vin-t-base text-left hover:underline"
                  >
                    {x.que}
                  </button>
                  <div className="vin-faint vin-t-sm">
                    {x.proyecto} · {x.tipo === "prediccion" ? "predicción" : "lanzamiento"}
                  </div>
                </div>
                <span
                  className="vin-t-sm shrink-0 tabular-nums"
                  style={{ color: x.diasVencido > 30 ? "var(--vin-risk)" : "var(--vin-warn)" }}
                >
                  {x.diasVencido} día{x.diasVencido === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
          {g.pendientes.length > 12 && (
            <p className="vin-faint vin-t-sm mt-3">y {g.pendientes.length - 12} más.</p>
          )}
        </div>
      )}

      {/* La tabla por proyecto */}
      <div>
        <PanelLabel alto>Por proyecto</PanelLabel>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: "620px" }}>
            <thead>
              <tr className="vin-faint vin-t-sm" style={{ borderBottom: "1px solid var(--vin-border)" }}>
                <th className="pb-2 text-left font-normal">Proyecto</th>
                <th className="pb-2 text-right font-normal">Motores</th>
                <th className="pb-2 text-right font-normal">Fan rate</th>
                <th className="pb-2 text-right font-normal">Predicciones</th>
                <th className="pb-2 text-right font-normal">NPS</th>
              </tr>
            </thead>
            <tbody>
              {g.filas.map((f) => (
                <tr key={f.id} style={{ borderBottom: "1px solid var(--vin-border)" }}>
                  <td className="py-3">
                    <button onClick={() => selectProyecto(f.id)} className="vin-t-base hover:underline">
                      {f.nombre}
                    </button>
                    {f.tipo === "competencia" && <span className="vin-faint vin-t-xs"> · competencia</span>}
                  </td>
                  <td className="py-3 text-right vin-t-sm tabular-nums">
                    {f.motoresListos}/{f.motoresTotal}
                  </td>
                  <td className="py-3 text-right vin-t-sm tabular-nums">
                    {f.fanRatePct != null ? (
                      <>
                        {f.fanRatePct}%
                        {/* El marginal mide la audiencia que entró de verdad; el
                            acumulado arrastra años. No son lo mismo y la tabla
                            no los puede mostrar iguales. */}
                        <span className="vin-faint vin-t-xs">{f.fanRateEsMarginal ? " marg." : " acum."}</span>
                      </>
                    ) : (
                      <span className="vin-faint">sin oyentes</span>
                    )}
                  </td>
                  <td className="py-3 text-right vin-t-sm tabular-nums">
                    {f.prediccionesAbiertas}
                    {f.prediccionesVencidas > 0 && (
                      <span style={{ color: "var(--vin-warn)" }}> ({f.prediccionesVencidas} vencidas)</span>
                    )}
                  </td>
                  <td className="py-3 text-right vin-t-sm tabular-nums" style={{ color: colorNps(f.nps) }}>
                    {f.nps != null ? (
                      <>
                        {f.nps > 0 ? "+" : ""}
                        {f.nps}
                        <span className="vin-faint vin-t-xs"> ({f.npsRespuestas})</span>
                      </>
                    ) : (
                      <span className="vin-faint">sin encuesta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="vin-faint vin-t-sm mt-3 leading-relaxed" style={{ maxWidth: "74ch" }}>
          Un NPS con menos de {MINIMO_UTIL} respuestas no distingue un resultado bueno de uno malo. El número entre
          paréntesis es cuántas hay.
        </p>
      </div>

      {/* NPS */}
      <div>
        <PanelLabel alto>NPS</PanelLabel>
        <p className="vin-muted vin-t-base mb-5 leading-relaxed" style={{ maxWidth: "74ch" }}>
          Mide si alguien recomienda, y eso <span style={{ color: "var(--vin-text)" }}>no se puede deducir</span> de
          streams, oyentes ni seguidores. Esas métricas dicen quién escucha. Hay que preguntar.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <TarjetaNps l={g.npsVincere} sobre="vincere" />
          {proyectoActivo && <TarjetaNps l={npsArtista} sobre="artista" />}
        </div>

        {voces.length > 0 && (
          <div className="mt-5">
            <div className="vin-muted vin-t-sm mb-2 font-medium">Lo que dicen los detractores</div>
            <p className="vin-faint vin-t-sm mb-3 leading-relaxed" style={{ maxWidth: "74ch" }}>
              El número dice que hay un problema; esto dice cuál. Es la parte del NPS que cambia una decisión.
            </p>
            <div className="flex flex-col gap-2">
              {voces.slice(0, 6).map((v) => (
                <div key={v.id} className="flex gap-3">
                  <span
                    className="vin-t-sm shrink-0 tabular-nums"
                    style={{ color: "var(--vin-risk)", width: "1.5rem" }}
                  >
                    {v.puntaje}
                  </span>
                  <p className="vin-t-sm leading-relaxed">{v.comentario}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {proyectoActivo && (
          <div className="mt-5">
            <CapturaNps proyecto={proyectoActivo} />
          </div>
        )}

        <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "74ch" }}>
          {ADVERTENCIA_NPS}
        </p>
      </div>
    </div>
  );
}

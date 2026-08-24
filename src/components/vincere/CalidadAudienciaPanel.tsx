"use client";

import { useMemo } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { calcularFanRate } from "@/lib/vincere/fanrate";
import {
  profundidadDeEscucha,
  lecturaDeOrigen,
  cuadroDeAudiencia,
  CUADRANTE_LABEL,
  ESTADO_ORIGEN_LABEL,
  UMBRAL_STREAMS_POR_OYENTE,
  ALARMA_PLAYLIST,
  FUENTE_UMBRAL,
  FUENTE_ORIGEN,
} from "@/lib/vincere/calidadAudiencia";
import { Panel, PanelLabel } from "./primitives";

// ¿La audiencia es tuya o la estás alquilando?
//
// El fan rate vive en su propio panel y responde si te siguieron. Este responde
// las otras dos mitades: si te vuelven a poner, y de dónde vienen. A diferencia
// del fan rate, acá sí hay umbrales publicados —2,0 reproducciones por persona
// y 70% de playlist— así que el sistema puede decir "está por debajo de la
// línea" en vez de solo comparar al artista contra sí mismo.

const COLOR_CUADRANTE: Record<string, string> = {
  fans: "var(--vin-ok)",
  consumen: "var(--vin-warn)",
  gesto: "var(--vin-warn)",
  prestado: "var(--vin-risk)",
};

const COLOR_ORIGEN: Record<string, string> = {
  propio: "var(--vin-ok)",
  mixto: "var(--vin-warn)",
  prestado: "var(--vin-risk)",
};

export default function CalidadAudienciaPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const prof = useMemo(() => profundidadDeEscucha(proyecto), [proyecto]);
  const origen = useMemo(() => lecturaDeOrigen(proyecto), [proyecto]);
  const cuadro = useMemo(() => {
    const fr = calcularFanRate(proyecto);
    const usable =
      fr.marginal && fr.marginal.movimiento === "creció" && !fr.marginal.imposibleComoConversion
        ? fr.marginal.pct
        : (fr.actual?.pct ?? null);
    return cuadroDeAudiencia(usable, fr.actual?.pct ?? null, prof);
  }, [proyecto, prof]);

  if (!prof && !origen) {
    return (
      <Panel>
        <PanelLabel>Calidad de la audiencia</PanelLabel>
        <p className="vin-muted vin-t-base leading-relaxed" style={{ maxWidth: "70ch" }}>
          Faltan streams y oyentes del mes para saber cuánto vuelve cada persona, y el desglose de fuentes de Spotify
          for Artists para saber de dónde vienen. Sin eso solo se sabe cuánta audiencia hay, no si es propia.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-base font-medium">Calidad de la audiencia</span>
        <span className="vin-faint vin-t-sm">¿es tuya o la estás alquilando?</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        {prof && (
          <div>
            <div
              className="vin-serif vin-stat tabular-nums"
              style={{ color: prof.sobreUmbral ? "var(--vin-ok)" : "var(--vin-warn)" }}
            >
              {prof.ratio}
            </div>
            <div className="vin-faint vin-t-sm mt-1.5">
              reproducciones por persona · la línea está en {UMBRAL_STREAMS_POR_OYENTE}
            </div>
          </div>
        )}

        {origen && origen.playlistPct != null && (
          <div>
            <div className="vin-serif vin-stat tabular-nums" style={{ color: COLOR_ORIGEN[origen.estado] }}>
              {origen.playlistPct}%
            </div>
            <div className="vin-faint vin-t-sm mt-1.5">
              de playlists · la alarma está en {ALARMA_PLAYLIST}%
            </div>
          </div>
        )}
      </div>

      {prof && (
        <p className="vin-t-base mt-5 leading-relaxed" style={{ maxWidth: "70ch" }}>
          {prof.lectura}
        </p>
      )}

      {origen && (
        <>
          {/* La barra hace visible de un vistazo cuánto del crecimiento es
              prestado. Un listado de porcentajes obliga a sumarlos de cabeza. */}
          <div
            className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--vin-border)" }}
          >
            <div style={{ width: `${origen.playlistPct ?? 0}%`, background: "var(--vin-risk)" }} />
            <div style={{ width: `${origen.algoritmicoPct ?? 0}%`, background: "var(--vin-ok)" }} />
            <div style={{ width: `${origen.perfilPct ?? 0}%`, background: "var(--vin-accent)" }} />
            <div style={{ width: `${origen.externoPct ?? 0}%`, background: "var(--vin-muted)" }} />
          </div>
          <div className="vin-faint vin-t-sm mt-2 flex flex-wrap gap-x-5">
            {origen.playlistPct != null && <span style={{ color: "var(--vin-risk)" }}>{origen.playlistPct}% playlist</span>}
            {origen.algoritmicoPct != null && <span style={{ color: "var(--vin-ok)" }}>{origen.algoritmicoPct}% algoritmo</span>}
            {origen.perfilPct != null && <span style={{ color: "var(--vin-accent)" }}>{origen.perfilPct}% perfil</span>}
            {origen.externoPct != null && <span>{origen.externoPct}% externo</span>}
            {origen.sinClasificarPct > 0 && <span className="vin-faint">{origen.sinClasificarPct}% sin clasificar</span>}
          </div>

          <p className="vin-t-base mt-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
            <span style={{ color: COLOR_ORIGEN[origen.estado] }}>{ESTADO_ORIGEN_LABEL[origen.estado]}.</span>{" "}
            {origen.lectura}
          </p>
          <p className="vin-muted vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch" }}>
            {origen.queHacer}
          </p>
        </>
      )}

      {/* El cruce. Ninguno de los dos solo alcanza: fan rate alto con poca
          escucha es gente que siguió por gesto. */}
      {cuadro && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--vin-border)" }}>
          <div className="vin-eyebrow mb-2" style={{ color: COLOR_CUADRANTE[cuadro.cuadrante] }}>
            {CUADRANTE_LABEL[cuadro.cuadrante]}
          </div>
          <p className="vin-t-base leading-relaxed" style={{ maxWidth: "70ch" }}>
            {cuadro.lectura}
          </p>
          <p className="vin-muted vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch" }}>
            {cuadro.queHacer}
          </p>
        </div>
      )}

      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "70ch" }}>
        Umbrales de{" "}
        <a href={FUENTE_UMBRAL.url} target="_blank" rel="noreferrer" className="underline">
          {FUENTE_UMBRAL.fuente}
        </a>{" "}
        y{" "}
        <a href={FUENTE_ORIGEN.url} target="_blank" rel="noreferrer" className="underline">
          {FUENTE_ORIGEN.fuente}
        </a>
        , consultados en {FUENTE_UMBRAL.consultadoEn}. El desglose de fuentes sale de Spotify for Artists → Audiencia.
      </p>
    </Panel>
  );
}

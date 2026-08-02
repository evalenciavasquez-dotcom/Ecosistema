"use client";

import { VincereProyecto } from "@/lib/vincere/types";
import { calcularFanRate } from "@/lib/vincere/fanrate";
import { formatFollowers } from "@/lib/vincere/format";
import { Panel } from "./primitives";

// El fan rate a la vista. Es la métrica que separa un pico de un crecimiento:
// un artista puede duplicar oyentes por una playlist editorial y no ganar un
// solo seguidor, y en los paneles normales eso se ve como una gran noticia.

export default function FanRatePanel({ proyecto }: { proyecto: VincereProyecto }) {
  const f = calcularFanRate(proyecto);

  if (!f.actual) {
    return (
      <Panel>
        <div className="vin-t-base mb-2 font-medium">Fan rate</div>
        <p className="vin-muted vin-t-sm leading-relaxed">{f.falta}</p>
        <p className="vin-faint vin-t-sm mt-2 leading-relaxed">
          Se carga en «Editar data» arriba, o entra solo desde «Cargar data» si el material lo trae.
        </p>
      </Panel>
    );
  }

  const m = f.marginal;
  const mejor = m && !m.audienciaBajo && m.oyentesGanados > 0 && m.pct > f.actual.pct;
  const colorMarginal = m?.audienciaBajo
    ? "var(--vin-muted)"
    : mejor
      ? "var(--vin-ok)"
      : m && m.pct < f.actual.pct * 0.6
        ? "var(--vin-risk)"
        : "var(--vin-text)";

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="vin-t-base font-medium">Fan rate</span>
        <span className="vin-faint vin-t-sm">de quien escucha, cuánto se queda</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div>
          <div className="vin-serif vin-stat tabular-nums">{f.actual.pct}%</div>
          <div className="vin-faint vin-t-sm mt-1.5">
            acumulado · {formatFollowers(f.actual.seguidores)} de {formatFollowers(f.actual.oyentes)} oyentes
          </div>
        </div>

        {m && (
          <div>
            <div className="vin-serif vin-stat tabular-nums" style={{ color: colorMarginal }}>
              {m.audienciaBajo ? "—" : `${m.pct}%`}
            </div>
            <div className="vin-faint vin-t-sm mt-1.5">
              de la audiencia nueva · desde {m.desde}
            </div>
          </div>
        )}
      </div>

      {f.lectura && <p className="vin-muted vin-t-base mt-4 leading-relaxed">{f.lectura}</p>}

      {f.falta && <p className="vin-faint vin-t-sm mt-3 leading-relaxed">{f.falta}</p>}

      <p className="vin-faint vin-t-sm mt-4 leading-relaxed">
        El acumulado arrastra toda la historia del artista. El de la audiencia nueva es el que dice si lo que se está
        haciendo ahora atrae gente que se queda — y es el que hay que mirar antes de decidir por dónde entra un
        lanzamiento.
      </p>
    </Panel>
  );
}

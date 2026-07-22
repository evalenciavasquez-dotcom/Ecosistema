"use client";

import { VincereStreamMes } from "@/lib/vincere/types";

export default function StreamsChart({ serie }: { serie: VincereStreamMes[] }) {
  if (serie.length < 2) {
    return <p className="vin-faint text-sm">Carga al menos dos meses de streams para ver la curva.</p>;
  }

  const values = serie.map((s) => s.valor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Coordenadas en % para que el gráfico ocupe todo el ancho del panel y
  // quede alineado con las etiquetas de mes de abajo. preserveAspectRatio
  // "none" estira el trazo; vector-effect mantiene el grosor constante y el
  // punto final se dibuja como elemento HTML para que no se deforme.
  const pts = serie.map((s, i) => {
    const x = (i / (serie.length - 1)) * 100;
    const y = 8 + (1 - (s.valor - min) / range) * 84;
    return [x, y] as const;
  });
  const linePoints = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <div>
      <div className="relative h-[120px] w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--vin-accent)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${last[0]}%`, top: `${last[1]}%`, background: "var(--vin-accent)" }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        {serie.map((s) => (
          <span key={s.mes} className="vin-faint text-[11px]">
            {s.mes}
          </span>
        ))}
      </div>
    </div>
  );
}

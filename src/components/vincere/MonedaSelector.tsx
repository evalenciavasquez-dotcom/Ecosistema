"use client";

import { VincereProyecto, VINCERE_MONEDAS_SUGERIDAS } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { monedaDe } from "@/lib/vincere/dinero";

// Moneda base del proyecto. Cada artista opera en la suya, y forzar una sola a
// todo el sistema obliga a convertir de cabeza o a cargar cifras que no
// significan nada. Cambiarla NO reescribe lo ya cargado: los ingresos guardan
// su propia moneda, así que se sigue viendo en la que se registró.
export default function MonedaSelector({ proyecto }: { proyecto: VincereProyecto }) {
  const updateProyectoMeta = useVincereStore((s) => s.updateProyectoMeta);
  const actual = monedaDe(proyecto);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="vin-faint vin-t-xs uppercase tracking-[0.08em]">Moneda de {proyecto.nombre}</span>
      <div className="flex flex-wrap gap-1.5">
        {VINCERE_MONEDAS_SUGERIDAS.map((m) => (
          <button
            key={m}
            onClick={() => updateProyectoMeta(proyecto.id, { moneda: m })}
            className="rounded-full border px-2.5 py-0.5 vin-t-sm tabular-nums transition-colors"
            style={{
              color: actual === m ? "var(--vin-text)" : "var(--vin-dim)",
              borderColor: actual === m ? "var(--vin-accent)" : "var(--vin-border)",
              background: actual === m ? "var(--vin-accent-soft)" : "transparent",
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <span className="vin-faint vin-t-xs">— se usa al cargar; lo ya guardado conserva la suya</span>
    </div>
  );
}

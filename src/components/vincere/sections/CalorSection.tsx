"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

export default function CalorSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addZona = useVincereStore((s) => s.addZonaCalor);
  const updateZona = useVincereStore((s) => s.updateZonaCalor);
  const deleteZona = useVincereStore((s) => s.deleteZonaCalor);
  const [editing, setEditing] = useState(false);
  const [nueva, setNueva] = useState({ ciudad: "", calor: "" });

  const zonas = [...proyecto.zonasCalor].sort((a, b) => b.calor - a.calor);

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="calor"
      eyebrow="Zonas de Calor"
      title="Zonas de Calor"
      subtitle="Ciudades ordenadas por intensidad de escucha activa (0-100)."
      aiTitle="Lectura VINCERE — Zonas de Calor"
    >
      <div className="flex justify-end">
        <button className="vin-faint text-xs hover:underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar edición" : "Editar data"}
        </button>
      </div>

      <Panel>
        {zonas.length === 0 && <p className="vin-muted text-sm">Sin ciudades cargadas.</p>}
        {zonas.map((z) => {
          const opacity = (0.4 + (z.calor / 100) * 0.6).toFixed(2);
          return (
            <div key={z.id} className="mb-3 flex items-center gap-3.5">
              <div className="w-36 shrink-0 text-sm">{z.ciudad}</div>
              <div className="vin-bar-track h-2.5 flex-1">
                <div className="vin-bar-fill h-full" style={{ width: `${z.calor}%`, opacity }} />
              </div>
              {editing ? (
                <>
                  <input
                    type="number"
                    value={z.calor}
                    onChange={(e) => updateZona(proyecto.id, z.id, { calor: Number(e.target.value) })}
                    className="vin-input w-20"
                  />
                  <button onClick={() => deleteZona(proyecto.id, z.id)} className="vin-faint px-1 text-xs hover:underline">
                    ✕
                  </button>
                </>
              ) : (
                <div className="vin-muted w-9 shrink-0 text-right text-[13px]">{z.calor}</div>
              )}
            </div>
          );
        })}

        {editing && (
          <div className="mt-4 flex items-center gap-2" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1rem" }}>
            <input
              placeholder="Ciudad"
              value={nueva.ciudad}
              onChange={(e) => setNueva({ ...nueva, ciudad: e.target.value })}
              className="vin-input flex-1"
            />
            <input
              placeholder="Calor 0-100"
              type="number"
              value={nueva.calor}
              onChange={(e) => setNueva({ ...nueva, calor: e.target.value })}
              className="vin-input w-28"
            />
            <button
              onClick={() => {
                if (!nueva.ciudad.trim()) return;
                addZona(proyecto.id, { ciudad: nueva.ciudad.trim(), calor: Number(nueva.calor) || 0 });
                setNueva({ ciudad: "", calor: "" });
              }}
              className="vin-btn-primary"
            >
              Añadir
            </button>
          </div>
        )}
      </Panel>
    </SectionShell>
  );
}

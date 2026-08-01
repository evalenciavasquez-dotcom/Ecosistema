"use client";

import { useState } from "react";
import {
  VincereProyecto,
  VincereTemperatura,
  VINCERE_TEMPERATURA_COLOR,
  VINCERE_TEMPERATURA_LABEL,
  VINCERE_TEMPERATURA_LECTURA,
  temperaturaDe,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";

const TEMPERATURAS: VincereTemperatura[] = ["caliente", "medio", "frio"];

export default function CalorSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addZona = useVincereStore((s) => s.addZonaCalor);
  const updateZona = useVincereStore((s) => s.updateZonaCalor);
  const deleteZona = useVincereStore((s) => s.deleteZonaCalor);
  const [editing, setEditing] = useState(false);
  const [nueva, setNueva] = useState({ ciudad: "", calor: "" });

  const zonas = [...proyecto.zonasCalor].sort((a, b) => b.calor - a.calor);
  const shows = proyecto.shows ?? [];

  // Cuántas plazas hay en cada franja: se lee antes de mirar ciudad por ciudad.
  const conteo = TEMPERATURAS.map((t) => ({
    t,
    n: zonas.filter((z) => temperaturaDe(z.calor) === t).length,
  }));

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="calor"
      eyebrow="Zonas de Calor"
      title="Dónde hay demanda"
      subtitle="El calor mide escucha activa, no entradas vendidas. Sirve para dos cosas: saber dónde reforzar, y tener con qué convencer a un empresario de la plaza de que ahí hay público esperando."
      aiTitle="Lectura VINCERE — Zonas de Calor"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          {conteo.map(({ t, n }) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px]"
              style={{
                borderColor: n > 0 ? `${VINCERE_TEMPERATURA_COLOR[t]}66` : "var(--vin-border)",
                color: n > 0 ? VINCERE_TEMPERATURA_COLOR[t] : "var(--vin-dim)",
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: VINCERE_TEMPERATURA_COLOR[t] }}
              />
              {VINCERE_TEMPERATURA_LABEL[t]}
              <span className="tabular-nums">{n}</span>
            </span>
          ))}
        </div>
        <button className="vin-faint text-xs hover:underline" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cerrar edición" : "Editar data"}
        </button>
      </div>

      <Panel>
        {zonas.length === 0 && <p className="vin-muted text-sm">Sin ciudades cargadas.</p>}

        {zonas.map((z) => {
          const temp = temperaturaDe(z.calor);
          const color = VINCERE_TEMPERATURA_COLOR[temp];
          // Si ya se tocó ahí, se marca: el calor deja de ser solo una promesa
          // y pasa a tener un antecedente.
          const yaTocado = shows.some((s) => s.ciudad.toLowerCase() === z.ciudad.toLowerCase());

          return (
            <div key={z.id} className="mb-3.5">
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[14.5px]">{z.ciudad}</span>
                  <span className="text-[11px] uppercase tracking-wide" style={{ color }}>
                    {VINCERE_TEMPERATURA_LABEL[temp]}
                  </span>
                  {yaTocado && <span className="vin-faint text-[10.5px]">· ya tocaste aquí</span>}
                </div>
                <div className="flex items-center gap-2.5">
                  {editing ? (
                    <>
                      <input
                        type="number"
                        value={z.calor}
                        onChange={(e) => updateZona(proyecto.id, z.id, { calor: Number(e.target.value) })}
                        className="vin-input w-20"
                      />
                      <button
                        onClick={() => deleteZona(proyecto.id, z.id)}
                        className="vin-faint px-1 text-xs hover:underline"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="vin-serif text-lg tabular-nums" style={{ color }}>
                      {z.calor}%
                    </span>
                  )}
                </div>
              </div>
              <div className="vin-bar-track h-2.5">
                <div className="h-full" style={{ width: `${Math.min(100, z.calor)}%`, background: color }} />
              </div>
            </div>
          );
        })}

        {editing && (
          <div
            className="mt-4 flex items-center gap-2"
            style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1rem" }}
          >
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
                addZona(proyecto.id, {
                  ciudad: nueva.ciudad.trim(),
                  calor: Math.min(100, Math.max(0, Number(nueva.calor) || 0)),
                });
                setNueva({ ciudad: "", calor: "" });
              }}
              className="vin-btn-primary"
            >
              Añadir
            </button>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelLabel>Cómo leer la escala</PanelLabel>
        <div className="space-y-2">
          {TEMPERATURAS.map((t) => (
            <div key={t} className="flex gap-2.5">
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: VINCERE_TEMPERATURA_COLOR[t] }}
              />
              <p className="text-[13px] leading-relaxed">
                <span style={{ color: VINCERE_TEMPERATURA_COLOR[t] }}>
                  {VINCERE_TEMPERATURA_LABEL[t]}
                  {t === "caliente" ? " (70-100%)" : t === "medio" ? " (40-69%)" : " (0-39%)"}
                </span>
                {" — "}
                <span className="vin-muted">{VINCERE_TEMPERATURA_LECTURA[t]}</span>
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </SectionShell>
  );
}

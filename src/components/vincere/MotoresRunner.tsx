"use client";

import { useState } from "react";
import { VincereProyecto, VincereSeccion } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { buildSectionContext, sectionTitle } from "@/lib/vincere/context";
import { fetchInterpret } from "@/lib/vincere/ai-client";
import { motoresDelProyecto } from "@/lib/vincere/motores";
import { genId } from "@/lib/id";
import { Panel, PanelLabel } from "./primitives";

type Estado = "espera" | "corriendo" | "hecho" | "falla" | "saltado";

const MARCA: Record<Estado, string> = {
  espera: "·",
  corriendo: "◐",
  hecho: "✓",
  falla: "✕",
  saltado: "—",
};

const COLOR: Record<Estado, string> = {
  espera: "var(--vin-dim)",
  corriendo: "#e0a83a",
  hecho: "#5cc98e",
  falla: "#e0483a",
  saltado: "var(--vin-dim)",
};

export default function MotoresRunner({ proyecto }: { proyecto: VincereProyecto }) {
  const setInsights = useVincereStore((s) => s.setInsights);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const showToast = useVincereStore((s) => s.showToast);

  const [corriendo, setCorriendo] = useState(false);
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [fallas, setFallas] = useState<Record<string, string>>({});
  const [terminado, setTerminado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const motores = motoresDelProyecto(proyecto);
  const listos = motores.filter((m) => m.listo);
  const vacios = motores.filter((m) => !m.listo);
  const yaTienenLectura = listos.filter((m) => (proyecto.insights[m.seccion]?.length ?? 0) > 0).length;

  async function correr() {
    if (corriendo || !listos.length) return;
    setCorriendo(true);
    setTerminado(false);
    setAbierto(true);
    setFallas({});
    setEstados(Object.fromEntries(listos.map((m) => [m.seccion, "espera" as Estado])));

    let ok = 0;
    const errores: Record<string, string> = {};

    // En fila, no en paralelo: diez llamadas simultáneas se topan con el
    // límite de la API y además no se podría ver por dónde va.
    for (const m of listos) {
      setEstados((prev) => ({ ...prev, [m.seccion]: "corriendo" }));
      try {
        const contexto = buildSectionContext(proyecto, m.seccion as VincereSeccion);
        const result = await fetchInterpret(sectionTitle(m.seccion), contexto);
        setInsights(
          proyecto.id,
          m.seccion,
          result.map((r) => ({ id: genId("ins"), texto: r.texto, nivel: r.nivel }))
        );
        setEstados((prev) => ({ ...prev, [m.seccion]: "hecho" }));
        ok++;
      } catch (err) {
        // Un motor que falla no detiene el resto: si se cayó la conexión en el
        // cuarto, tener los otros nueve sigue sirviendo.
        errores[m.seccion] = err instanceof Error ? err.message : "no se pudo generar";
        setEstados((prev) => ({ ...prev, [m.seccion]: "falla" }));
      }
    }

    setFallas(errores);
    setCorriendo(false);
    setTerminado(true);
    const nFallas = Object.keys(errores).length;
    showToast(
      nFallas
        ? `${ok} de ${listos.length} motores listos · ${nFallas} con error`
        : `${ok} ${ok === 1 ? "motor leído" : "motores leídos"}. Ya se puede emitir el informe.`
    );
  }

  if (!listos.length) {
    return (
      <Panel>
        <PanelLabel>Correr los motores</PanelLabel>
        <p className="vin-muted text-[13.5px] leading-relaxed">
          Todavía no hay data para interpretar. Empieza por «Cargar data»: sueltas una captura o un archivo y se
          reparte solo a los motores que corresponda.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <PanelLabel>Correr los motores</PanelLabel>
        <button onClick={() => setAbierto((v) => !v)} className="vin-faint text-[11.5px] hover:underline">
          {abierto ? "ocultar detalle" : `ver los ${motores.length}`}
        </button>
      </div>

      <p className="vin-muted mb-3 text-[13.5px] leading-relaxed">
        {listos.length} {listos.length === 1 ? "motor tiene" : "motores tienen"} data con qué trabajar
        {vacios.length > 0 && `; ${vacios.length} se ${vacios.length === 1 ? "salta" : "saltan"}`}. Los vacíos no se
        corren a propósito: darían una lectura educada sobre nada, y después entraría al informe como si fuera
        análisis.
      </p>

      {abierto && (
        <div className="mb-3.5 space-y-1">
          {motores.map((m) => {
            const e: Estado = m.listo ? (estados[m.seccion] ?? "espera") : "saltado";
            return (
              <div key={m.seccion} className="flex items-baseline gap-2.5 text-[12.5px]">
                <span className="w-3 shrink-0 tabular-nums" style={{ color: COLOR[e] }}>
                  {MARCA[e]}
                </span>
                <span style={{ color: m.listo ? "var(--vin-text)" : "var(--vin-dim)" }}>{m.label}</span>
                <span className="vin-faint">
                  {e === "falla" ? fallas[m.seccion] ?? "error" : m.razon}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={correr} disabled={corriendo} className="vin-btn-primary">
          {corriendo ? "Leyendo…" : `Correr los ${listos.length} motores con data`}
        </button>
        {corriendo && (
          <span className="vin-faint text-xs">
            Van en fila, uno por uno. Toma un rato — puedes dejarlo corriendo.
          </span>
        )}
        {!corriendo && !terminado && yaTienenLectura > 0 && (
          <span className="vin-faint text-xs">
            {yaTienenLectura} ya {yaTienenLectura === 1 ? "tiene" : "tienen"} lectura; se {yaTienenLectura === 1 ? "reemplaza" : "reemplazan"}.
          </span>
        )}
        {terminado && !corriendo && (
          <button onClick={() => setSeccion("informe")} className="vin-btn-ghost">
            Ir al Informe Final →
          </button>
        )}
      </div>

      {terminado && Object.keys(fallas).length > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--vin-accent)" }}>
          Los que fallaron se pueden reintentar desde su propia sección, o volviendo a correr esto.
        </p>
      )}
    </Panel>
  );
}

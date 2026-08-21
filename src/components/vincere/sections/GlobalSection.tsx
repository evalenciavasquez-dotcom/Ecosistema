"use client";

import { useMemo } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { indicadoresGlobales } from "@/lib/vincere/global";
import { ETAPA_LABEL } from "@/lib/vincere/cuello";
import { SectionHeader, PanelLabel } from "../primitives";

// La vista de un lunes.
//
// Todo lo demás mira un artista a la vez. Acá se cruza todo, y con un sesgo
// deliberado: abre por lo VENCIDO SIN CERRAR, no por las cifras bonitas. Un
// marcador que no se cierra siempre parece que va ganando, y esa es la forma
// más fácil de que este sistema se vuelva decorado.
//
// Aquí vivió un NPS y se sacó a propósito. La métrica es buena y la
// implementación quedó honesta —conteos con pocas respuestas, puntaje solo con
// muestra suficiente, margen de error siempre visible—, pero se alimenta de
// encuestas que a esta escala de operación no se van a levantar. Un indicador
// que nadie puede alimentar no queda neutro: queda vacío en pantalla y hace ver
// incompleto un tablero que sí está completo. Está en el historial de git si
// algún día hay volumen para sostenerlo.

export default function GlobalSection() {
  const proyectos = useVincereStore((s) => s.proyectos);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const selectProyecto = useVincereStore((s) => s.selectProyecto);

  const g = useMemo(() => indicadoresGlobales(proyectos), [proyectos]);

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

      {/* Cuando el mismo cuello se repite, el problema dejó de ser el artista.
          Va acá arriba porque es lo único de esta pantalla que cambia cómo se
          trabaja y no solo qué se atiende primero. */}
      {g.patronDeCuello && (
        <p
          className="vin-t-base rounded-xl px-4 py-3.5 leading-relaxed"
          style={{
            maxWidth: "74ch",
            color: "var(--vin-warn)",
            background: "rgba(229,169,60,0.09)",
            border: "1px solid rgba(229,169,60,0.22)",
          }}
        >
          {g.patronDeCuello}
        </p>
      )}

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
                {/* Segunda columna, no la última: es el dato que decide dónde
                    va el trabajo esta semana. */}
                <th className="pb-2 text-left font-normal">Trabado en</th>
                <th className="pb-2 text-right font-normal">Motores</th>
                <th className="pb-2 text-right font-normal">Fan rate</th>
                <th className="pb-2 text-right font-normal">Predicciones</th>
                <th className="pb-2 text-right font-normal">Lanzamientos</th>
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
                  <td className="py-3 vin-t-sm">
                    {f.cuello ? (
                      <>
                        <span style={{ color: f.cuello === "alcance" ? "var(--vin-ok)" : "var(--vin-risk)" }}>
                          {ETAPA_LABEL[f.cuello]}
                        </span>
                        {/* El alcance es el único cuello que se resuelve
                            comprando. Que se vea distinto no es decoración:
                            es la diferencia entre gastar y quemar. */}
                        {f.cuello === "alcance" && <span className="vin-faint vin-t-xs"> · listo para pauta</span>}
                      </>
                    ) : f.etapasCiegas > 0 ? (
                      <span className="vin-faint">
                        {f.etapasCiegas === 6 ? "sin data" : `${f.etapasCiegas} etapa${f.etapasCiegas === 1 ? "" : "s"} a ciegas`}
                      </span>
                    ) : (
                      <span style={{ color: "var(--vin-ok)" }}>nada roto</span>
                    )}
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
                  <td className="py-3 text-right vin-t-sm tabular-nums">
                    {f.lanzamientosAbiertos > 0 ? (
                      <>
                        {f.lanzamientosAbiertos}
                        <span className="vin-faint vin-t-xs"> abierto{f.lanzamientosAbiertos === 1 ? "" : "s"}</span>
                      </>
                    ) : (
                      <span className="vin-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="vin-faint vin-t-sm mt-3 leading-relaxed" style={{ maxWidth: "74ch" }}>
          «Motores» es cuántos tienen data suficiente para dar una lectura, no cuántos existen. Un proyecto con dos de
          once no está mal: está sin cargar.
        </p>
      </div>
    </div>
  );
}

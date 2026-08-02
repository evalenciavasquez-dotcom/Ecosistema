"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import { etiquetaRuta, fetchRecomendacion } from "@/lib/cuartel/ai-client";
import {
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CuartelEscenario,
} from "@/lib/cuartel/types";
import { ErrorNota, LuzChip, Panel, PanelLabel } from "./primitives";

// La comparación es el núcleo del producto: las rutas válidas, una al lado de
// la otra, sin favoritismo. Las descartadas por el candado no aparecen acá —
// ya perdieron— pero siguen visibles arriba, en su tarjeta tachada.
export default function ComparacionPanel({ escenario }: { escenario: CuartelEscenario }) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const setCierre = useCuartelStore((s) => s.setCierre);
  const setEstado = useCuartelStore((s) => s.setEstado);
  const showToast = useCuartelStore((s) => s.showToast);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movida, setMovida] = useState<{ texto: string; plazo: string; supuesto: string } | null>(null);

  const validas = escenario.rutas.filter((r) => calcularVeredicto(r).validez === "valida");
  const recomendada = escenario.rutas.find((r) => r.id === escenario.cierre.rutaRecomendadaId);

  if (validas.length < 2) {
    return (
      <Panel>
        <PanelLabel>Comparación</PanelLabel>
        <p className="cua-muted text-[13px] leading-relaxed">
          Hacen falta al menos dos rutas válidas para comparar. Hoy hay {validas.length}. Completá el análisis de las que
          siguen pendientes — comparar una ruta contra nada no es comparar.
        </p>
      </Panel>
    );
  }

  async function recomendar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetchRecomendacion(escenario, escenarios);
      setCierre(escenario.id, {
        rutaRecomendadaId: res.rutaId,
        razonRecomendacion: res.razon,
        movidaConcreta: escenario.cierre.movidaConcreta || res.movidaConcreta,
        plazoMovida: escenario.cierre.plazoMovida || res.plazo,
      });
      setMovida({ texto: res.movidaConcreta, plazo: res.plazo, supuesto: res.loQueSeAsume });
      if (escenario.estado === "activo") setEstado(escenario.id, "analisis");
      showToast("Recomendación lista. La decisión sigue siendo tuya.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la recomendación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Panel>
      <PanelLabel>Comparación · {validas.length} rutas válidas</PanelLabel>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="cua-label w-32 px-1 pb-2 text-left align-bottom">Dimensión</th>
              {validas.map((r) => (
                <th key={r.id} className="cua-serif px-2 pb-2 text-left align-bottom text-[15px] font-medium">
                  {etiquetaRuta(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CUARTEL_SOMBREROS.map((s) => (
              <tr key={s} style={{ borderTop: "1px solid var(--cua-border)" }}>
                <td className="px-1 py-2.5 align-top">
                  <span aria-hidden>{CUARTEL_SOMBRERO_META[s].icono}</span>{" "}
                  <span className="cua-muted text-[12.5px]">{CUARTEL_SOMBRERO_META[s].label}</span>
                </td>
                {validas.map((r) => (
                  <td key={r.id} className="px-2 py-2.5 align-top leading-relaxed">
                    {r.sombreros[s] || <span className="cua-faint">—</span>}
                  </td>
                ))}
              </tr>
            ))}
            {CUARTEL_METRICAS.map((m) => (
              <tr key={m} style={{ borderTop: "1px solid var(--cua-border)" }}>
                <td className="px-1 py-2 align-top">
                  <span className="cua-muted text-[12.5px]">{CUARTEL_METRICA_META[m].label}</span>
                </td>
                {validas.map((r) => (
                  <td key={r.id} className="px-2 py-2 align-top">
                    <LuzChip luz={r.semaforo[m]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--cua-border)" }}>
        {recomendada ? (
          <>
            <div className="cua-eyebrow mb-2">Recomendación del sistema</div>
            <div className="cua-serif text-xl">{etiquetaRuta(recomendada)}</div>
            <p className="cua-muted mt-2 text-[13.5px] leading-relaxed">{escenario.cierre.razonRecomendacion}</p>
            {movida && (
              <div className="mt-4 space-y-1.5 text-[13px]">
                <div>
                  <span className="cua-label">Movida propuesta</span>
                  <p className="mt-1 leading-relaxed">
                    {movida.texto} <span className="cua-faint">· {movida.plazo}</span>
                  </p>
                </div>
                <div>
                  <span className="cua-label">Lo que se asume</span>
                  <p className="cua-muted mt-1 leading-relaxed">{movida.supuesto}</p>
                </div>
              </div>
            )}
            <p className="cua-faint mt-4 text-[12px] leading-relaxed">
              Es una recomendación, no una decisión. Podés elegir otra ruta abajo — la diferencia entre lo recomendado y
              lo elegido queda registrada, que es justamente lo que el Libro Rojo necesita saber.
            </p>
          </>
        ) : (
          <p className="cua-muted text-[13px] leading-relaxed">
            Con las rutas ya comparables, el sistema puede decir cuál queda mejor parada y traducirla en una movida
            concreta.
          </p>
        )}

        <button className="cua-btn-ghost mt-4" onClick={recomendar} disabled={cargando}>
          {cargando ? "Comparando…" : recomendada ? "Recalcular recomendación" : "Pedir recomendación"}
        </button>
        {error && <ErrorNota>{error}</ErrorNota>}
      </div>
    </Panel>
  );
}

"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import { etiquetaRuta } from "@/lib/cuartel/ai-client";
import { CuartelEscenario } from "@/lib/cuartel/types";
import { Campo, Panel, PanelLabel } from "./primitives";

// Cierre y aprendizaje. El campo de resultado es la pieza que convierte esto
// en un Libro Rojo y no en un formulario bonito: sin resultado registrado, un
// escenario cerrado no enseña nada al siguiente.
export default function CierrePanel({ escenario }: { escenario: CuartelEscenario }) {
  const setCierre = useCuartelStore((s) => s.setCierre);
  const setEstado = useCuartelStore((s) => s.setEstado);
  const showToast = useCuartelStore((s) => s.showToast);

  const cierre = escenario.cierre;
  const elegibles = escenario.rutas.filter((r) => calcularVeredicto(r).validez !== "descartada");
  const elegida = escenario.rutas.find((r) => r.id === cierre.rutaElegidaId);
  const recomendada = escenario.rutas.find((r) => r.id === cierre.rutaRecomendadaId);
  const difiere = !!elegida && !!recomendada && elegida.id !== recomendada.id;

  function decidir() {
    if (!cierre.rutaElegidaId || !cierre.movidaConcreta.trim()) return;
    setCierre(escenario.id, { fechaDecision: cierre.fechaDecision || new Date().toISOString().slice(0, 10) });
    setEstado(escenario.id, "decidido");
    showToast("Decisión registrada. Falta que la movida se ejecute de verdad.");
  }

  return (
    <Panel>
      <PanelLabel>Cierre y aprendizaje</PanelLabel>

      <div className="space-y-4">
        <Campo
          label="Ruta elegida"
          ayuda="La que Eduardo decide, coincida o no con la recomendación. Las descartadas por el candado no aparecen acá."
        >
          <select
            className="cua-select w-full"
            value={cierre.rutaElegidaId ?? ""}
            onChange={(e) => setCierre(escenario.id, { rutaElegidaId: e.target.value || null })}
          >
            <option value="">— sin decidir —</option>
            {elegibles.map((r) => (
              <option key={r.id} value={r.id}>
                {etiquetaRuta(r)}
              </option>
            ))}
          </select>
        </Campo>

        {difiere && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--cua-accent)" }}>
            La ruta elegida no es la recomendada ({etiquetaRuta(recomendada)}). Queda registrado así, sin discusión: esa
            diferencia es data para el Libro Rojo.
          </p>
        )}

        <Campo
          label="Movida concreta"
          ayuda="Una sola acción, ejecutable, verificable. Si dentro de una semana no se puede decir “se hizo” o “no se hizo”, no es una movida."
        >
          <textarea
            className="cua-textarea"
            rows={2}
            value={cierre.movidaConcreta}
            onChange={(e) => setCierre(escenario.id, { movidaConcreta: e.target.value })}
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Plazo de la movida">
            <input
              className="cua-input"
              placeholder="antes del viernes"
              value={cierre.plazoMovida}
              onChange={(e) => setCierre(escenario.id, { plazoMovida: e.target.value })}
            />
          </Campo>
          <Campo label="Fecha de decisión">
            <input
              type="date"
              className="cua-input"
              value={cierre.fechaDecision}
              onChange={(e) => setCierre(escenario.id, { fechaDecision: e.target.value })}
            />
          </Campo>
        </div>

        {escenario.estado !== "decidido" && escenario.estado !== "seguimiento" && escenario.estado !== "cerrado" && (
          <button
            className="cua-btn-primary"
            onClick={decidir}
            disabled={!cierre.rutaElegidaId || !cierre.movidaConcreta.trim()}
          >
            Registrar la decisión
          </button>
        )}

        {(escenario.estado === "decidido" || escenario.estado === "seguimiento" || escenario.estado === "cerrado") && (
          <div className="border-t pt-4" style={{ borderColor: "var(--cua-border)" }}>
            <label className="mb-4 flex items-start gap-2.5 text-[13.5px]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={cierre.movidaEjecutada}
                onChange={(e) => {
                  setCierre(escenario.id, { movidaEjecutada: e.target.checked });
                  if (e.target.checked && escenario.estado === "decidido") setEstado(escenario.id, "seguimiento");
                }}
              />
              <span>
                La movida se ejecutó
                <span className="cua-faint block text-[12px]">
                  Analizada no cuenta. Esta casilla es la métrica principal del sistema.
                </span>
              </span>
            </label>

            <Campo
              label="Resultado / aprendizaje"
              ayuda="Se llena después, cuando la decisión ya jugó en la vida real. Semanas o meses. Sin esto, el Libro Rojo son buenas intenciones."
            >
              <textarea
                className="cua-textarea"
                rows={3}
                value={cierre.resultado}
                onChange={(e) => setCierre(escenario.id, { resultado: e.target.value })}
              />
            </Campo>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Campo label="El patrón identificado, ¿se confirmó?">
                <select
                  className="cua-select w-full"
                  value={cierre.patronConfirmado === null ? "" : cierre.patronConfirmado ? "si" : "no"}
                  onChange={(e) =>
                    setCierre(escenario.id, {
                      patronConfirmado: e.target.value === "" ? null : e.target.value === "si",
                    })
                  }
                >
                  <option value="">— sin veredicto todavía —</option>
                  <option value="si">Sí, se repitió</option>
                  <option value="no">No, esta vez fue distinto</option>
                </select>
              </Campo>
              <Campo label="Fecha del resultado">
                <input
                  type="date"
                  className="cua-input"
                  value={cierre.fechaResultado}
                  onChange={(e) => setCierre(escenario.id, { fechaResultado: e.target.value })}
                />
              </Campo>
            </div>

            {escenario.estado !== "cerrado" && (
              <button
                className="cua-btn-primary mt-4"
                onClick={() => setEstado(escenario.id, "cerrado")}
                disabled={!cierre.resultado.trim()}
                title={
                  cierre.resultado.trim()
                    ? undefined
                    : "Un escenario no se cierra sin resultado registrado: ese es el punto del Libro Rojo."
                }
              >
                Cerrar escenario
              </button>
            )}
            {escenario.estado !== "cerrado" && !cierre.resultado.trim() && (
              <p className="cua-faint mt-2 text-[12px]">
                Para cerrar hace falta el resultado. Un escenario cerrado sin aprendizaje registrado no le sirve al
                siguiente.
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

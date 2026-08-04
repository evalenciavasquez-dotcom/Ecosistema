"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { CUARTEL_CATEGORIA_LABEL, CuartelCategoria } from "@/lib/cuartel/types";
import { Campo } from "./primitives";

const CATEGORIAS = Object.keys(CUARTEL_CATEGORIA_LABEL) as CuartelCategoria[];

export default function NuevoEscenarioModal({ onCerrar }: { onCerrar: () => void }) {
  const crearEscenario = useCuartelStore((s) => s.crearEscenario);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CuartelCategoria>("relacion");
  const [contextoActual, setContextoActual] = useState("");
  const [tensionReal, setTensionReal] = useState("");
  const [patronRepetido, setPatronRepetido] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  function crear() {
    if (!nombre.trim()) return;
    crearEscenario({ nombre, categoria, contextoActual, patronRepetido, tensionReal, fechaLimite });
    onCerrar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,9,6,.7)" }}
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-[480px] max-w-[90vw] overflow-y-auto rounded p-7"
        style={{ background: "var(--cua-surface)", border: "1px solid var(--cua-border-strong)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cua-serif mb-[18px] text-[19px] font-semibold">Nuevo escenario</div>

        <div className="space-y-3.5">
          <Campo label="Nombre">
            <input
              className="cua-input"
              autoFocus
              placeholder="Ej: Volver a estudiar"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>

          <Campo label="Categoría">
            <select
              className="cua-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CuartelCategoria)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CUARTEL_CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Contexto actual">
            <textarea
              className="cua-textarea"
              rows={2}
              value={contextoActual}
              onChange={(e) => setContextoActual(e.target.value)}
            />
          </Campo>

          <Campo
            label="Tensión real (lo que no cuadra)"
            ayuda="“No me interesa por X, pero no lo suelto por Y”. Sin esto el análisis sale decorativo."
          >
            <textarea
              className="cua-textarea"
              rows={2}
              value={tensionReal}
              onChange={(e) => setTensionReal(e.target.value)}
            />
          </Campo>

          <Campo
            label="Patrón que se repite (opcional)"
            ayuda="Si esto ya pasó antes, acá. Es lo que después confirma o refuta el Libro Rojo."
          >
            <textarea
              className="cua-textarea"
              rows={2}
              value={patronRepetido}
              onChange={(e) => setPatronRepetido(e.target.value)}
            />
          </Campo>

          <Campo label="Fecha límite (opcional)">
            <input type="date" className="cua-input" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} />
          </Campo>
        </div>

        <div className="cua-mono mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          Al crearlo nacen sus tres rutas: Cortar, Sostener y Rediseñar.
        </div>

        <div className="mt-5 flex justify-end gap-2.5">
          <button className="cua-btn-ghost" style={{ border: "none" }} onClick={onCerrar}>
            Cancelar
          </button>
          <button className="cua-btn-primary" onClick={crear} disabled={!nombre.trim()}>
            Crear escenario
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { fetchAnalisis } from "@/lib/cuartel/ai-client";
import { calcularVeredicto } from "@/lib/cuartel/candado";
import {
  CUARTEL_CATEGORIA_LABEL,
  CUARTEL_ESTADO_COLOR,
  CUARTEL_ESTADO_LABEL,
  CUARTEL_ESTADO_ORDEN,
  CUARTEL_RUTA_COLOR,
  CUARTEL_RUTA_LABEL,
  CuartelCerteza,
  CuartelEscenario,
  CuartelRutaTipo,
} from "@/lib/cuartel/types";
import { etiquetaRuta } from "@/lib/cuartel/ai-client";
import { Campo, CertezaTag, ErrorNota, Panel, PanelLabel } from "./primitives";
import RutaCard from "./RutaCard";
import CierrePanel from "./CierrePanel";

type Modo = "comparativa" | "una";

export default function EscenarioDetalle({
  escenario,
  onAbrirInstructor,
}: {
  escenario: CuartelEscenario;
  onAbrirInstructor: (escenarioId: string, rutaId: string) => void;
}) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const actualizarEscenario = useCuartelStore((s) => s.actualizarEscenario);
  const eliminarEscenario = useCuartelStore((s) => s.eliminarEscenario);
  const setEstado = useCuartelStore((s) => s.setEstado);
  const agregarRuta = useCuartelStore((s) => s.agregarRuta);
  const aplicarAnalisis = useCuartelStore((s) => s.aplicarAnalisis);
  const showToast = useCuartelStore((s) => s.showToast);

  const [modo, setModo] = useState<Modo>("comparativa");
  const [rutaActivaId, setRutaActivaId] = useState<string | null>(null);
  const [editandoContexto, setEditandoContexto] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectura, setLectura] = useState<string | null>(null);

  const rutaActiva = escenario.rutas.find((r) => r.id === rutaActivaId) ?? escenario.rutas[0];
  const visibles = modo === "comparativa" ? escenario.rutas : [rutaActiva];

  async function analizar() {
    if (analizando) return;
    setAnalizando(true);
    setError(null);
    try {
      const res = await fetchAnalisis(escenario, escenarios);
      // Se aparea por posición y se verifica el tipo: si el modelo devolvió
      // otra cosa, esa entrada se ignora en vez de escribir el análisis en la
      // ruta equivocada.
      escenario.rutas.forEach((ruta, i) => {
        const propuesta = res.rutas[i];
        if (!propuesta || propuesta.tipo !== ruta.tipo) return;
        aplicarAnalisis(escenario.id, ruta.id, {
          sombreros: propuesta.sombreros,
          semaforo: propuesta.semaforo,
          legal: propuesta.legal,
          certezaRiesgos: propuesta.certezaRiesgos,
        });
      });
      setLectura(res.lecturaGeneral);
      if (escenario.estado === "activo") setEstado(escenario.id, "analisis");
      showToast("Análisis cargado. Lo que ya habías escrito no se tocó.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el escenario");
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div>
      <Panel className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="cua-mono text-[11px]" style={{ color: "var(--cua-muted)" }}>
            {CUARTEL_CATEGORIA_LABEL[escenario.categoria]}
          </span>
          <button
            className="cua-mono rounded-sm px-2.5 py-[3px] text-[10px] uppercase tracking-[0.05em]"
            style={{ background: CUARTEL_ESTADO_COLOR[escenario.estado], color: "#17140f" }}
            title="Tocar para avanzar de estado"
            onClick={() => {
              const i = CUARTEL_ESTADO_ORDEN.indexOf(escenario.estado);
              setEstado(escenario.id, CUARTEL_ESTADO_ORDEN[(i + 1) % CUARTEL_ESTADO_ORDEN.length]);
            }}
          >
            {CUARTEL_ESTADO_LABEL[escenario.estado]}
          </button>
          <span className="cua-mono ml-auto text-[11px]" style={{ color: "var(--cua-faint)" }}>
            {escenario.fechaLimite ? `Fecha límite: ${escenario.fechaLimite}` : "Sin fecha límite"}
          </span>
          <button
            className="cua-mono text-[11px] uppercase tracking-[0.05em]"
            style={{ color: "var(--cua-accent)" }}
            onClick={() => setEditandoContexto((v) => !v)}
          >
            {editandoContexto ? "Listo" : "Editar"}
          </button>
        </div>

        {editandoContexto ? (
          <div className="space-y-3.5">
            <Campo label="Nombre">
              <input
                className="cua-input"
                value={escenario.nombre}
                onChange={(e) => actualizarEscenario(escenario.id, { nombre: e.target.value })}
              />
            </Campo>
            <Campo label="Contexto actual">
              <textarea
                className="cua-textarea"
                rows={3}
                value={escenario.contextoActual}
                onChange={(e) => actualizarEscenario(escenario.id, { contextoActual: e.target.value })}
              />
            </Campo>
            <Campo label="Tensión real">
              <textarea
                className="cua-textarea"
                rows={2}
                value={escenario.tensionReal}
                onChange={(e) => actualizarEscenario(escenario.id, { tensionReal: e.target.value })}
              />
            </Campo>
            <Campo label="Patrón que se repite">
              <textarea
                className="cua-textarea"
                rows={2}
                value={escenario.patronRepetido}
                onChange={(e) => actualizarEscenario(escenario.id, { patronRepetido: e.target.value })}
              />
            </Campo>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Campo label="Quién afirma el patrón">
                <select
                  className="cua-select"
                  value={escenario.certezaPatron}
                  onChange={(e) =>
                    actualizarEscenario(escenario.id, { certezaPatron: e.target.value as CuartelCerteza })
                  }
                >
                  {(["hecho", "reportado", "interpretacion", "hipotesis"] as CuartelCerteza[]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Fecha límite">
                <input
                  type="date"
                  className="cua-input"
                  value={escenario.fechaLimite}
                  onChange={(e) => actualizarEscenario(escenario.id, { fechaLimite: e.target.value })}
                />
              </Campo>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3.5 text-[14px] leading-[1.6]" style={{ color: "var(--cua-text-2)" }}>
              {escenario.contextoActual || "Sin contexto cargado."}
            </div>

            {escenario.tensionReal && (
              <div className="cua-quote">
                <div
                  className="cua-serif text-[15.5px] italic leading-[1.5]"
                  style={{ color: "var(--cua-accent-light)" }}
                >
                  “{escenario.tensionReal}”
                </div>
              </div>
            )}

            {escenario.patronRepetido && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="cua-mono text-[11.5px]" style={{ color: "var(--cua-faint)" }}>
                  Patrón: {escenario.patronRepetido}
                </span>
                <CertezaTag certeza={escenario.certezaPatron} />
              </div>
            )}
          </>
        )}
      </Panel>

      <div className="mb-4">
        <button className="cua-btn-primary" onClick={analizar} disabled={analizando}>
          {analizando ? "Analizando…" : "Analizar rutas con el sistema"}
        </button>
        <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          Corre los 6 sombreros y el semáforo sobre cada ruta. Solo llena lo vacío: lo que escribiste vos no se pisa, y
          ni la validez ni El Instructor se generan solos.
        </p>
        {error && <ErrorNota>{error}</ErrorNota>}
        {lectura && (
          <div className="cua-quote mt-3">
            <div className="cua-label mb-1.5">Lectura general</div>
            <p className="text-[13.5px] leading-relaxed">{lectura}</p>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ["comparativa", "Comparativa"],
          ["una", "Una ruta"],
        ] as [Modo, string][]).map(([key, label]) => {
          const activo = modo === key;
          return (
            <button
              key={key}
              onClick={() => setModo(key)}
              className="cua-mono rounded-sm border px-4 py-2 text-[12px] uppercase tracking-[0.04em]"
              style={{
                borderColor: activo ? "var(--cua-accent)" : "var(--cua-border-strong)",
                color: activo ? "var(--cua-accent)" : "var(--cua-muted)",
                background: activo ? "var(--cua-active)" : "transparent",
              }}
            >
              {label}
            </button>
          );
        })}
        <span className="cua-mono self-center text-[11px]" style={{ color: "var(--cua-faint)" }}>
          {modo === "comparativa" ? "las rutas una al lado de la otra" : "una ruta a la vez, editable"}
        </span>
      </div>

      {modo === "una" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {escenario.rutas.map((r) => {
            const activo = r.id === rutaActiva?.id;
            return (
              <button
                key={r.id}
                onClick={() => setRutaActivaId(r.id)}
                className="cua-mono rounded-sm border px-[18px] py-2 text-[12px] uppercase tracking-[0.04em]"
                style={{
                  borderColor: activo ? "var(--cua-accent)" : "var(--cua-border-strong)",
                  color: activo ? "var(--cua-accent)" : "var(--cua-muted)",
                  background: activo ? "var(--cua-active)" : "transparent",
                }}
              >
                {etiquetaRuta(r)}
              </button>
            );
          })}
        </div>
      )}

      <div className={modo === "comparativa" ? "flex flex-wrap gap-3.5" : "flex max-w-[640px]"}>
        {visibles.map(
          (r) =>
            r && (
              <RutaCard
                key={r.id}
                escenario={escenario}
                ruta={r}
                editable={modo === "una"}
                onAbrirInstructor={() => onAbrirInstructor(escenario.id, r.id)}
              />
            )
        )}
      </div>

      <Panel className="mt-5">
        <PanelLabel>Agregar otra ruta</PanelLabel>
        <p className="mb-3 text-[13px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
          Las tres base son el piso, no el techo. El sistema no deja bajar de tres.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["cortar", "sostener", "rediseñar", "otra"] as CuartelRutaTipo[]).map((tipo) => (
            <button
              key={tipo}
              className="cua-btn-ghost"
              style={{ color: CUARTEL_RUTA_COLOR[tipo] }}
              onClick={() => {
                const id = agregarRuta(
                  escenario.id,
                  tipo,
                  tipo === "otra" ? window.prompt("Nombre de la ruta") || "Otra ruta" : ""
                );
                setModo("una");
                setRutaActivaId(id);
              }}
            >
              + {CUARTEL_RUTA_LABEL[tipo]}
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-5">
        <CierrePanel escenario={escenario} />
      </div>

      <button
        className="cua-mono mt-6 text-[10.5px] uppercase tracking-[0.05em]"
        style={{ color: "var(--cua-faint)" }}
        onClick={() => {
          if (
            window.confirm(
              `Se borra “${escenario.nombre}” con sus ${escenario.rutas.length} rutas, sus preguntas y su resultado. No se puede deshacer.`
            )
          ) {
            eliminarEscenario(escenario.id);
          }
        }}
      >
        Eliminar escenario
      </button>

      <ResumenValidez escenario={escenario} />
    </div>
  );
}

// Un recordatorio corto de dónde está parado el escenario, al pie del detalle.
function ResumenValidez({ escenario }: { escenario: CuartelEscenario }) {
  const veredictos = escenario.rutas.map(calcularVeredicto);
  const validas = veredictos.filter((v) => v.validez === "valida").length;
  const descartadas = veredictos.filter((v) => v.validez === "descartada").length;

  return (
    <div className="cua-mono mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--cua-faint)" }}>
      <span style={{ color: validas >= 2 ? "var(--cua-verde)" : "var(--cua-faint)" }}>{validas} válidas</span>
      <span>{veredictos.length - validas - descartadas} pendientes</span>
      <span style={{ color: descartadas ? "var(--cua-rojo)" : "var(--cua-faint)" }}>{descartadas} descartadas</span>
    </div>
  );
}

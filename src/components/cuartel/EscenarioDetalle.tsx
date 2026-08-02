"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { fetchAnalisis } from "@/lib/cuartel/ai-client";
import { resumirEscenario } from "@/lib/cuartel/candado";
import {
  CUARTEL_CATEGORIA_LABEL,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_ESTADO_LABEL,
  CUARTEL_ESTADO_ORDEN,
  CUARTEL_RUTA_LABEL,
  CuartelCerteza,
  CuartelEscenario,
  CuartelRutaTipo,
} from "@/lib/cuartel/types";
import { Campo, CertezaTag, ErrorNota, Panel, PanelLabel } from "./primitives";
import RutaCard from "./RutaCard";
import ComparacionPanel from "./ComparacionPanel";
import CierrePanel from "./CierrePanel";

const CERTEZAS = Object.keys(CUARTEL_CERTEZA_LABEL) as CuartelCerteza[];

export default function EscenarioDetalle({ escenario }: { escenario: CuartelEscenario }) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);
  const actualizarEscenario = useCuartelStore((s) => s.actualizarEscenario);
  const eliminarEscenario = useCuartelStore((s) => s.eliminarEscenario);
  const setEstado = useCuartelStore((s) => s.setEstado);
  const agregarRuta = useCuartelStore((s) => s.agregarRuta);
  const aplicarAnalisis = useCuartelStore((s) => s.aplicarAnalisis);
  const showToast = useCuartelStore((s) => s.showToast);

  const [editando, setEditando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lectura, setLectura] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [nuevaRutaNombre, setNuevaRutaNombre] = useState("");

  const resumen = resumirEscenario(escenario);

  async function analizar() {
    if (analizando) return;
    setAnalizando(true);
    setError(null);
    try {
      const res = await fetchAnalisis(escenario, escenarios);
      // La respuesta viene ordenada como se pidieron las rutas. Se aparea por
      // posición y se verifica el tipo: si el modelo devolvió otra cosa, esa
      // entrada se ignora en vez de escribir el análisis en la ruta equivocada.
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
    <>
      <button className="cua-mono mb-5 text-[11px] uppercase tracking-wider" style={{ color: "var(--cua-faint)" }} onClick={() => abrirEscenario(null)}>
        ← Todos los escenarios
      </button>

      <div className="mb-6">
        <div className="cua-eyebrow mb-2.5">{CUARTEL_CATEGORIA_LABEL[escenario.categoria]}</div>
        <h1 className="cua-serif text-3xl font-medium leading-tight md:text-4xl">{escenario.nombre}</h1>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {CUARTEL_ESTADO_ORDEN.map((estado) => {
            const activo = escenario.estado === estado;
            return (
              <button
                key={estado}
                onClick={() => setEstado(escenario.id, estado)}
                className="cua-mono rounded-sm border px-2.5 py-1 text-[10.5px] uppercase tracking-wider"
                style={{
                  borderColor: activo ? "var(--cua-accent)" : "var(--cua-border-strong)",
                  background: activo ? "var(--cua-accent-soft)" : "transparent",
                  color: activo ? "var(--cua-accent)" : "var(--cua-faint)",
                }}
              >
                {CUARTEL_ESTADO_LABEL[estado]}
              </button>
            );
          })}
        </div>

        <div className="cua-mono mt-3 flex flex-wrap gap-3 text-[11px]">
          <span style={{ color: "#5cc98e" }}>{resumen.validas} válidas</span>
          <span style={{ color: "var(--cua-muted)" }}>{resumen.pendientes} pendientes</span>
          <span style={{ color: "#e0483a" }}>{resumen.descartadas} descartadas por candado</span>
          {resumen.diasParaLimite !== null && (
            <span style={{ color: resumen.diasParaLimite < 0 ? "#e0483a" : "var(--cua-faint)" }}>
              {resumen.diasParaLimite < 0
                ? `límite vencido hace ${Math.abs(resumen.diasParaLimite)}d`
                : `límite en ${resumen.diasParaLimite}d`}
            </span>
          )}
        </div>
      </div>

      <Panel className="mb-5">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <span className="cua-label">Contexto y tensión real</span>
          <button className="cua-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--cua-accent)" }} onClick={() => setEditando((v) => !v)}>
            {editando ? "Listo" : "Editar"}
          </button>
        </div>

        {editando ? (
          <div className="space-y-4">
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
                rows={4}
                value={escenario.contextoActual}
                onChange={(e) => actualizarEscenario(escenario.id, { contextoActual: e.target.value })}
              />
            </Campo>
            <Campo label="Tensión real">
              <textarea
                className="cua-textarea"
                rows={3}
                value={escenario.tensionReal}
                onChange={(e) => actualizarEscenario(escenario.id, { tensionReal: e.target.value })}
              />
            </Campo>
            <Campo label="Patrón que se repite">
              <textarea
                className="cua-textarea"
                rows={3}
                value={escenario.patronRepetido}
                onChange={(e) => actualizarEscenario(escenario.id, { patronRepetido: e.target.value })}
              />
            </Campo>
            <div className="grid gap-4 md:grid-cols-2">
              <Campo label="Quién afirma el patrón">
                <select
                  className="cua-select w-full"
                  value={escenario.certezaPatron}
                  onChange={(e) => actualizarEscenario(escenario.id, { certezaPatron: e.target.value as CuartelCerteza })}
                >
                  {CERTEZAS.map((c) => (
                    <option key={c} value={c}>
                      {CUARTEL_CERTEZA_LABEL[c]}
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
          <div className="space-y-4 text-[13.5px] leading-relaxed">
            <Bloque titulo="Contexto actual" texto={escenario.contextoActual} />
            <Bloque titulo="Tensión real" texto={escenario.tensionReal} />
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="cua-label">Patrón que se repite</span>
                <CertezaTag certeza={escenario.certezaPatron} />
              </div>
              <p className={escenario.patronRepetido ? "" : "cua-faint"}>
                {escenario.patronRepetido || "Sin cargar. Sin patrón nombrado, la métrica de repetición se evalúa a ciegas."}
              </p>
            </div>
          </div>
        )}
      </Panel>

      <div className="mb-5">
        <button className="cua-btn-primary" onClick={analizar} disabled={analizando}>
          {analizando ? "Analizando las rutas…" : "Analizar rutas con el sistema"}
        </button>
        <p className="cua-faint mt-2 text-[12px] leading-relaxed">
          Corre los 6 sombreros y el semáforo sobre cada ruta. Solo llena los campos vacíos: lo que escribiste vos no se
          pisa. La validez y el candado los sigue calculando el sistema, no el análisis.
        </p>
        {error && <ErrorNota>{error}</ErrorNota>}
        {lectura && (
          <div className="cua-accent-card mt-3 p-4">
            <div className="cua-label mb-2">Lectura general</div>
            <p className="text-[13.5px] leading-relaxed">{lectura}</p>
          </div>
        )}
      </div>

      <div className="mb-5 space-y-3">
        {escenario.rutas.map((ruta) => (
          <RutaCard key={ruta.id} escenario={escenario} ruta={ruta} />
        ))}
      </div>

      <Panel className="mb-5">
        <PanelLabel>Agregar otra ruta</PanelLabel>
        <p className="cua-muted mb-3 text-[13px] leading-relaxed">
          Las tres base son el piso, no el techo. Si este escenario tiene una salida propia que no es cortar, sostener ni
          rediseñar, cargala acá.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="cua-input flex-1"
            placeholder="Nombre de la ruta"
            value={nuevaRutaNombre}
            onChange={(e) => setNuevaRutaNombre(e.target.value)}
          />
          <button
            className="cua-btn-ghost"
            disabled={!nuevaRutaNombre.trim()}
            onClick={() => {
              agregarRuta(escenario.id, "otra", nuevaRutaNombre.trim());
              setNuevaRutaNombre("");
            }}
          >
            Agregar
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["cortar", "sostener", "rediseñar"] as CuartelRutaTipo[]).map((tipo) => (
            <button key={tipo} className="cua-btn-ghost" onClick={() => agregarRuta(escenario.id, tipo)}>
              + otra variante de {CUARTEL_RUTA_LABEL[tipo]}
            </button>
          ))}
        </div>
      </Panel>

      <div className="mb-5">
        <ComparacionPanel escenario={escenario} />
      </div>

      <div className="mb-8">
        <CierrePanel escenario={escenario} />
      </div>

      {/* Reversibilidad: un escenario no se borra por accidente ni de un clic. */}
      {confirmandoBorrado ? (
        <div className="cua-card p-4">
          <p className="text-[13px] leading-relaxed" style={{ color: "#e0483a" }}>
            Se borra “{escenario.nombre}” con sus {escenario.rutas.length} rutas, sus preguntas y su resultado. No se
            puede deshacer.
          </p>
          <div className="mt-3 flex gap-2">
            <button className="cua-btn-ghost" onClick={() => eliminarEscenario(escenario.id)}>
              Borrar definitivamente
            </button>
            <button className="cua-btn-ghost" onClick={() => setConfirmandoBorrado(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          className="cua-mono text-[11px] uppercase tracking-wider"
          style={{ color: "var(--cua-dim)" }}
          onClick={() => setConfirmandoBorrado(true)}
        >
          Eliminar escenario
        </button>
      )}
    </>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <div className="cua-label mb-1.5">{titulo}</div>
      <p className={texto ? "" : "cua-faint"}>{texto || "Sin cargar."}</p>
    </div>
  );
}

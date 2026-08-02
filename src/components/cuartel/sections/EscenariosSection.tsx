"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { resumirEscenario } from "@/lib/cuartel/candado";
import {
  CUARTEL_CATEGORIA_LABEL,
  CUARTEL_ESTADO_LABEL,
  CuartelCategoria,
  CuartelEscenario,
} from "@/lib/cuartel/types";
import { Campo, Panel, PanelLabel, SectionHeader } from "../primitives";
import EscenarioDetalle from "../EscenarioDetalle";

const CATEGORIAS = Object.keys(CUARTEL_CATEGORIA_LABEL) as CuartelCategoria[];

export default function EscenariosSection() {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abiertoId = useCuartelStore((s) => s.escenarioAbiertoId);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);

  const abierto = escenarios.find((e) => e.id === abiertoId);
  if (abierto) return <EscenarioDetalle escenario={abierto} />;

  return (
    <>
      <SectionHeader
        eyebrow="Escenarios"
        title="Las situaciones que están sin decidir"
        subtitle="Contá la situación como la vivís. El sistema separa los hechos de la tensión real y arma las tres rutas."
      />

      <NuevoEscenario />

      {escenarios.length === 0 ? (
        <p className="cua-faint mt-6 text-sm">Todavía no hay escenarios cargados.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {escenarios.map((e) => (
            <FilaEscenario key={e.id} escenario={e} onAbrir={() => abrirEscenario(e.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function FilaEscenario({ escenario, onAbrir }: { escenario: CuartelEscenario; onAbrir: () => void }) {
  const resumen = resumirEscenario(escenario);

  return (
    <button onClick={onAbrir} className="cua-card w-full p-4 text-left transition-colors hover:border-white/20">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="cua-serif text-[17px]">{escenario.nombre}</span>
        <span className="cua-mono text-[11px]" style={{ color: "var(--cua-faint)" }}>
          {CUARTEL_ESTADO_LABEL[escenario.estado]}
        </span>
      </div>

      <div className="cua-faint cua-mono mt-1.5 text-[11px]">
        {CUARTEL_CATEGORIA_LABEL[escenario.categoria]}
        {resumen.diasParaLimite !== null && (
          <>
            {" · "}
            <span style={{ color: resumen.diasParaLimite < 0 ? "#e0483a" : "var(--cua-faint)" }}>
              {resumen.diasParaLimite < 0
                ? `límite vencido hace ${Math.abs(resumen.diasParaLimite)}d`
                : `límite en ${resumen.diasParaLimite}d`}
            </span>
          </>
        )}
      </div>

      {escenario.tensionReal && (
        <p className="cua-muted mt-2.5 line-clamp-2 text-[13px] leading-relaxed">{escenario.tensionReal}</p>
      )}

      <div className="cua-mono mt-3 flex flex-wrap gap-3 text-[11px]">
        <span style={{ color: "#5cc98e" }}>{resumen.validas} válidas</span>
        <span style={{ color: "var(--cua-muted)" }}>{resumen.pendientes} pendientes</span>
        <span style={{ color: "#e0483a" }}>{resumen.descartadas} descartadas</span>
      </div>
    </button>
  );
}

function NuevoEscenario() {
  const crearEscenario = useCuartelStore((s) => s.crearEscenario);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CuartelCategoria>("relacion");
  const [contextoActual, setContextoActual] = useState("");
  const [patronRepetido, setPatronRepetido] = useState("");
  const [tensionReal, setTensionReal] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  function crear() {
    if (!nombre.trim()) return;
    crearEscenario({ nombre, categoria, contextoActual, patronRepetido, tensionReal, fechaLimite });
    setNombre("");
    setContextoActual("");
    setPatronRepetido("");
    setTensionReal("");
    setFechaLimite("");
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <button className="cua-btn-primary" onClick={() => setAbierto(true)}>
        Cargar escenario nuevo
      </button>
    );
  }

  return (
    <Panel>
      <PanelLabel>Escenario nuevo</PanelLabel>
      <div className="space-y-4">
        <Campo label="Nombre">
          <input
            className="cua-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Cómo lo llamarías en una frase"
            autoFocus
          />
        </Campo>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo label="Categoría">
            <select
              className="cua-select w-full"
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

          <Campo label="Fecha límite" ayuda="Opcional. Si hay una fecha real después de la cual ya no se puede decidir.">
            <input
              type="date"
              className="cua-input"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />
          </Campo>
        </div>

        <Campo label="Contexto actual" ayuda="Qué está pasando, tal cual lo vivís. Los hechos.">
          <textarea
            className="cua-textarea"
            value={contextoActual}
            onChange={(e) => setContextoActual(e.target.value)}
            rows={4}
          />
        </Campo>

        <Campo
          label="Tensión real"
          ayuda="Lo que no se dice en voz alta: “no me interesa por X, pero no lo suelto por Y”. Sin esto el análisis sale decorativo."
        >
          <textarea
            className="cua-textarea"
            value={tensionReal}
            onChange={(e) => setTensionReal(e.target.value)}
            rows={3}
          />
        </Campo>

        <Campo
          label="Patrón que se repite"
          ayuda="Si esto ya pasó antes —con esta persona o con otra— escribilo acá. Es lo que después confirma o refuta el Libro Rojo."
        >
          <textarea
            className="cua-textarea"
            value={patronRepetido}
            onChange={(e) => setPatronRepetido(e.target.value)}
            rows={3}
          />
        </Campo>

        <p className="cua-faint text-[12px] leading-relaxed">
          Al crearlo nacen sus tres rutas base: Cortar, Sostener y Rediseñar. Se pueden agregar más, pero nunca bajar de
          tres.
        </p>

        <div className="flex gap-2">
          <button className="cua-btn-primary" onClick={crear} disabled={!nombre.trim()}>
            Crear con sus 3 rutas
          </button>
          <button className="cua-btn-ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </div>
      </div>
    </Panel>
  );
}

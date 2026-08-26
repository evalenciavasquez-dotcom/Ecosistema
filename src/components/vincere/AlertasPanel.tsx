"use client";

import {
  VincereAlerta,
  VincereAlertaSeveridad,
  VincereProyecto,
  VINCERE_SECCION_LABEL,
  VINCERE_SEVERIDAD_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import EvidenceTag from "./EvidenceTag";
import { BloqueTintado, type TipoDeBloque } from "./primitives";

const SEVERIDAD_COLOR: Record<VincereAlertaSeveridad, string> = {
  critica: "var(--vin-risk)",
  atencion: "var(--vin-warn)",
  oportunidad: "var(--vin-ok)",
};

// Orden de atención: lo que amenaza primero, la oportunidad al final.
const PESO: Record<VincereAlertaSeveridad, number> = { critica: 0, atencion: 1, oportunidad: 2 };

export function SeveridadTag({ severidad }: { severidad: VincereAlertaSeveridad }) {
  const color = SEVERIDAD_COLOR[severidad];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 vin-t-xs font-medium tracking-wide"
      style={{ color, borderColor: `${color}66` }}
    >
      {VINCERE_SEVERIDAD_LABEL[severidad]}
    </span>
  );
}

// Lo que todos los hallazgos tienen en común.
//
// Este es el arreglo de fondo del panel. Cada fila estampaba su severidad, su
// nivel de evidencia, su sección y su origen — y cuando cinco hallazgos salen
// de la misma lectura, eso son diez fichas idénticas repetidas que compiten
// con el único texto que sí cambia. El resultado se leía como un muro.
//
// Lo repetido sube a la cabecera y se dice una vez. Abajo solo queda lo que
// distingue a un hallazgo de otro.
function loComun<T>(items: VincereAlerta[], get: (a: VincereAlerta) => T): T | null {
  if (items.length === 0) return null;
  const primero = get(items[0]);
  return items.every((a) => get(a) === primero) ? primero : null;
}

export default function AlertasPanel({
  proyecto,
  compacto = false,
}: {
  proyecto: VincereProyecto;
  compacto?: boolean;
}) {
  const descartarAlerta = useVincereStore((s) => s.descartarAlerta);
  const descartarTodas = useVincereStore((s) => s.descartarTodasLasAlertas);
  const setSeccion = useVincereStore((s) => s.setSeccion);

  const alertas = [...(proyecto.alertas ?? [])].sort((a, b) => PESO[a.severidad] - PESO[b.severidad]);
  if (alertas.length === 0) return null;

  const visibles = compacto ? alertas.slice(0, 3) : alertas;

  // Riesgo y oportunidad son dos lecturas distintas del mismo material y
  // pedirlas juntas es parte del desorden: «el ranking cayó 77.719 posiciones»
  // y «la conversión subió 29%, hay que capitalizar» no se atienden con la
  // misma cabeza. Separarlas es lo que hace que cada una se lea.
  const atender = visibles.filter((a) => a.severidad !== "oportunidad");
  const aprovechar = visibles.filter((a) => a.severidad === "oportunidad");

  const origen = loComun(visibles, (a) => a.origen);
  const nivel = loComun(visibles, (a) => a.nivel);

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
          <span className="vin-eyebrow">
            {alertas.length} {alertas.length === 1 ? "hallazgo sin atender" : "hallazgos sin atender"}
          </span>
        </div>
        {!compacto && alertas.length > 1 && (
          <button onClick={() => descartarTodas(proyecto.id)} className="vin-faint vin-t-sm hover:underline">
            Descartar todos
          </button>
        )}
      </div>

      {/* De dónde salen y con cuánto respaldo. Una vez, no cinco. */}
      {(origen || nivel) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {origen && <span className="vin-faint vin-t-sm">{origen}</span>}
          {nivel && <EvidenceTag nivel={nivel} />}
        </div>
      )}

      {/* Cada grupo lleva su propio tinte: rojizo lo que amenaza, verde lo que
          se puede capitalizar. Con dos bloques de color distinto no hace falta
          leer para saber cuál es cuál — que es exactamente lo que no pasaba
          cuando los cinco hallazgos venían en una lista del mismo gris. */}
      <div className="flex flex-col gap-3">
        <Grupo
          titulo="Hay que atender"
          tipo="riesgo"
          alertas={atender}
          proyectoId={proyecto.id}
          onIr={setSeccion}
          onDescartar={descartarAlerta}
          mostrarNivel={nivel === null}
          mostrarOrigen={origen === null}
        />
        <Grupo
          titulo="Se puede aprovechar"
          tipo="accion"
          alertas={aprovechar}
          proyectoId={proyecto.id}
          onIr={setSeccion}
          onDescartar={descartarAlerta}
          mostrarNivel={nivel === null}
          mostrarOrigen={origen === null}
        />
      </div>

      {compacto && alertas.length > visibles.length && (
        <button onClick={() => setSeccion("ingesta")} className="vin-faint mt-4 vin-t-sm hover:underline">
          Ver los {alertas.length} hallazgos →
        </button>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  tipo,
  alertas,
  proyectoId,
  onIr,
  onDescartar,
  mostrarNivel,
  mostrarOrigen,
}: {
  titulo: string;
  tipo: TipoDeBloque;
  alertas: VincereAlerta[];
  proyectoId: string;
  onIr: (s: NonNullable<VincereAlerta["seccion"]>) => void;
  onDescartar: (proyectoId: string, alertaId: string) => void;
  mostrarNivel: boolean;
  mostrarOrigen: boolean;
}) {
  if (alertas.length === 0) return null;
  const filete = `1px solid var(--vin-tinte-${tipo}-linea)`;
  return (
    <BloqueTintado tipo={tipo} className="!p-4">
      <div className="vin-block-title mb-2" style={{ borderBottomColor: "currentColor", opacity: 0.9 }}>
        <span>{titulo}</span>
        <span className="tabular-nums">{alertas.length}</span>
      </div>
      <ol className="flex flex-col">
        {alertas.map((a, i) => (
          <li
            key={a.id}
            className="flex items-start gap-3 py-3"
            style={{ borderTop: i === 0 ? "none" : filete }}
          >
            {/* El número hace que un hallazgo se pueda nombrar en voz alta —
                «el 3»— en vez de tener que releerlo para señalarlo. */}
            <span
              className="mt-0.5 shrink-0 tabular-nums vin-t-sm"
              style={{ color: SEVERIDAD_COLOR[a.severidad], minWidth: "1.1rem" }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
                {a.texto}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {a.seccion && (
                  <button
                    onClick={() => onIr(a.seccion!)}
                    className="vin-t-sm hover:underline"
                    style={{ color: "var(--vin-accent)", textUnderlineOffset: "3px" }}
                  >
                    Trabajarlo en {VINCERE_SECCION_LABEL[a.seccion]} →
                  </button>
                )}
                {/* Solo cuando NO es igual en todos: si lo fuera ya está dicho
                    arriba, y repetirlo es exactamente lo que hacía ruido. */}
                {mostrarNivel && <EvidenceTag nivel={a.nivel} />}
                {mostrarOrigen && <span className="vin-faint vin-t-sm">{a.origen}</span>}
              </div>
            </div>
            <button
              onClick={() => onDescartar(proyectoId, a.id)}
              className="vin-faint shrink-0 px-1 vin-t-sm hover:underline"
              title="Descartar este hallazgo"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
    </BloqueTintado>
  );
}

"use client";

import { useState } from "react";
import { VincereInsight, VincereSeccion } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { useIaConfigurada } from "@/lib/vincere/useIaConfigurada";
import EvidenceTag from "./EvidenceTag";

interface Props {
  title: string;
  insights: VincereInsight[];
  onGenerate: () => Promise<void>;
  emptyHint?: string;
  // Con estos dos, cada lectura se puede convertir en predicción falsable. Son
  // opcionales para no romper usos donde no aplique.
  proyectoId?: string;
  seccion?: VincereSeccion;
}

// Cuánto plazo se le da por defecto a una lectura convertida en predicción.
// Treinta días es lo que tarda en moverse un dato de audiencia y en refrescarse
// una carga de Chartmetric: menos que eso y se cierra sobre ruido.
const DIAS_POR_DEFECTO = 30;

function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Convertir una lectura en predicción.
//
// Esto es lo que cierra el circuito de la calibración. Antes, TODAS las
// predicciones las escribía Eduardo a mano —incluido el nivel—, así que la
// tabla que decía auditar «si los niveles de evidencia significan algo» estaba
// auditando su criterio y no el del sistema. Acá el nivel viaja tal como lo
// emitió el modelo, sin que nadie lo pueda ajustar de camino: es la única forma
// de que el marcador después signifique algo.
function APrediccion({
  insight,
  proyectoId,
  seccion,
}: {
  insight: VincereInsight;
  proyectoId: string;
  seccion: VincereSeccion;
}) {
  const addPrediccion = useVincereStore((s) => s.addPrediccion);
  const proyectos = useVincereStore((s) => s.proyectos);
  const [abierto, setAbierto] = useState(false);
  const [como, setComo] = useState("");
  const [vence, setVence] = useState(enDias(DIAS_POR_DEFECTO));

  const proyecto = proyectos.find((p) => p.id === proyectoId);
  const yaEs = (proyecto?.predicciones ?? []).some((p) => p.afirmacion === insight.texto);

  if (yaEs) {
    return <span className="vin-faint vin-t-xs">ya está en el marcador</span>;
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="vin-faint vin-t-xs hover:underline">
        → convertir en predicción
      </button>
    );
  }

  return (
    <div
      className="mt-1 w-full rounded-[--r-md] p-4"
      style={{ border: "1px solid var(--vin-border)", background: "var(--vin-surface-2)" }}
    >
      <p className="vin-faint vin-t-sm mb-3 leading-relaxed">
        Entra al marcador con nivel {insight.nivel}, el que le puso el modelo. No se puede cambiar acá: si el nivel se
        edita de camino, el marcador deja de medir al sistema y pasa a medirte a vos.
      </p>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="vin-faint vin-t-sm">Qué habría que observar para decir que falló</span>
          <input
            className="vin-input"
            value={como}
            onChange={(e) => setComo(e.target.value)}
            placeholder="Sin esto no es una predicción, es una opinión con fecha."
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="vin-faint vin-t-sm">Se revisa el</span>
          <input type="date" className="vin-input" value={vence} onChange={(e) => setVence(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            className="vin-btn-primary"
            disabled={!como.trim() || !vence}
            onClick={() => {
              addPrediccion(proyectoId, {
                motor: seccion,
                origen: "ia",
                afirmacion: insight.texto,
                comoSeVerifica: como.trim(),
                venceEn: vence,
                nivelAlEmitir: insight.nivel,
              });
              setAbierto(false);
            }}
          >
            Ponerla en el marcador
          </button>
          <button onClick={() => setAbierto(false)} className="vin-faint vin-t-sm hover:underline">
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIInsights({ title, insights, onGenerate, emptyHint, proyectoId, seccion }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ia = useIaConfigurada();
  const sinLlave = ia !== null && !ia.configurada;

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la lectura");
    } finally {
      setLoading(false);
    }
  }

  const has = insights.length > 0;

  return (
    <div className="vin-accent-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
          <span className="vin-eyebrow">{title}</span>
        </div>
        {/* Sin llave el botón no se esconde: se apaga. Esconderlo dejaría la
            pantalla sin explicación de por qué no está lo que debería estar. */}
        <button
          onClick={handleGenerate}
          disabled={loading || sinLlave}
          className="vin-btn-ghost whitespace-nowrap !py-1.5 vin-t-sm"
          style={sinLlave ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
          title={sinLlave ? "Falta configurar la llave de la IA" : undefined}
        >
          {loading ? "Interpretando…" : has ? "Actualizar lectura" : "Generar lectura VINCERE"}
        </button>
      </div>

      {/* Antes de apretar, no después. Es el mismo aviso en todas las secciones
          porque la causa es una sola. */}
      {sinLlave && (
        <div
          className="mb-3 rounded-xl px-3.5 py-2.5"
          style={{
            maxWidth: "70ch",
            color: "var(--vin-warn)",
            background: "rgba(229,169,60,0.09)",
            border: "1px solid rgba(229,169,60,0.24)",
          }}
        >
          <p className="vin-t-sm leading-relaxed">
            Falta <code>ANTHROPIC_API_KEY</code>. Los indicadores que el sistema calcula siguen funcionando — lo que no
            se puede es redactar la lectura.
          </p>
          <p className="vin-t-sm mt-1.5 leading-relaxed" style={{ opacity: 0.85 }}>
            {ia.comoSeArregla}
          </p>
        </div>
      )}

      {error && (
        <p className="mb-3 vin-t-sm leading-relaxed" style={{ maxWidth: "70ch", color: "var(--vin-risk)" }}>
          {error}
        </p>
      )}

      {/* Esta lista es el producto: lo que distingue la plataforma de un
          tablero. Se lee al tamaño del cuerpo, no al de una nota al pie. */}
      {has ? (
        <ul className="flex flex-col gap-5">
          {insights.map((ins) => (
            <li key={ins.id} className="flex flex-col items-start gap-2">
              <p className="vin-t-base leading-relaxed" style={{ maxWidth: "70ch" }}>
                {ins.texto}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <EvidenceTag nivel={ins.nivel} />
                {proyectoId && seccion && (
                  <APrediccion insight={ins} proyectoId={proyectoId} seccion={seccion} />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !loading && (
          <p className="vin-muted vin-t-sm">
            {emptyHint ?? "Aún no hay lectura de IA para esta sección. Genérala para interpretar la data cargada."}
          </p>
        )
      )}
    </div>
  );
}

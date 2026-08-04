"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import { calcularVeredicto, diasHasta } from "@/lib/cuartel/candado";
import {
  CUARTEL_CATEGORIA_LABEL,
  CUARTEL_ESTADO_COLOR,
  CUARTEL_ESTADO_LABEL,
  CuartelEscenario,
} from "@/lib/cuartel/types";
import EscenarioDetalle from "../EscenarioDetalle";

export default function EscenariosSection({
  onNuevoEscenario,
  onAbrirInstructor,
}: {
  onNuevoEscenario: () => void;
  onAbrirInstructor: (escenarioId: string, rutaId: string) => void;
}) {
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abiertoId = useCuartelStore((s) => s.escenarioAbiertoId);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);

  const abierto = escenarios.find((e) => e.id === abiertoId);
  if (abierto) return <EscenarioDetalle escenario={abierto} onAbrirInstructor={onAbrirInstructor} />;

  const abiertos = escenarios.filter((e) => e.estado !== "cerrado");

  if (abiertos.length === 0) {
    return (
      <div className="cua-card p-[22px]">
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
          No hay escenarios abiertos. Los cerrados viven en el Historial.
        </p>
        <button className="cua-btn-primary mt-4" onClick={onNuevoEscenario}>
          + Nuevo escenario
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
      {abiertos.map((e) => (
        <TarjetaEscenario key={e.id} escenario={e} onAbrir={() => abrirEscenario(e.id)} />
      ))}
    </div>
  );
}

function TarjetaEscenario({ escenario, onAbrir }: { escenario: CuartelEscenario; onAbrir: () => void }) {
  const descartadas = escenario.rutas.filter((r) => calcularVeredicto(r).validez === "descartada").length;
  const dias = diasHasta(escenario.fechaLimite);

  return (
    <button onClick={onAbrir} className="cua-card p-[18px] text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="cua-serif text-[17px] font-semibold leading-tight">{escenario.nombre}</div>
        <span
          className="cua-mono shrink-0 whitespace-nowrap rounded-sm px-2 py-[3px] text-[10px] uppercase tracking-[0.05em]"
          style={{ background: CUARTEL_ESTADO_COLOR[escenario.estado], color: "#17140f" }}
        >
          {CUARTEL_ESTADO_LABEL[escenario.estado]}
        </span>
      </div>

      <div className="cua-mono mt-2 text-[11px]" style={{ color: "var(--cua-muted)" }}>
        {CUARTEL_CATEGORIA_LABEL[escenario.categoria]}
      </div>

      <div className="mt-2.5 text-[12.5px]" style={{ color: "var(--cua-faint)" }}>
        {dias === null
          ? "Sin fecha límite"
          : dias < 0
            ? `Límite vencido hace ${Math.abs(dias)} días`
            : `Fecha límite · ${dias} días`}
      </div>

      {descartadas > 0 && (
        <div
          className="cua-mono mt-2.5 pt-2.5 text-[11px]"
          style={{ color: "var(--cua-rojo)", borderTop: "1px solid var(--cua-border-soft)" }}
        >
          Candado: {descartadas} ruta{descartadas > 1 ? "s" : ""} descartada{descartadas > 1 ? "s" : ""}
        </div>
      )}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useCuartelStore } from "@/lib/cuartel/store";
import { CUARTEL_SECCION_LABEL } from "@/lib/cuartel/types";

export default function CuartelHeader({ onNuevoEscenario }: { onNuevoEscenario: () => void }) {
  const seccion = useCuartelStore((s) => s.seccion);
  const escenarios = useCuartelStore((s) => s.escenarios);
  const abiertoId = useCuartelStore((s) => s.escenarioAbiertoId);
  const abrirEscenario = useCuartelStore((s) => s.abrirEscenario);

  const abierto = escenarios.find((e) => e.id === abiertoId);
  const enDetalle = seccion === "escenarios" && !!abierto;
  const titulo = enDetalle ? abierto.nombre : CUARTEL_SECCION_LABEL[seccion];

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5"
      style={{ borderBottom: "1px solid var(--cua-border-soft)" }}
    >
      <div className="flex min-w-0 items-baseline gap-3">
        {enDetalle && (
          <button
            className="cua-mono shrink-0 text-[11px] uppercase tracking-[0.05em]"
            style={{ color: "var(--cua-muted)" }}
            onClick={() => abrirEscenario(null)}
          >
            ←
          </button>
        )}
        <div className="cua-serif truncate text-[22px] font-semibold">{titulo}</div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {seccion === "escenarios" && !enDetalle && (
          <button className="cua-btn-primary" onClick={onNuevoEscenario}>
            + Nuevo escenario
          </button>
        )}
        <Link href="/" className="cua-mono text-[11px]" style={{ color: "var(--cua-faint)" }}>
          Panel
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VINCERE_SECCION_LABEL } from "@/lib/vincere/types";
import { registerNotion } from "@/lib/vincere/ai-client";

export default function VincereHeader() {
  const proyectos = useVincereStore((s) => s.proyectos);
  const selectedId = useVincereStore((s) => s.selectedProyectoId);
  const compareId = useVincereStore((s) => s.compareProyectoId);
  const compareOn = useVincereStore((s) => s.compareOn);
  const seccion = useVincereStore((s) => s.seccion);
  const selectProyecto = useVincereStore((s) => s.selectProyecto);
  const toggleCompare = useVincereStore((s) => s.toggleCompare);
  const showToast = useVincereStore((s) => s.showToast);

  const [registering, setRegistering] = useState(false);

  const propios = proyectos.filter((p) => p.tipo === "propio");
  const selected = proyectos.find((p) => p.id === selectedId);
  const compareTarget = proyectos.find((p) => p.id === compareId);

  async function handleRegister() {
    if (registering || !selected) return;
    setRegistering(true);
    const label = compareOn && compareTarget ? `Comparación · ${selected.nombre} vs ${compareTarget.nombre}` : VINCERE_SECCION_LABEL[seccion];
    const result = await registerNotion({
      proyecto: selected.nombre,
      seccion: compareOn ? "Comparación" : VINCERE_SECCION_LABEL[seccion],
      titulo: `${selected.nombre} — ${label}`,
      detalle: `Registro desde VINCERE Intelligence Platform · ${new Date().toLocaleString("es")}`,
    });
    setRegistering(false);
    if (result.status === "ok") showToast(`Registrado en Notion: ${label}`);
    else if (result.status === "not_configured") showToast("Notion no está configurado — configúralo para archivar el histórico");
    else showToast(`No se pudo registrar en Notion: ${result.error}`);
  }

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-10"
      style={{ borderBottom: "1px solid var(--vin-border)" }}
    >
      <div className="flex items-baseline gap-3.5">
        <span className="vin-serif text-[22px] tracking-tight">VINCERE</span>
        <span className="vin-faint text-[11px] uppercase tracking-[0.14em]">Intelligence Platform</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <select
          className="vin-select"
          value={selectedId}
          onChange={(e) => selectProyecto(e.target.value)}
          aria-label="Proyecto"
        >
          {propios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={toggleCompare}
          className={compareOn ? "vin-btn-primary" : "vin-btn-ghost"}
          disabled={!compareTarget}
          title={compareTarget ? `Comparar con ${compareTarget.nombre}` : "No hay referencia cargada para comparar"}
        >
          {compareTarget ? `Comparar con ${compareTarget.nombre}` : "Comparar"}
        </button>

        <button onClick={handleRegister} disabled={registering} className="vin-btn-ghost">
          {registering ? "Registrando…" : "Registrar en Notion"}
        </button>

        <Link href="/" className="vin-faint px-2 text-xs hover:underline" title="Volver a C.C.O. E.V.">
          ← C.C.O.
        </Link>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VINCERE_SECCION_LABEL } from "@/lib/vincere/types";
import { registerNotion } from "@/lib/vincere/ai-client";
import ProyectoManager from "./ProyectoManager";
import { useVincereSync } from "./VincereHydration";

const SYNC_TEXTO: Record<string, { label: string; color: string; title: string }> = {
  sincronizado: {
    label: "Guardado",
    color: "#5cc98e",
    title: "La data se está guardando en la base: la misma información en cualquier dispositivo",
  },
  local: {
    label: "Solo este dispositivo",
    color: "#e0a83a",
    title: "Sin base de datos configurada: la data vive en el navegador de este dispositivo",
  },
  error: {
    label: "Sin guardar",
    color: "#e0483a",
    title: "No se pudo guardar en la base. La copia del navegador sigue intacta y se reintenta al próximo cambio",
  },
  desconocido: { label: "Conectando…", color: "#6f6a61", title: "Comprobando dónde se guarda la data" },
};

function SyncIndicator() {
  const estado = useVincereSync();
  const info = SYNC_TEXTO[estado] ?? SYNC_TEXTO.desconocido;
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: info.color }} title={info.title}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
      {info.label}
    </span>
  );
}

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
  const [gestionAbierta, setGestionAbierta] = useState(false);

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
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <span className="vin-serif text-[22px] tracking-tight">VINCERE</span>
        <span className="vin-faint text-[11px] uppercase tracking-[0.14em]">Intelligence Platform</span>
        <SyncIndicator />
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

        <button onClick={() => setGestionAbierta(true)} className="vin-btn-ghost" title="Crear, renombrar o eliminar proyectos">
          + Proyecto
        </button>

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

      {gestionAbierta && <ProyectoManager onClose={() => setGestionAbierta(false)} />}
    </header>
  );
}

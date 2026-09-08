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
    color: "var(--vin-ok)",
    title: "La data se está guardando en la base: la misma información en cualquier dispositivo",
  },
  local: {
    label: "Solo este dispositivo",
    color: "var(--vin-warn)",
    title: "Sin base de datos configurada: la data vive en el navegador de este dispositivo",
  },
  error: {
    label: "Sin guardar",
    color: "var(--vin-risk)",
    title: "No se pudo guardar en la base. La copia del navegador sigue intacta y se reintenta al próximo cambio",
  },
  desconocido: { label: "Conectando…", color: "var(--vin-dim)", title: "Comprobando dónde se guarda la data" },
};

function SyncIndicator() {
  const estado = useVincereSync();
  const info = SYNC_TEXTO[estado] ?? SYNC_TEXTO.desconocido;
  return (
    <span className="flex items-center gap-1.5 vin-t-xs" style={{ color: info.color }} title={info.title}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
      {info.label}
    </span>
  );
}

// Papel o consola. Es la misma retícula y el mismo formato de datos sobre dos
// superficies, así que el conmutador no promete dos productos: promete leer de
// día sobre claro y trabajar de noche sobre oscuro.
function TemaToggle() {
  const tema = useVincereStore((s) => s.tema);
  const setTema = useVincereStore((s) => s.setTema);
  const consola = tema === "consola";
  return (
    <button
      onClick={() => setTema(consola ? "papel" : "consola")}
      className="vin-btn-ghost"
      style={{ padding: "9px 12px" }}
      // Sin aria-label: el texto visible ya nombra el botón, y un aria-label
      // distinto lo reemplaza — quien navega por voz diría «Consola» y no
      // pasaría nada.
      title={consola ? "Cambiar al tema claro" : "Cambiar al tema oscuro"}
    >
      {consola ? "Papel" : "Consola"}
    </button>
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

  // Todos los proyectos entran al selector, no solo los propios. Una
  // referencia de mercado también tiene data que cargar, editar y leer: dejarla
  // fuera del selector la volvía inalcanzable — solo existía como sombra en la
  // comparación, sin forma de abrirla.
  const propios = proyectos.filter((p) => p.tipo === "propio");
  const referencias = proyectos.filter((p) => p.tipo === "competencia");
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
        <span className="vin-serif vin-t-xl tracking-tight">VINCERE</span>
        <span className="vin-faint vin-t-xs uppercase tracking-[0.14em]">Intelligence Platform</span>
        <SyncIndicator />
        {/* Estar dentro de una referencia tiene que verse: su data suele ser
            pública o parcial, y confundirla con la del artista propio es el
            peor error que se puede cometer leyendo estos paneles. */}
        {selected?.tipo === "competencia" && (
          <span
            className="rounded-full border px-2 py-0.5 vin-t-xs"
            style={{ color: "var(--vin-muted)", borderColor: "var(--vin-border-strong)" }}
            title="Este proyecto es una referencia de mercado, no un artista que dirijas. Su data suele ser pública o parcial."
          >
            Referencia de mercado
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {proyectos.length > 0 && (
          <select
            className="vin-select"
            value={selectedId}
            onChange={(e) => selectProyecto(e.target.value)}
            aria-label="Proyecto"
          >
            {propios.length > 0 && (
              <optgroup label="Tus proyectos">
                {propios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}
            {referencias.length > 0 && (
              <optgroup label="Referencias de mercado">
                {referencias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}

        <button
          onClick={() => setGestionAbierta(true)}
          className={proyectos.length === 0 ? "vin-btn-primary" : "vin-btn-ghost"}
          title="Crear, renombrar, vaciar o eliminar proyectos"
        >
          {proyectos.length === 0 ? "Crear proyecto" : "Proyectos"}
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

        <TemaToggle />

        <Link href="/inicio" className="vin-faint px-2 vin-t-xs hover:underline" title="Volver a C.C.O. E.V.">
          ← C.C.O.
        </Link>
      </div>

      {gestionAbierta && <ProyectoManager onClose={() => setGestionAbierta(false)} />}
    </header>
  );
}

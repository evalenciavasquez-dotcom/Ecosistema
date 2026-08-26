"use client";

import { useMemo } from "react";
import { VincereProyecto, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";
import { siguientePaso } from "@/lib/vincere/siguientePaso";
import { useVincereStore } from "@/lib/vincere/store";

// Qué hacer ahora con este artista.
//
// Ordenar las pantallas ayuda, pero una lista ordenada sigue obligando a
// recorrerla. Esto contesta la pregunta directamente y con una sola respuesta:
// no es un resumen de estado, es una instrucción, y lleva el botón que te
// deja donde hay que trabajar.
//
// Va arriba de la navegación y no dentro de una sección porque la pregunta se
// hace ANTES de elegir pantalla — que es justo el momento en que hoy no hay
// nada que ayude.

export default function SiguientePasoBanner({ proyecto }: { proyecto: VincereProyecto }) {
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const paso = useMemo(() => siguientePaso(proyecto), [proyecto]);

  const color = paso.urgente ? "var(--vin-risk)" : paso.alDia ? "var(--vin-ok)" : "var(--vin-accent)";
  const fondo = paso.urgente
    ? "var(--vin-risk-wash)"
    : paso.alDia
      ? "rgba(78,201,138,0.07)"
      : "var(--vin-accent-soft)";

  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{ background: fondo, border: `1px solid ${color}33` }}
    >
      <div className="vin-t-xs uppercase tracking-[0.08em]" style={{ color }}>
        {paso.urgente ? "Vencido · atiende esto primero" : paso.alDia ? "Al día" : "Lo siguiente"}
      </div>
      <div className="vin-t-base mt-1.5 font-medium leading-snug">{paso.titulo}</div>
      <p className="vin-muted vin-t-sm mt-1.5 leading-relaxed">{paso.porQue}</p>
      <button
        onClick={() => setSeccion(paso.seccion)}
        className="vin-t-sm mt-2.5 hover:underline"
        style={{ color }}
      >
        Ir a {VINCERE_SECCION_LABEL[paso.seccion]} →
      </button>
    </div>
  );
}

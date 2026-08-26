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
//
// ---------------------------------------------------------------------------
// Dos cosas que hacía mal y que se ven en cuanto lo usas de verdad
// ---------------------------------------------------------------------------
//
// 1. TE MANDABA A DONDE YA ESTABAS. En «Cargar data» el banner decía «Ir a
//    Cargar data →». Un cartel que señala la puerta por la que acabas de
//    entrar no dirige nada: entrena a ignorarlo, y con él se va la única
//    instrucción del sistema.
//
// 2. CONTRADECÍA LA PANTALLA. En Investigación decía «sin números no hay nada
//    que dirigir» encima del único motor que —según su propio subtítulo— no
//    depende de la data cargada. Las dos cosas son ciertas y por eso el
//    choque: investigar no necesita números, DIRIGIR sí. Lo que faltaba era
//    decirlo junto en vez de dejar que se desmintieran.

// El único motor que corre sin data cargada: busca afuera. Que falten números
// propios no lo bloquea, así que el aviso de «no hay data» ahí no es una orden
// de irse, es un recordatorio de lo que sigue faltando.
const NO_NECESITA_DATA_CARGADA = "investigacion";

export default function SiguientePasoBanner({ proyecto }: { proyecto: VincereProyecto }) {
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const seccion = useVincereStore((s) => s.seccion);
  const paso = useMemo(() => siguientePaso(proyecto), [proyecto]);

  // ¿El paso apunta a la pantalla en la que ya estás?
  const yaEstasAhi = paso.seccion === seccion;
  // ¿Estás en la pantalla exenta y el paso es «falta data»?
  const exento = seccion === NO_NECESITA_DATA_CARGADA && paso.seccion === "ingesta";

  const color = paso.urgente ? "var(--vin-risk)" : paso.alDia ? "var(--vin-ok)" : "var(--vin-accent)";
  const fondo = paso.urgente
    ? "var(--vin-risk-wash)"
    : paso.alDia
      ? "var(--vin-ok-wash)"
      : "var(--vin-accent-soft)";

  const rotulo = paso.urgente
    ? "Vencido · atiende esto primero"
    : paso.alDia
      ? "Al día"
      : yaEstasAhi
        ? "Estás en el sitio correcto"
        : exento
          ? "Esto sí se puede hacer sin data"
          : "Lo siguiente";

  return (
    <div className="rounded-xl px-4 py-3.5" style={{ background: fondo, border: `1px solid ${color}33` }}>
      <div className="vin-t-xs uppercase tracking-[0.08em]" style={{ color }}>
        {rotulo}
      </div>
      <div className="vin-t-base mt-1.5 font-medium leading-snug">{paso.titulo}</div>
      <p className="vin-muted vin-t-sm mt-1.5 leading-relaxed" style={{ maxWidth: "70ch" }}>
        {paso.porQue}
      </p>

      {/* Investigar no necesita números propios; dirigir sí. Decir las dos
          cosas juntas es lo que convierte el aviso en criterio en vez de en
          una contradicción con la pantalla. */}
      {exento && (
        <p className="vin-muted vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch" }}>
          Buscar afuera sí funciona sin eso — es el único motor que no depende de tu data. Lo que encuentres queda
          como contexto y puede pasar a Zonas de Calor, pero no sustituye a los números: son cosas distintas y el
          sistema no va a fingir que una tapa a la otra.
        </p>
      )}

      {/* El enlace solo aparece si lleva a otro lado. Señalar la puerta por la
          que acabas de entrar es lo que entrena a ignorar el cartel. */}
      {!yaEstasAhi && (
        <button onClick={() => setSeccion(paso.seccion)} className="vin-t-sm mt-2.5 hover:underline" style={{ color }}>
          Ir a {VINCERE_SECCION_LABEL[paso.seccion]} →
        </button>
      )}
    </div>
  );
}

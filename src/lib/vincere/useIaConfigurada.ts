"use client";

import { useSyncExternalStore } from "react";

// ¿Hay llave de IA en este despliegue?
//
// Se pregunta una vez por carga de página y se comparte entre todas las
// pantallas: la respuesta es la misma para todas y no cambia mientras la app
// está abierta —cambiarla exige redesplegar—, así que trece pantallas
// preguntando trece veces sería ruido.
//
// El valor arranca en null y NO en false. La diferencia importa: false pinta
// un aviso de "falta configurar", y pintarlo mientras la respuesta viaja haría
// parpadear una alarma falsa en cada carga.

export interface EstadoIa {
  configurada: boolean;
  // "production" | "preview" | "local". Sin esto, "falta la llave" en local y
  // "falta la llave" en producción se ven igual en pantalla y se arreglan en
  // lugares distintos.
  donde: string;
  comoSeArregla: string;
}

type Estado = EstadoIa | null;

let cache: Estado = null;
let consultado = false;
const suscriptores = new Set<() => void>();

function avisar() {
  suscriptores.forEach((f) => f());
}

function consultar() {
  if (consultado) return;
  consultado = true;
  fetch("/api/vincere/ingest")
    .then((r) => r.json())
    .then((d) => {
      cache = {
        configurada: !!d?.iaConfigurada,
        donde: typeof d?.donde === "string" ? d.donde : "local",
        comoSeArregla: typeof d?.comoSeArregla === "string" ? d.comoSeArregla : "",
      };
      avisar();
    })
    // Si la consulta ni siquiera responde, queda en null y no se pinta nada.
    // Afirmar que falta la llave cuando lo que falló fue la red sería mandar a
    // arreglar lo que no está roto. Se permite reintentar en el próximo montaje.
    .catch(() => {
      consultado = false;
    });
}

function suscribir(alCambiar: () => void): () => void {
  suscriptores.add(alCambiar);
  consultar();
  return () => {
    suscriptores.delete(alCambiar);
  };
}

const leer = () => cache;
// En el servidor no hay nada que consultar y devolver null evita que el HTML
// pintado en servidor y el del cliente difieran.
const leerEnServidor = (): Estado => null;

export function useIaConfigurada(): Estado {
  return useSyncExternalStore(suscribir, leer, leerEnServidor);
}

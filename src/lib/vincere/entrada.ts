// Motor de entrada: qué tan lejos puede llegar un veredicto sobre un caso nuevo.
//
// Antes de decidir si se entra a un artista hay que saber sobre qué se está
// decidiendo. Y eso no se pregunta: se cuenta.
//
// ---------------------------------------------------------------------------
// Por qué esto no lo declara el usuario
// ---------------------------------------------------------------------------
//
// La versión anterior tenía tres botones —data baja, media, alta— y el
// veredicto salía acotado por el que Eduardo hubiera marcado. Eso audita a
// Eduardo, no al caso: si marca "alta" porque le entusiasma el artista, el
// sistema le devuelve un nivel 4 sobre nada y encima con cara de rigor.
//
// Es el mismo error que ya se corrigió en Predicciones, donde el nivel de
// evidencia lo ponía a mano quien luego se calificaba con él.
//
// Acá el techo lo calcula el sistema mirando qué material hay de verdad. No
// hay forma de subirlo desde la interfaz: solo trayendo más material.
//
// ---------------------------------------------------------------------------
// La escalera
// ---------------------------------------------------------------------------
//
//   1  solo lo que alguien contó — un párrafo escrito de memoria
//   2  + contraste externo (búsqueda web): hay algo que no dijo el interesado
//   3  + medición del artista (un archivo con su data, o el proyecto cargado)
//   4  + histórico: dos fotos, o sea tendencia y no una foto suelta
//
// El salto de 2 a 3 es el que importa. Todo lo que está por debajo es lo que
// el artista o su manager DICEN; de 3 para arriba es lo que las plataformas
// MIDEN. Un caso nuevo casi siempre entra en 1 o 2, y decirlo es la mitad del
// valor: la otra mitad es nombrar qué traería para subir.

import { VincereProyecto, VincereNivel } from "./types";

export type FuenteEntrada = "descripcion" | "web" | "archivo" | "proyecto" | "historico";

export const FUENTE_LABEL: Record<FuenteEntrada, string> = {
  descripcion: "Lo que te contaron",
  web: "Búsqueda web",
  archivo: "Material cargado",
  proyecto: "Data del proyecto",
  historico: "Histórico",
};

// Lo que hay, en booleanos y no en objetos: así la misma función corre en el
// navegador —donde vive el proyecto— y en el servidor —donde solo llegan los
// hechos—, y las dos partes calculan el mismo techo. Si cada lado tuviera su
// propia versión, tarde o temprano dirían cosas distintas.
export interface MaterialDeEntrada {
  descripcion: string;
  tieneArchivo: boolean;
  investigoWeb: boolean;
  proyectoConMedicion: boolean;
  proyectoConHistorico: boolean;
}

// Los dos hechos que el navegador extrae del proyecto para mandarlos al
// servidor. No viaja el proyecto entero: viaja lo que decide el techo.
export function hechosDelProyecto(p: VincereProyecto | null | undefined) {
  const conMedicion = proyectoTieneMedicion(p);
  return {
    proyectoConMedicion: conMedicion,
    proyectoConHistorico: conMedicion && proyectoTieneHistorico(p),
  };
}

export interface EvidenciaDeEntrada {
  fuentes: FuenteEntrada[];
  // Lo máximo que el veredicto puede declarar. No es una sugerencia: se aplica
  // sobre lo que devuelva el modelo.
  techo: VincereNivel;
  porQue: string;
  // Qué traería para subir el techo, en orden de lo que más lo sube.
  falta: string[];
  // Si no alcanza ni para emitir veredicto.
  suficienteParaVeredicto: boolean;
}

// Un proyecto "tiene medición" cuando trae números de plataforma, no cuando
// existe. Un proyecto recién creado y vacío no es evidencia de nada.
export function proyectoTieneMedicion(p: VincereProyecto | null | undefined): boolean {
  if (!p) return false;
  const r = p.resumen;
  const conNumeros = (r.streamsMes ?? 0) > 0 || (r.oyentesMes ?? 0) > 0 || (r.seguidores ?? 0) > 0;
  const conCatalogo = (p.canciones ?? []).some((c) => (c.streams ?? 0) > 0);
  return conNumeros || conCatalogo;
}

// Dos fotos con fecha distinta. Con una sola no hay tendencia: hay una foto,
// y una foto no distingue una carrera que sube de un pico que ya pasó.
export function proyectoTieneHistorico(p: VincereProyecto | null | undefined): boolean {
  const fechas = new Set((p?.historial ?? []).map((h) => h.fecha));
  return fechas.size >= 2;
}

export function evidenciaDeEntrada(m: MaterialDeEntrada): EvidenciaDeEntrada {
  const fuentes: FuenteEntrada[] = [];
  const hayDescripcion = m.descripcion.trim().length > 0;

  if (hayDescripcion) fuentes.push("descripcion");
  if (m.investigoWeb) fuentes.push("web");
  if (m.tieneArchivo) fuentes.push("archivo");

  const conMedicion = m.proyectoConMedicion;
  const conHistorico = conMedicion && m.proyectoConHistorico;
  if (conMedicion) fuentes.push("proyecto");
  if (conHistorico) fuentes.push("historico");

  // Sin nada que leer no hay veredicto. Devolver uno igual sería la definición
  // de vender humo: una opinión con formato de análisis.
  if (!fuentes.length) {
    return {
      fuentes: [],
      techo: 1,
      porQue: "No hay nada sobre lo que decidir todavía.",
      falta: [
        "Describir el caso en una o dos frases: quién es y qué está pidiendo.",
        "Adjuntar lo que tengas — una captura de Spotify for Artists, un PDF, un dossier.",
      ],
      suficienteParaVeredicto: false,
    };
  }

  const medido = m.tieneArchivo || conMedicion;

  let techo: VincereNivel;
  let porQue: string;

  if (conHistorico) {
    techo = 4;
    porQue =
      "Hay medición del artista y además histórico: se puede leer tendencia, no solo una foto. Es el único caso en que un veredicto de entrada puede afirmar con fuerza.";
  } else if (medido) {
    techo = 3;
    porQue =
      "Hay medición de plataforma, así que el veredicto se apoya en números y no en lo que alguien contó. Falta histórico para saber si eso sube o ya pasó.";
  } else if (m.investigoWeb) {
    techo = 2;
    porQue =
      "Hay contraste externo, o sea algo que no dijo el interesado. Pero sigue sin haber una sola cifra medida del artista.";
  } else {
    techo = 1;
    porQue =
      "Solo hay lo que te contaron. Puede ser cierto y aun así no es evidencia: nadie lo ha medido todavía.";
  }

  const falta: string[] = [];
  if (!medido) {
    falta.push(
      "Adjuntar data de plataforma —una captura de Spotify for Artists o un PDF con sus números— sube el techo a 3. Es el salto que más cambia el veredicto."
    );
  }
  if (!conHistorico) {
    falta.push(
      medido
        ? "Una segunda foto de otro mes sube el techo a 4: sin dos puntos no se distingue una carrera que crece de un pico que ya pasó."
        : "Con dos fotos de meses distintos el techo llega a 4."
    );
  }
  if (!m.investigoWeb && !medido) {
    falta.push("Buscar en la web sube el techo a 2: al menos hay algo que no dijo el interesado.");
  }
  if (!hayDescripcion) {
    falta.push("Contar en una frase qué está pidiendo: sin eso el sistema ve números pero no la decisión.");
  }

  return { fuentes, techo, porQue, falta, suficienteParaVeredicto: true };
}

// El techo se APLICA, no se sugiere.
//
// Al modelo se le dice en el prompt, y además se le recorta acá. Pedirle a un
// modelo que se autolimite y confiar en que lo hizo es dejar la regla más
// importante del motor a merced de una corrida: si un día devuelve 4 sobre un
// párrafo, el marcador de predicciones queda envenenado y nadie se entera.
export function aplicarTecho(nivelDelModelo: number, techo: VincereNivel): VincereNivel {
  const n = Math.min(4, Math.max(1, Math.round(nivelDelModelo)));
  return Math.min(n, techo) as VincereNivel;
}

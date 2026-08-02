// Qué motores tienen data suficiente para que valga la pena interpretarlos.
//
// Existe porque el error caro no es dejar un motor sin correr: es correrlos
// todos. Un motor vacío no falla — devuelve una lectura genérica y educada
// sobre el nombre y el género del artista, que se ve igual de bien que una
// buena y no lo es. Peor: esa lectura después entra al Informe Final como si
// fuera análisis, y contamina el documento entero.
//
// Por eso cada motor declara aquí qué necesita, y el que no lo tiene se salta
// diciendo qué le falta. Saltarse un motor con una razón es información; una
// lectura de relleno no.

import { VincereProyecto, VincereSeccion, VINCERE_SECCION_LABEL } from "./types";

export interface MotorEstado {
  seccion: VincereSeccion;
  label: string;
  listo: boolean;
  // Si está listo, con qué cuenta. Si no, qué falta y dónde se carga.
  razon: string;
}

// Solo las secciones cuya lectura genérica ('Generar lectura VINCERE') recibe
// contexto real. Los motores con su propio botón —Marca, Touring, A&R,
// Oportunidad, Pitch, Monetización, Predicciones— se corren aparte porque
// producen un documento, no una lista de insights.
const ORDEN: VincereSeccion[] = [
  "resumen",
  "diagnostico",
  "song",
  "audiencia",
  "calor",
  "touring",
  "ar",
  "marca",
  "management",
  "kpis",
];

function estado(p: VincereProyecto, seccion: VincereSeccion): Omit<MotorEstado, "seccion" | "label"> {
  switch (seccion) {
    case "resumen": {
      const r = p.resumen;
      if (r.streamsMes > 0 || r.seguidores > 0 || r.serie.length > 0) {
        return {
          listo: true,
          razon: r.serie.length > 1 ? `${r.serie.length} meses de serie` : "cifras del mes",
        };
      }
      return { listo: false, razon: "sin streams ni seguidores cargados" };
    }
    case "diagnostico": {
      const d = p.diagnostico;
      const lleno = [d.faseActual, d.fortalezaNucleo, d.riesgoPrincipal, d.prioridad].filter(
        (x) => x?.trim()
      ).length;
      return lleno >= 2
        ? { listo: true, razon: `${lleno} de 4 campos escritos` }
        : { listo: false, razon: "el diagnóstico está casi vacío" };
    }
    case "song": {
      const n = p.canciones.length;
      if (!n) return { listo: false, razon: "sin canciones cargadas" };
      const conAudio = p.canciones.filter((c) => c.audio).length;
      const conLetra = p.canciones.filter((c) => c.letra?.trim()).length;
      const extras = [
        conAudio ? `${conAudio} con audio medido` : null,
        conLetra ? `${conLetra} con letra` : null,
      ].filter(Boolean);
      return {
        listo: true,
        razon: `${n} ${n === 1 ? "canción" : "canciones"}${extras.length ? ` · ${extras.join(", ")}` : ""}`,
      };
    }
    case "audiencia": {
      const a = p.audiencia;
      const n = a.edad.length + a.plataformas.length + a.paises.length;
      return n > 0
        ? { listo: true, razon: `${n} segmentos` }
        : { listo: false, razon: "sin segmentos de audiencia" };
    }
    case "calor": {
      const n = p.zonasCalor.length;
      return n > 0
        ? { listo: true, razon: `${n} ${n === 1 ? "plaza" : "plazas"}` }
        : { listo: false, razon: "sin zonas de calor cargadas" };
    }
    case "touring": {
      const shows = (p.shows ?? []).length;
      const zonas = p.zonasCalor.length;
      if (shows > 0) {
        return { listo: true, razon: `${shows} ${shows === 1 ? "show" : "shows"} registrados` };
      }
      // Sin shows todavía se puede leer si hay plazas: la lectura entonces es
      // sobre dónde se podría tocar, no sobre cómo salió lo que ya se tocó.
      return zonas > 0
        ? { listo: true, razon: `${zonas} plazas, todavía sin shows` }
        : { listo: false, razon: "sin shows ni plazas" };
    }
    case "ar": {
      const n = (p.candidatos ?? []).length;
      return n > 0
        ? { listo: true, razon: `${n} ${n === 1 ? "candidato" : "candidatos"}` }
        : { listo: false, razon: "sin candidatos de colaboración" };
    }
    case "marca":
      return p.marca
        ? { listo: true, razon: "marca declarada" }
        : { listo: false, razon: "el artista no ha declarado su marca" };
    case "management": {
      const n = p.decisiones.length;
      return n > 0
        ? { listo: true, razon: `${n} ${n === 1 ? "decisión" : "decisiones"}` }
        : { listo: false, razon: "sin decisiones registradas" };
    }
    case "kpis": {
      const n = p.kpis.length;
      return n > 0
        ? { listo: true, razon: `${n} KPIs` }
        : { listo: false, razon: "sin KPIs definidos" };
    }
    default:
      return { listo: false, razon: "este motor se corre desde su propia sección" };
  }
}

export function motoresDelProyecto(p: VincereProyecto): MotorEstado[] {
  return ORDEN.map((seccion) => ({
    seccion,
    label: VINCERE_SECCION_LABEL[seccion],
    ...estado(p, seccion),
  }));
}

export function motoresListos(p: VincereProyecto): MotorEstado[] {
  return motoresDelProyecto(p).filter((m) => m.listo);
}

// Qué va a cambiar si se aprueba esta lectura.
//
// La pantalla de revisión mostraba los valores propuestos y nada más. Se
// aprobaba a ciegas: el sistema pedía escribir 1.234.567 streams sin decir que
// hoy hay 980.000, ni que eso es un salto del 26%, ni —lo importante— que si
// el número estuviera mal leído de una tabla nadie lo notaría hasta que el
// diagnóstico saliera raro tres pantallas después.
//
// En un sistema cuyo valor entero es el rigor, aprobar sin ver qué se
// reemplaza es un hueco de diseño, no de estilo.
//
// Este módulo compara lo propuesto contra lo que hay y devuelve la lista de
// cambios reales. Es determinista y vive aparte de la pantalla para poder
// probarlo sin navegador.

import {
  VincereIngestaPropuesta,
  VincereProyecto,
  VincereResumen,
  VincereDiagnostico,
} from "./types";
import { formatStreams, formatFollowers } from "./format";

export type TipoCambio = "nuevo" | "reemplaza" | "igual";

export interface Cambio {
  campo: string;
  antes: string | null;
  despues: string;
  tipo: TipoCambio;
  // Variación cuando ambos lados son números y el anterior no era cero. Es lo
  // que convierte "va a quedar en 1,23M" en "sube 26%", que es la forma en que
  // alguien detecta de un vistazo que un número está mal leído.
  variacionPct: number | null;
}

const ETIQUETA_RESUMEN: Record<string, string> = {
  streamsMes: "Streams del mes",
  streamsCambioPct: "Variación de streams",
  seguidores: "Seguidores",
  seguidoresCambioPct: "Variación de seguidores",
  oyentesMes: "Oyentes mensuales",
  momentumIndex: "Momentum Index",
  serie: "Serie histórica",
};

const ETIQUETA_DIAGNOSTICO: Record<string, string> = {
  faseActual: "Fase actual",
  fortalezaNucleo: "Fortaleza núcleo",
  riesgoPrincipal: "Riesgo principal",
  prioridad: "Prioridad",
};

function formatearValor(campo: string, valor: unknown): string {
  if (valor == null) return "—";
  if (campo === "serie" && Array.isArray(valor)) {
    return `${valor.length} ${valor.length === 1 ? "mes" : "meses"}`;
  }
  if (typeof valor === "number") {
    if (campo === "streamsMes") return formatStreams(valor);
    if (campo === "seguidores" || campo === "oyentesMes") return formatFollowers(valor);
    if (campo.endsWith("CambioPct")) return `${valor >= 0 ? "+" : ""}${valor}%`;
    return String(valor);
  }
  const texto = String(valor).trim();
  return texto.length ? texto : "—";
}

function variacion(antes: unknown, despues: unknown): number | null {
  if (typeof antes !== "number" || typeof despues !== "number") return null;
  // Sin base no hay variación que calcular: pasar de 0 a algo es estrenar el
  // dato, no crecer un infinito por ciento.
  if (antes === 0) return null;
  return Math.round(((despues - antes) / Math.abs(antes)) * 1000) / 10;
}

function compararCampos(
  actuales: Record<string, unknown>,
  propuestos: Record<string, unknown>,
  etiquetas: Record<string, string>
): Cambio[] {
  const cambios: Cambio[] = [];
  for (const [k, v] of Object.entries(propuestos)) {
    if (v == null) continue;
    const actual = actuales[k];
    // "Vacío" no es solo undefined: un cero o una cadena en blanco son campos
    // sin estrenar, y presentarlos como un valor que se reemplaza haría ver
    // como pisada una casilla que nunca tuvo nada.
    const vacio =
      actual == null ||
      actual === "" ||
      (typeof actual === "number" && actual === 0) ||
      (Array.isArray(actual) && actual.length === 0);

    const antes = vacio ? null : formatearValor(k, actual);
    const despues = formatearValor(k, v);
    const tipo: TipoCambio = vacio ? "nuevo" : antes === despues ? "igual" : "reemplaza";

    cambios.push({
      campo: etiquetas[k] ?? k,
      antes,
      despues,
      tipo,
      variacionPct: tipo === "reemplaza" ? variacion(actual, v) : null,
    });
  }
  return cambios;
}

export function cambiosDeResumen(p: VincereProyecto, propuesta: Partial<VincereResumen>): Cambio[] {
  return compararCampos(
    p.resumen as unknown as Record<string, unknown>,
    propuesta as Record<string, unknown>,
    ETIQUETA_RESUMEN
  );
}

export function cambiosDeDiagnostico(p: VincereProyecto, propuesta: Partial<VincereDiagnostico>): Cambio[] {
  return compararCampos(
    p.diagnostico as unknown as Record<string, unknown>,
    propuesta as Record<string, unknown>,
    ETIQUETA_DIAGNOSTICO
  );
}

export interface ResumenDelBloque {
  // Cuántas entradas trae y cuántas pisan algo que ya estaba.
  total: number;
  nuevos: number;
  reemplazos: number;
}

// Para las listas —canciones, ciudades, KPIs— lo que importa no es el detalle
// campo a campo sino cuántas de esas entradas ya existían con otro nombre. Un
// bloque que dice "12 canciones" cuando el catálogo ya tiene 5 con los mismos
// títulos no está agregando 12: está reescribiendo 5 y agregando 7.
export function resumirLista(
  propuestas: { nombre?: string; ciudad?: string; label?: string }[],
  existentes: { nombre?: string; ciudad?: string; label?: string }[]
): ResumenDelBloque {
  const clave = (x: { nombre?: string; ciudad?: string; label?: string }) =>
    (x.nombre ?? x.ciudad ?? x.label ?? "").trim().toLowerCase();
  const yaHay = new Set(existentes.map(clave).filter(Boolean));
  let reemplazos = 0;
  for (const p of propuestas) {
    if (yaHay.has(clave(p))) reemplazos++;
  }
  return { total: propuestas.length, nuevos: propuestas.length - reemplazos, reemplazos };
}

// El resumen de una línea que va arriba del bloque, para decidir sin abrir.
export function tituloDelBloque(clave: keyof VincereIngestaPropuesta, r: ResumenDelBloque): string {
  const cosa =
    clave === "canciones" ? "canciones" : clave === "zonasCalor" ? "ciudades" : clave === "kpis" ? "indicadores" : "entradas";
  if (r.reemplazos === 0) return `${r.total} ${cosa}, todas nuevas`;
  if (r.nuevos === 0) return `${r.total} ${cosa}, todas ya existían — se reescriben`;
  return `${r.total} ${cosa}: ${r.nuevos} nuevas y ${r.reemplazos} que se reescriben`;
}

// Del formato de cable al formato del dominio.
//
// El esquema con el que se le pide la respuesta a Claude es plano y sin
// uniones, porque la salida estructurada lo compila a una gramática y las
// uniones la hacen explotar —la ingesta no funcionó nunca por eso—. Pero la
// app espera bloques que pueden ser null: "no vino nada de audiencia" no es lo
// mismo que "vino audiencia vacía", y quien revisa la propuesta necesita ver
// solo lo que de verdad trajo el material.
//
// Acá se traduce lo uno en lo otro. Vacío se vuelve null, y la lista de
// mediciones se vuelve el objeto de resumen.
//
// La regla que ordena todo esto: un bloque solo existe si tiene contenido. Un
// objeto con todos los campos vacíos entra como null, no como un bloque que
// después se muestra en pantalla con nada adentro y se aplica sobre la data
// buena pisándola con vacíos.

import { IngestResponse } from "./schema";
import {
  VincereIngestaPropuesta,
  VincereIngestaResultado,
  VincereResumen,
  VincereDiagnostico,
  VincereAudiencia,
  VincereSeccion,
  VincereNivel,
} from "./types";

export function normalizarIngesta(r: IngestResponse): VincereIngestaResultado {
  return {
    fuente: r.fuente,
    lectura: r.lectura,
    confianza: nivelDe(r.confianza),
    propuesta: propuestaDe(r),
    alertas: r.alertas.map((a) => ({
      texto: a.texto,
      severidad: a.severidad,
      // "ninguna" es el hueco del enum que reemplazó al null en el cable.
      seccion: a.seccion === "ninguna" ? null : (a.seccion as VincereSeccion),
      nivel: nivelDe(a.nivel),
    })),
    faltante: r.faltante,
  };
}

// El nivel llega como número porque el esquema lo declara así a propósito: una
// unión de literales sería más precisa para el tipo, pero abriría una rama en
// la gramática compilada en CADA motor, y esa es justo la cuenta que había que
// bajar. Zod ya garantiza el rango 1-4 en ejecución; esto se lo cuenta al tipo
// y deja el tope puesto por si el esquema cambiara y nadie mirara acá.
function nivelDe(n: number): VincereNivel {
  return Math.min(4, Math.max(1, Math.round(n))) as VincereNivel;
}

function propuestaDe(r: IngestResponse): VincereIngestaPropuesta {
  const p: VincereIngestaPropuesta = {};

  const resumen = resumenDe(r);
  if (resumen) p.resumen = resumen;

  const diagnostico = diagnosticoDe(r);
  if (diagnostico) p.diagnostico = diagnostico;

  if (r.canciones.length) p.canciones = r.canciones;
  if (r.zonasCalor.length) p.zonasCalor = r.zonasCalor;
  if (r.kpis.length) p.kpis = r.kpis;

  const audiencia = audienciaDe(r);
  if (audiencia) p.audiencia = audiencia;

  return p;
}

// Las mediciones vienen como lista de lo encontrado. Se vuelven objeto acá.
// Si la misma métrica llegara dos veces —el material trae dos periodos, o el
// modelo se repitió— gana la última: es lo que hace un formulario cuando se
// escribe encima, y descartar en silencio la segunda sería peor.
function resumenDe(r: IngestResponse): Partial<VincereResumen> | null {
  const resumen: Partial<VincereResumen> = {};
  for (const m of r.mediciones) {
    resumen[m.campo] = m.valor;
  }
  if (r.serie.length) resumen.serie = r.serie;
  return Object.keys(resumen).length ? resumen : null;
}

function diagnosticoDe(r: IngestResponse): Partial<VincereDiagnostico> | null {
  const d: Partial<VincereDiagnostico> = {};
  const campos = ["faseActual", "fortalezaNucleo", "riesgoPrincipal", "prioridad"] as const;
  for (const c of campos) {
    const v = r.diagnostico[c].trim();
    if (v) d[c] = v;
  }
  return Object.keys(d).length ? d : null;
}

function audienciaDe(r: IngestResponse): Partial<VincereAudiencia> | null {
  const a: Partial<VincereAudiencia> = {};
  if (r.audienciaEdad.length) a.edad = r.audienciaEdad;
  if (r.audienciaPlataformas.length) a.plataformas = r.audienciaPlataformas;
  if (r.audienciaPaises.length) a.paises = r.audienciaPaises;
  return Object.keys(a).length ? a : null;
}

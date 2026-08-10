// NPS — Net Promoter Score.
//
// La pregunta es una sola: "del 0 al 10, ¿qué tan probable es que recomiendes
// esto?". Promotores 9-10, pasivos 7-8, detractores 0-6. El puntaje es el
// porcentaje de promotores menos el de detractores, y va de -100 a +100.
//
// LO PRIMERO, porque decide si esto sirve o es decorado: **un NPS sin encuesta
// no es un NPS.** No se puede derivar de streams, de retención ni de fan rate.
// Esas métricas dicen si alguien escucha; el NPS dice si alguien RECOMIENDA, y
// no hay forma de deducir lo segundo de lo primero. Este módulo por lo tanto
// solo calcula sobre respuestas cargadas, y cuando no hay, lo dice.
//
// LO SEGUNDO, que es donde casi todo el mundo se resbala: un NPS de 42 sacado
// de quince respuestas no es 42. Es un número con un margen de error enorme,
// porque el puntaje resta dos proporciones y cada una arrastra su propia
// incertidumbre. Este módulo calcula ese margen y lo muestra pegado a la cifra.
// Es la diferencia entre presentar un dato y presentar una anécdota con
// decimales.
//
// Y LO TERCERO: el NPS mide a quien responde, no a quien no responde. Si la
// encuesta la contesta el club de fans, el número mide al club de fans. Eso
// también va dicho.

// Sobre qué se pregunta. Es el único campo que separa las dos encuestas que
// tienen sentido acá, y por eso vive en el dato y no en dos módulos distintos:
// la matemática es idéntica, lo que cambia es a quién se le pregunta y qué
// significa el resultado.
export type NpsSobre = "artista" | "vincere";

export const NPS_SOBRE_LABEL: Record<NpsSobre, string> = {
  artista: "Fans sobre el artista",
  vincere: "Artistas sobre VINCERE",
};

export const NPS_SOBRE_PREGUNTA: Record<NpsSobre, string> = {
  artista: "Del 0 al 10, ¿qué tan probable es que le recomiendes este artista a alguien?",
  vincere: "Del 0 al 10, ¿qué tan probable es que recomiendes a VINCERE como dirección estratégica?",
};

export const NPS_SOBRE_QUE_MIDE: Record<NpsSobre, string> = {
  artista:
    "Mide si la audiencia mueve al artista por su cuenta. Un artista con muchos oyentes y NPS bajo crece pagando; uno con NPS alto crece porque lo recomiendan, que es el único crecimiento que no cuesta dinero.",
  vincere:
    "Mide tu propio negocio, no el del artista. Es la cifra que un socio o un inversionista va a pedir antes que cualquier otra, porque dice si los clientes que ya tenés te traerían el siguiente.",
};

export interface RespuestaNps {
  id: string;
  // 0 a 10. Fuera de ese rango la respuesta no es válida y se descarta.
  puntaje: number;
  comentario?: string;
  fecha: string;
  // De dónde salió: una encuesta por correo, un formulario en un show, DMs.
  canal?: string;
}

export type CategoriaNps = "promotor" | "pasivo" | "detractor";

export function categoriaDe(puntaje: number): CategoriaNps {
  if (puntaje >= 9) return "promotor";
  if (puntaje >= 7) return "pasivo";
  return "detractor";
}

export interface LecturaNps {
  // El puntaje, de -100 a +100. null cuando no hay respuestas válidas: es
  // preferible un hueco declarado a un cero que se lee como "malo".
  puntaje: number | null;
  respuestas: number;
  promotores: number;
  pasivos: number;
  detractores: number;
  pctPromotores: number;
  pctPasivos: number;
  pctDetractores: number;
  // Margen de error al 95%. Con pocas respuestas es enorme, y verlo es lo que
  // impide presentar ruido como resultado.
  margen: number | null;
  // El rango honesto: puntaje ± margen, recortado a [-100, 100].
  rangoBajo: number | null;
  rangoAlto: number | null;
  // Qué se puede y qué no se puede decir con estas respuestas.
  lectura: string;
  // Cuando falta algo, qué falta.
  falta: string | null;
  // Respuestas descartadas por estar fuera de 0-10, si las hubo.
  descartadas: number;
}

// Cuántas respuestas hacen falta antes de que el número deje de ser anécdota.
// No es un número mágico: es donde el margen de error al 95% baja de ±20
// puntos en un reparto típico, que es cuando el puntaje empieza a distinguir
// un NPS bueno de uno malo.
export const MINIMO_UTIL = 30;

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function calcularNps(respuestas: RespuestaNps[], sobre: NpsSobre = "artista"): LecturaNps {
  const validas = respuestas.filter((r) => Number.isFinite(r.puntaje) && r.puntaje >= 0 && r.puntaje <= 10);
  const descartadas = respuestas.length - validas.length;
  const n = validas.length;

  const vacio = (falta: string): LecturaNps => ({
    puntaje: null,
    respuestas: 0,
    promotores: 0,
    pasivos: 0,
    detractores: 0,
    pctPromotores: 0,
    pctPasivos: 0,
    pctDetractores: 0,
    margen: null,
    rangoBajo: null,
    rangoAlto: null,
    lectura: "",
    falta,
    descartadas,
  });

  if (n === 0) {
    return vacio(
      `Sin respuestas no hay NPS. Hay que preguntar: «${NPS_SOBRE_PREGUNTA[sobre]}». No se puede deducir de streams ni de seguidores — esas métricas dicen quién escucha, no quién recomienda.`
    );
  }

  const promotores = validas.filter((r) => categoriaDe(r.puntaje) === "promotor").length;
  const pasivos = validas.filter((r) => categoriaDe(r.puntaje) === "pasivo").length;
  const detractores = validas.filter((r) => categoriaDe(r.puntaje) === "detractor").length;

  const pProm = promotores / n;
  const pDetr = detractores / n;
  const puntaje = r0((pProm - pDetr) * 100);

  // Margen de error del NPS al 95%.
  //
  // El NPS es una DIFERENCIA de dos proporciones sobre la misma muestra, así
  // que su varianza no es la de una proporción común: hay que restar el
  // cuadrado de la diferencia. Usar la fórmula simple daría un margen más
  // estrecho de lo real, que es justo el error que hace que un NPS de quince
  // respuestas se presente como si fuera firme.
  const varianza = (pProm + pDetr - Math.pow(pProm - pDetr, 2)) / n;
  const margen = r1(1.96 * Math.sqrt(Math.max(varianza, 0)) * 100);

  const rangoBajo = Math.max(-100, r0(puntaje - margen));
  const rangoAlto = Math.min(100, r0(puntaje + margen));

  return {
    puntaje,
    respuestas: n,
    promotores,
    pasivos,
    detractores,
    pctPromotores: r0(pProm * 100),
    pctPasivos: r0((pasivos / n) * 100),
    pctDetractores: r0(pDetr * 100),
    margen,
    rangoBajo,
    rangoAlto,
    lectura: leer(puntaje, n, margen, sobre),
    falta:
      n < MINIMO_UTIL
        ? `Con ${n} respuesta(s) el margen es de ±${margen} puntos. Hacen falta unas ${MINIMO_UTIL} para que el número distinga un NPS bueno de uno malo.`
        : null,
    descartadas,
  };
}

function leer(puntaje: number, n: number, margen: number, sobre: NpsSobre): string {
  // Lo primero que hay que mirar no es el puntaje sino si el rango cruza el
  // cero: si lo cruza, ni siquiera se sabe el signo, y discutir la magnitud es
  // discutir sobre ruido.
  if (puntaje - margen < 0 && puntaje + margen > 0) {
    return `Con ${n} respuesta(s) el rango va de ${Math.max(-100, Math.round(puntaje - margen))} a ${Math.min(
      100,
      Math.round(puntaje + margen)
    )} y cruza el cero: todavía no se sabe ni si es positivo. No hay lectura que sostener — hay que juntar más respuestas.`;
  }

  const quien = sobre === "artista" ? "la audiencia" : "los clientes";
  if (puntaje >= 50) {
    return `${puntaje} es alto: ${quien} no solo consume, recomienda. Es el crecimiento que no cuesta pauta, y el argumento más fuerte que se puede llevar a una mesa.`;
  }
  if (puntaje >= 0) {
    return `${puntaje} es positivo pero modesto: hay más promotores que detractores, aunque el grueso está en el medio. Los pasivos son el margen — no dicen nada malo, pero tampoco traen a nadie.`;
  }
  return `${puntaje} es negativo: hay más detractores que promotores. Antes de invertir en crecer conviene entender por qué — meter pauta sobre esto amplifica el problema en vez de resolverlo.`;
}

// Los comentarios de los detractores. Es la parte del NPS que de verdad cambia
// una decisión: el número dice que hay un problema, los comentarios dicen cuál.
export function vocesDetractoras(respuestas: RespuestaNps[]): RespuestaNps[] {
  return respuestas
    .filter((r) => r.puntaje >= 0 && r.puntaje <= 6 && r.comentario?.trim())
    .sort((a, b) => a.puntaje - b.puntaje);
}

export const ADVERTENCIA_NPS =
  "El NPS mide a quien responde, no a quien no responde. Si la encuesta la contesta sobre todo el círculo cercano, el número mide a ese círculo. Anotá siempre por dónde se preguntó.";

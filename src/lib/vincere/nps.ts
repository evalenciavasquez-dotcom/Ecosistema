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
//
// PERO —y esta es la corrección importante— de ahí NO se sigue que con pocas
// respuestas no haya nada que decir. Ese fue el error de la primera versión:
// mostraba un número gris con una disculpa al lado, que es un indicador que no
// indica nada.
//
// La distinción que lo resuelve: el PUNTAJE es una inferencia sobre gente a la
// que no se le preguntó; los CONTEOS son una observación de lo que respondió
// quien sí respondió. Con ocho respuestas no se puede afirmar "el NPS es +40",
// pero sí se puede afirmar "de ocho personas, cinco lo recomendarían y una no".
// Eso es un hecho, no una estimación, y sirve desde la primera respuesta.
//
// Por eso el módulo tiene tres modos y elige solo:
//   cuenta      (n < 10)  → los conteos como hecho. Sin puntaje: no aplica.
//   provisional (10-29)   → conteos arriba, puntaje con margen abajo.
//   puntaje     (30+)     → el puntaje manda, ya distingue.
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
  // Cómo hay que leer esto: como conteo, como puntaje provisional, o como
  // puntaje. Lo decide la cantidad de respuestas, no quien presenta.
  modo: ModoNps;
  // El hecho, dicho en una frase. Funciona desde la primera respuesta porque no
  // proyecta nada: cuenta lo que pasó.
  frase: string;
  // Qué se puede y qué no se puede decir con estas respuestas.
  lectura: string;
  // Cuando falta algo, qué falta.
  falta: string | null;
  // Respuestas descartadas por estar fuera de 0-10, si las hubo.
  descartadas: number;
}

// Dónde el PUNTAJE empieza a distinguir un resultado bueno de uno malo: es
// donde el margen al 95% baja de ±20 puntos en un reparto típico. No es un
// mínimo para usar el indicador — es un mínimo para usar el puntaje.
export const MINIMO_UTIL = 30;

// Por debajo de esto ni siquiera vale la pena mostrar el puntaje: se reportan
// los conteos, que son un hecho.
export const MINIMO_PUNTAJE = 10;

export type ModoNps = "cuenta" | "provisional" | "puntaje";

function modoDe(n: number): ModoNps {
  if (n < MINIMO_PUNTAJE) return "cuenta";
  if (n < MINIMO_UTIL) return "provisional";
  return "puntaje";
}

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
    modo: "cuenta",
    frase: "",
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
    modo: modoDe(n),
    frase: frasear(promotores, pasivos, detractores, n, sobre),
    lectura: leer(puntaje, n, margen, sobre),
    falta:
      modoDe(n) === "provisional"
        ? `El puntaje es provisional: con ${n} respuestas el margen es de ±${margen}. Los conteos de arriba sí son firmes.`
        : null,
    descartadas,
  };
}

// El hecho, sin proyectar nada.
//
// "De 8 personas, 5 la recomendarían" es verdad con 8 respuestas. "El NPS es
// +40" no lo es. Esta frase es la que hace que el indicador sirva desde el
// primer día, y es la que se puede decir en una reunión sin exagerar.
function frasear(prom: number, pas: number, detr: number, n: number, sobre: NpsSobre): string {
  const que = sobre === "artista" ? "lo recomendarían" : "te recomendarían";
  const partes: string[] = [`${prom} de ${n} ${que}`];
  if (detr > 0) partes.push(`${detr} no`);
  if (pas > 0) partes.push(`${pas} ni sí ni no`);
  return partes.join(", ") + ".";
}

function leer(puntaje: number, n: number, margen: number, sobre: NpsSobre): string {
  // Con pocas respuestas la lectura NO es "no se puede decir nada". Es que hay
  // que leer los comentarios en vez del puntaje: con ocho respuestas cada
  // detractor es una persona concreta con un motivo concreto, y eso es más
  // accionable que cualquier promedio.
  if (n < MINIMO_PUNTAJE) {
    return `Con ${n} respuesta${
      n === 1 ? "" : "s"
    } no hay puntaje que proyectar, pero sí hay qué leer: a esta escala cada respuesta es una persona con un motivo. Los comentarios valen más que cualquier promedio, y de ahí sale la decisión.`;
  }

  // Con muestra suficiente para intentar un puntaje, lo primero es si el rango
  // cruza el cero: si lo cruza, ni siquiera se sabe el signo.
  if (puntaje - margen < 0 && puntaje + margen > 0) {
    return `El puntaje va de ${Math.max(-100, Math.round(puntaje - margen))} a ${Math.min(
      100,
      Math.round(puntaje + margen)
    )} y cruza el cero, así que todavía no dice si es positivo. Los conteos sí valen — y los comentarios más.`;
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


// ---------------------------------------------------------------------------
// Recolectar: pegar respuestas en bloque
// ---------------------------------------------------------------------------
//
// Nadie va a cargar treinta respuestas de a una por una pantalla de once
// botones. Se recogen en un formulario —Google Forms, Tally, un papel en un
// show— y llegan como una columna. Esto la lee.
//
// Acepta lo que sale de un CSV o de una hoja de cálculo: un puntaje por línea,
// o "puntaje, comentario", o "puntaje<tab>comentario". Lo que no entiende lo
// devuelve como línea rechazada con su número, en vez de tragárselo en
// silencio: una respuesta perdida sin aviso corrompe un promedio que nadie
// vuelve a auditar.

export interface LineaPegada {
  puntaje: number;
  comentario?: string;
}

export interface ResultadoPegado {
  validas: LineaPegada[];
  // Línea original y por qué no se pudo leer. Con el número de línea, para
  // poder ir a arreglarla en el origen.
  rechazadas: { linea: number; texto: string; porQue: string }[];
}

export function leerPegado(texto: string): ResultadoPegado {
  const validas: LineaPegada[] = [];
  const rechazadas: ResultadoPegado["rechazadas"] = [];

  const lineas = texto.split(/\r?\n/);
  lineas.forEach((cruda, i) => {
    const linea = cruda.trim();
    if (!linea) return;

    // El separador puede ser tabulación (pegado desde una hoja) o la primera
    // coma (pegado desde CSV). Se parte solo en la PRIMERA, porque el
    // comentario puede traer comas propias.
    const corte = linea.search(/[\t,;]/);
    const cabeza = corte === -1 ? linea : linea.slice(0, corte);
    const cola = corte === -1 ? "" : linea.slice(corte + 1).trim();

    const num = Number(cabeza.trim().replace(",", "."));
    if (!Number.isFinite(num)) {
      // Encabezados tipo "puntaje,comentario" caen acá y se dicen como tal:
      // es el caso más común al pegar desde una hoja.
      rechazadas.push({
        linea: i + 1,
        texto: linea.slice(0, 60),
        porQue: "no empieza con un número — si es el encabezado de la hoja, bórralo antes de pegar",
      });
      return;
    }
    if (num < 0 || num > 10) {
      rechazadas.push({
        linea: i + 1,
        texto: linea.slice(0, 60),
        porQue: `${num} está fuera de la escala 0-10`,
      });
      return;
    }

    validas.push({
      puntaje: Math.round(num),
      comentario: cola.replace(/^["']|["']$/g, "").trim() || undefined,
    });
  });

  return { validas, rechazadas };
}

// ---------------------------------------------------------------------------
// El sesgo, medido en vez de advertido
// ---------------------------------------------------------------------------
//
// La advertencia "el NPS mide a quien responde" no cambia ninguna decisión
// mientras sea una frase al pie. Se vuelve útil cuando se puede VER: si el
// público de un show puntúa 30 y los DM puntúan 80, el problema no es el
// promedio — es que se preguntó en el lugar equivocado.

export interface NpsPorCanal {
  canal: string;
  lectura: LecturaNps;
}

export function porCanal(respuestas: RespuestaNps[], sobre: NpsSobre = "artista"): NpsPorCanal[] {
  const canales = new Map<string, RespuestaNps[]>();
  for (const r of respuestas) {
    const c = r.canal?.trim() || "sin canal anotado";
    canales.set(c, [...(canales.get(c) ?? []), r]);
  }
  return [...canales.entries()]
    .map(([canal, rs]) => ({ canal, lectura: calcularNps(rs, sobre) }))
    .sort((a, b) => b.lectura.respuestas - a.lectura.respuestas);
}

// La brecha entre el canal más generoso y el más duro. Cuando es grande, el
// promedio general no representa a nadie.
export function brechaEntreCanales(canales: NpsPorCanal[]): string | null {
  const conDatos = canales.filter((c) => c.lectura.puntaje != null && c.lectura.respuestas >= 3);
  if (conDatos.length < 2) return null;

  const orden = [...conDatos].sort((a, b) => (b.lectura.puntaje ?? 0) - (a.lectura.puntaje ?? 0));
  const alto = orden[0];
  const bajo = orden[orden.length - 1];
  const brecha = (alto.lectura.puntaje ?? 0) - (bajo.lectura.puntaje ?? 0);

  if (brecha < 20) {
    return `Los canales coinciden (${brecha} puntos de diferencia entre el más alto y el más bajo). El promedio representa a todos.`;
  }
  return `«${alto.canal}» puntúa ${alto.lectura.puntaje} y «${bajo.canal}» puntúa ${
    bajo.lectura.puntaje
  }: ${brecha} puntos de diferencia. El promedio general no representa a ninguno de los dos — lo que cambia el número no es el artista, es por dónde se preguntó.`;
}

// Cuándo el NPS es directamente la herramienta equivocada.
//
// Con una población de cinco clientes no hay muestra que alcance: el margen se
// come el resultado por completo. Decirlo es más útil que calcular un número
// que después nadie puede defender.
export function npsAplicable(poblacionEstimada: number | null, sobre: NpsSobre): string | null {
  if (sobre === "vincere" && poblacionEstimada != null && poblacionEstimada < 15) {
    return `Con ${poblacionEstimada} cliente(s) el NPS no es la herramienta: aunque respondan todos, el margen se come el resultado. Preguntá igual —la pregunta es buena— pero leé los comentarios, no el puntaje.`;
  }
  return null;
}

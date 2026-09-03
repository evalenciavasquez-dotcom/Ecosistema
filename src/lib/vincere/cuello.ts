// El cuello de botella: cuál de todos los problemas es EL problema.
//
// El sistema mide once cosas. Once lecturas no son una estrategia — son once
// lecturas, y quien las recibe termina eligiendo la que más le gusta. Este
// módulo hace la única pregunta que convierte medición en decisión: si hay un
// solo peso para gastar, ¿dónde va?
//
// ---------------------------------------------------------------------------
// La carrera es una cadena, y una cadena se rompe por un eslabón
// ---------------------------------------------------------------------------
//
// Seis etapas, en el orden en que ocurren:
//
//   obra        → ¿hay algo que aguante que lo empujen?
//   alcance     → ¿lo escucha gente?
//   conversión  → ¿el que escucha se queda?
//   retención   → ¿el que se queda vuelve?
//   propiedad   → ¿ese crecimiento es del artista o alquilado?
//   monetización→ ¿esa audiencia se vuelve caja?
//
// ---------------------------------------------------------------------------
// Pero el orden en que se ARREGLAN no es ese
// ---------------------------------------------------------------------------
//
// Y acá está lo único de este módulo que vale de verdad: EL ALCANCE SE ARREGLA
// ÚLTIMO. Es la única etapa que se puede comprar, y por eso es la que todo el
// mundo vende. Comprar alcance encima de una fuga es la forma más cara de
// gastar que existe: paga por traer gente a un lugar del que se va.
//
// Así que el cuello es la primera etapa rota en este orden:
//
//   obra → conversión → retención → propiedad → monetización → ALCANCE
//
// Si nada de lo anterior está roto, entonces sí: el cuello es alcance, y ahí
// la pauta es exactamente lo que corresponde. Que el alcance quede al final no
// significa que nunca sea la respuesta — significa que hay que ganársela.
//
// ---------------------------------------------------------------------------
// Una etapa que no se puede ver NO está sana
// ---------------------------------------------------------------------------
//
// Tercer estado obligatorio: "no se sabe". Si falta el desglose de fuentes, la
// propiedad no está bien: está invisible. Tratar lo invisible como sano es
// cómo un diagnóstico señala con seguridad el problema equivocado — y si la
// etapa ciega va ANTES del cuello encontrado, el cuello encontrado puede no
// ser el cuello. Eso se dice, no se calla.

import { VincereProyecto, VincereNivel } from "./types";
import { calcularFanRate } from "./fanrate";
import { profundidadDeEscucha, lecturaDeOrigen, UMBRAL_STREAMS_POR_OYENTE, ALARMA_PLAYLIST } from "./calidadAudiencia";
import { concentracionDeCatalogo } from "./catalogo";
import { resumirDinero } from "./dinero";
import { formatStreams } from "./format";

export type Etapa = "obra" | "conversion" | "retencion" | "propiedad" | "monetizacion" | "alcance";

export type EstadoEtapa = "roto" | "ok" | "noSeSabe";

// El orden de ARREGLO, no el de la cadena. Alcance al final a propósito.
export const ORDEN_DE_ARREGLO: Etapa[] = [
  "obra",
  "conversion",
  "retencion",
  "propiedad",
  "monetizacion",
  "alcance",
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  obra: "La obra",
  conversion: "Conversión",
  retencion: "Retención",
  propiedad: "Propiedad",
  monetizacion: "Monetización",
  alcance: "Alcance",
};

export const ETAPA_PREGUNTA: Record<Etapa, string> = {
  obra: "¿hay algo que aguante que lo empujen?",
  conversion: "¿el que escucha se queda?",
  retencion: "¿el que se queda vuelve?",
  propiedad: "¿el crecimiento es tuyo o alquilado?",
  monetizacion: "¿esa audiencia se vuelve caja?",
  alcance: "¿lo escucha gente?",
};

export interface EtapaEvaluada {
  etapa: Etapa;
  label: string;
  pregunta: string;
  estado: EstadoEtapa;
  // El número concreto en el que se apoya. Sin esto la etapa es una opinión.
  evidencia: string;
  porQue: string;
  // Qué cargar para dejar de estar ciego. Solo cuando estado === "noSeSabe".
  falta?: string;
  nivel: VincereNivel;
}

export interface CuelloDeBotella {
  // En orden de arreglo, no de cadena.
  etapas: EtapaEvaluada[];
  cuello: EtapaEvaluada | null;
  // Las etapas que no se pueden ver, en orden.
  ciegas: Etapa[];
  // Etapas ciegas que van ANTES del cuello encontrado: si una de ellas
  // estuviera rota, el cuello sería otro.
  ciegasAntesDelCuello: Etapa[];
  titular: string;
  queHacer: string;
  advertencia: string | null;
  // El del eslabón más débil de la cadena de razonamiento, no el mejor.
  nivel: VincereNivel;
}

export function cuelloDeBotella(p: VincereProyecto): CuelloDeBotella {
  const etapas: EtapaEvaluada[] = [
    evaluarObra(p),
    evaluarConversion(p),
    evaluarRetencion(p),
    evaluarPropiedad(p),
    evaluarMonetizacion(p),
    evaluarAlcance(p),
  ];

  const cuello = etapas.find((e) => e.estado === "roto") ?? null;
  const ciegas = etapas.filter((e) => e.estado === "noSeSabe").map((e) => e.etapa);

  // Solo tiene sentido con un cuello encontrado: sin cuello no hay un "antes".
  // Que todas las etapas ciegas contaran como anteriores a un cuello que no
  // existe es lo que hacía la primera versión, y además de estar mal reventaba.
  const ciegasAntesDelCuello = cuello
    ? ciegas.filter((e) => ORDEN_DE_ARREGLO.indexOf(e) < ORDEN_DE_ARREGLO.indexOf(cuello.etapa))
    : [];

  let titular: string;
  let queHacer: string;

  if (cuello) {
    titular = `El cuello está en ${ETAPA_LABEL[cuello.etapa].toLowerCase()}: ${cuello.porQue}`;
    queHacer = QUE_HACER[cuello.etapa];
  } else if (ciegas.length === etapas.length) {
    titular = "No hay con qué diagnosticar todavía: ninguna de las seis etapas tiene data suficiente.";
    queHacer =
      "Antes de cualquier estrategia hace falta cargar lo básico: streams y oyentes del mes, y el catálogo con sus streams. " +
      "Sin eso el sistema puede opinar pero no puede decidir, que es lo único que sirve.";
  } else if (ciegas.length) {
    titular = `Ninguna de las etapas que se pueden ver está rota, pero ${listar(ciegas.map((e) => ETAPA_LABEL[e].toLowerCase()))} ${ciegas.length === 1 ? "sigue" : "siguen"} sin data.`;
    queHacer =
      `Antes de concluir que el único problema es alcance —que es la conclusión cómoda, porque se resuelve comprando— ` +
      `hay que poder ver ${listar(ciegas.map((e) => ETAPA_LABEL[e].toLowerCase()))}. Es barato cargarlo y cambia a dónde va el presupuesto.`;
  } else {
    titular = "Ninguna etapa está rota: la cadena aguanta de punta a punta.";
    queHacer =
      "Esta es la situación donde comprar alcance sí rinde: cada persona que entre cae sobre una máquina que ya funciona. " +
      "Es el único caso en que meter presupuesto en pauta es la decisión correcta y no la cómoda.";
  }

  const advertencia =
    cuello && ciegasAntesDelCuello.length
      ? `Ojo: ${listar(ciegasAntesDelCuello.map((e) => ETAPA_LABEL[e].toLowerCase()))} ${
          ciegasAntesDelCuello.length === 1 ? "no se puede ver" : "no se pueden ver"
        } y ${ciegasAntesDelCuello.length === 1 ? "va" : "van"} antes en el orden de arreglo. Si ${
          ciegasAntesDelCuello.length === 1 ? "estuviera rota" : "alguna estuviera rota"
        }, el cuello sería ${ciegasAntesDelCuello.length === 1 ? "esa" : "otra"} y no ${ETAPA_LABEL[cuello.etapa].toLowerCase()}.`
      : null;

  const nivel = nivelDeLaConclusion(etapas, cuello, ciegas, ciegasAntesDelCuello);

  return { etapas, cuello, ciegas, ciegasAntesDelCuello, titular, queHacer, advertencia, nivel };
}

// El nivel de la conclusión, que NO es el del dato más bonito que la sostiene.
//
// Antes esto era `cuello?.nivel ?? 3`, y ese `?? 3` decía una mentira grande: un
// proyecto sin una sola cifra cargada no tiene cuello, así que caía al 3 y el
// panel anunciaba «no hay con qué diagnosticar» rotulado como EVIDENCIA SÓLIDA.
// Un «no sé» presentado como certeza es el peor error que puede cometer un
// sistema que se vende por decir con cuánto respaldo habla.
function nivelDeLaConclusion(
  etapas: EtapaEvaluada[],
  cuello: EtapaEvaluada | null,
  ciegas: Etapa[],
  ciegasAntesDelCuello: Etapa[]
): VincereNivel {
  // Con cuello, la conclusión se apoya en la etapa rota. Una etapa ciega que va
  // antes la baja: el diagnóstico está parado sobre un hueco.
  if (cuello) return bajar(cuello.nivel, ciegasAntesDelCuello.length ? 1 : 0);

  // Ninguna etapa visible: la conclusión es literalmente «no se sabe».
  if (ciegas.length === etapas.length) return 1;

  // «Nada de lo que se ve está roto» se apoya en TODAS las etapas visibles a la
  // vez, así que vale lo que la más floja de ellas — la cadena de razonamiento
  // se rompe por su eslabón débil igual que la carrera. Y si además queda algún
  // tramo ciego, la afirmación cubre algo que nadie miró: baja otro punto.
  const visibles = etapas.filter((e) => e.estado !== "noSeSabe");
  const masFloja = Math.min(...visibles.map((e) => e.nivel)) as VincereNivel;
  return bajar(masFloja, ciegas.length ? 1 : 0);
}

function bajar(n: VincereNivel, cuanto: number): VincereNivel {
  return Math.max(1, n - cuanto) as VincereNivel;
}

const QUE_HACER: Record<Etapa, string> = {
  obra:
    "La plata va al repertorio, no a la pauta. Empujar una obra que no aguanta multiplica el gasto sin mover la carrera: " +
    "lo que entre se va a ir igual, solo que habiendo pagado por traerlo.",
  conversion:
    "El problema está entre escuchar y quedarse: perfil, identidad, razón para seguir. Se arregla en la marca y en el perfil, " +
    "no en el administrador de anuncios. Y hasta arreglarlo, cada peso de pauta trae gente a un balde con hueco.",
  retencion:
    "La gente llega y no vuelve. Eso es producto, no distribución: se mueve con re-escucha y guardados, que es además lo que " +
    "el algoritmo pesa por encima del volumen. Más alcance sobre esto sube los números del mes y no la carrera.",
  propiedad:
    "El crecimiento existe pero no es del artista. Antes de escalar hay que mover la aguja algorítmica, porque escalar ahora " +
    "solo agranda la dependencia: se paga por crecer y el que se queda con el activo es el curador.",
  monetizacion:
    "La audiencia está y no se está cobrando. Acá el trabajo es comercial —shows, catálogo, marca, sincronización— no de marketing. " +
    "Es el único cuello donde crecer más no ayuda: el problema no es cuánta gente hay, es qué se hace con la que ya está.",
  alcance:
    "Todo lo demás aguanta y falta gente. Este es el único caso donde comprar alcance es la decisión correcta: la máquina ya " +
    "funciona y lo que falta es meterle entrada. Acá el presupuesto de pauta rinde de verdad.",
};

// ---------------------------------------------------------------------------
// Las seis etapas
// ---------------------------------------------------------------------------

function evaluarObra(p: VincereProyecto): EtapaEvaluada {
  const base = { etapa: "obra" as const, label: ETAPA_LABEL.obra, pregunta: ETAPA_PREGUNTA.obra };
  const c = concentracionDeCatalogo(p);

  if (!c) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: "sin catálogo",
      porQue: "No hay al menos dos canciones con streams cargadas.",
      falta: "Cargar el catálogo con los streams de cada canción.",
      nivel: 1,
    };
  }

  if (c.estado === "dependencia") {
    return {
      ...base,
      estado: "roto",
      evidencia: `la mitad de los streams está en ${c.cancionesParaLaMitad === 1 ? "1 canción" : `${c.cancionesParaLaMitad} canciones`} de ${c.canciones}`,
      porQue: `la carrera se apoya en ${c.cancionesParaLaMitad === 1 ? "una canción" : "dos canciones"} y el resto del catálogo no sostiene`,
      nivel: c.nivel,
    };
  }

  return {
    ...base,
    estado: "ok",
    evidencia: `${c.canciones} canciones, la más fuerte pesa ${c.top1Pct}%`,
    porQue: "El catálogo reparte: no hay una sola pieza cuya caída se lleve la carrera.",
    nivel: c.nivel,
  };
}

function evaluarConversion(p: VincereProyecto): EtapaEvaluada {
  const base = { etapa: "conversion" as const, label: ETAPA_LABEL.conversion, pregunta: ETAPA_PREGUNTA.conversion };
  const fr = calcularFanRate(p);

  // El marginal es el que dice qué está pasando AHORA. El acumulado arrastra
  // toda la historia y taparía una caída reciente.
  const m = fr.marginal;
  if (!m || !fr.actual) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: "sin fan rate marginal",
      porQue: "No hay dos fotos con oyentes mensuales, así que no se sabe cómo convierte la audiencia que entra ahora.",
      falta: fr.falta ?? "Cargar oyentes mensuales y guardar una segunda foto.",
      nivel: 1,
    };
  }

  if (m.imposibleComoConversion) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: `${m.pct}% marginal`,
      porQue:
        "El marginal pasa del 100%: están entrando seguidores por fuera del streaming, así que este número no mide conversión de oyente a seguidor.",
      falta: "Revisar de dónde vienen esos seguidores antes de leer esto como conversión.",
      nivel: 1,
    };
  }

  if (m.movimiento !== "creció") {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: `oyentes ${m.movimiento === "plana" ? "planos" : "en caída"}`,
      porQue:
        "Sin audiencia nueva entrando no hay conversión que medir: el marginal solo dice algo cuando hay gente nueva que convertir.",
      falta: "Volver a mirarlo cuando los oyentes suban entre dos fotos.",
      nivel: 1,
    };
  }

  // Contra el propio acumulado del artista. No existe una tabla de industria
  // confiable de fan rate, y usar una inventada sería peor que no comparar.
  const referencia = fr.actual.pct;
  const roto = m.pct < referencia * 0.85;

  return {
    ...base,
    estado: roto ? "roto" : "ok",
    evidencia: `${m.pct}% marginal contra ${referencia}% acumulado`,
    porQue: roto
      ? `la audiencia que entra ahora convierte peor que la histórica del propio artista (${m.pct}% contra ${referencia}%)`
      : "La audiencia nueva convierte al menos tan bien como la histórica.",
    // Comparación contra sí mismo, sin umbral externo: evidencia parcial.
    nivel: 2,
  };
}

function evaluarRetencion(p: VincereProyecto): EtapaEvaluada {
  const base = { etapa: "retencion" as const, label: ETAPA_LABEL.retencion, pregunta: ETAPA_PREGUNTA.retencion };
  const prof = profundidadDeEscucha(p);

  if (!prof) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: "sin streams por oyente",
      porQue: "Faltan streams u oyentes del mes para saber cuántas veces vuelve cada persona.",
      falta: "Cargar oyentes mensuales del mes junto con los streams.",
      nivel: 1,
    };
  }

  return {
    ...base,
    estado: prof.sobreUmbral ? "ok" : "roto",
    evidencia: `${prof.ratio} reproducciones por persona`,
    porQue: prof.sobreUmbral
      ? `Cada persona vuelve ${prof.ratio} veces al mes, por encima de la línea de ${UMBRAL_STREAMS_POR_OYENTE}.`
      : `cada persona pone ${prof.ratio} veces al mes, por debajo de la línea de ${UMBRAL_STREAMS_POR_OYENTE} que dispara el empuje algorítmico`,
    // Umbral publicado: evidencia sólida.
    nivel: 3,
  };
}

function evaluarPropiedad(p: VincereProyecto): EtapaEvaluada {
  const base = { etapa: "propiedad" as const, label: ETAPA_LABEL.propiedad, pregunta: ETAPA_PREGUNTA.propiedad };
  const o = lecturaDeOrigen(p);

  if (!o) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: "sin desglose de fuentes",
      porQue: "No se cargó de dónde vienen los streams, así que no se puede distinguir audiencia propia de audiencia alquilada.",
      falta: "Spotify for Artists → Audiencia → Fuentes de streams, y cargar los porcentajes en el resumen.",
      nivel: 1,
    };
  }

  return {
    ...base,
    estado: o.estado === "prestado" ? "roto" : "ok",
    evidencia: o.playlistPct != null ? `${o.playlistPct}% viene de playlists` : "reparto parcial cargado",
    porQue:
      o.estado === "prestado"
        ? `${o.playlistPct}% de los streams viene de playlists, por encima del ${ALARMA_PLAYLIST}%: el crecimiento es del curador, no del artista`
        : "El crecimiento no depende de que un curador siga poniendo la música.",
    nivel: 3,
  };
}

function evaluarMonetizacion(p: VincereProyecto): EtapaEvaluada {
  const base = {
    etapa: "monetizacion" as const,
    label: ETAPA_LABEL.monetizacion,
    pregunta: ETAPA_PREGUNTA.monetizacion,
  };
  const d = resumirDinero(p);

  if (!d.ingresos.length || d.totalPrincipal <= 0) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: "sin ingresos cargados",
      porQue: "No hay ingresos registrados, así que no se sabe si la audiencia se está cobrando.",
      falta: "Cargar ingresos en Monetización — aunque sea de un par de meses.",
      nivel: 1,
    };
  }

  if (d.porMilStreams == null || d.porMilStreamsTotal == null) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: `${d.monedaPrincipal ? `${d.monedaPrincipal} ` : ""}${Math.round(d.promedioMensual).toLocaleString("es")} al mes`,
      porQue: "Hay ingresos pero no se pueden poner sobre la base de streams para saber si están por encima de lo que paga el streaming solo.",
      falta: "Cargar streams del mes junto con los ingresos.",
      nivel: 1,
    };
  }

  // La única pregunta que este número contesta sin inventarse un umbral: ¿la
  // misma audiencia deja algo además de lo que paga el stream? Si el total
  // sobre mil streams no despega del ingreso de streaming, el artista está
  // monetizando por una sola vía y no hay negocio alrededor de la audiencia.
  const soloStreaming = d.porMilStreamsTotal < d.porMilStreams * 1.5;
  // La moneda va pegada al número. Un "3609 por mil streams" sin unidad se lee
  // como dólares en una sala donde son pesos, y esa confusión no se arregla
  // después: la decisión ya se tomó con el número equivocado.
  const mon = d.monedaPrincipal ? `${d.monedaPrincipal} ` : "";

  return {
    ...base,
    estado: soloStreaming ? "roto" : "ok",
    evidencia: `${mon}${d.porMilStreamsTotal.toFixed(2)} por mil streams en total contra ${mon}${d.porMilStreams.toFixed(2)} de streaming`,
    porQue: soloStreaming
      ? "casi todo lo que entra lo paga el streaming: la audiencia existe y no se está cobrando por ninguna otra vía"
      : `La misma audiencia deja ${(d.porMilStreamsTotal / d.porMilStreams).toFixed(1)}× lo que paga el streaming: hay negocio alrededor de la música y no solo dentro de ella.`,
    // Comparación de dos números propios, sin referencia externa.
    nivel: 2,
  };
}

function evaluarAlcance(p: VincereProyecto): EtapaEvaluada {
  const base = { etapa: "alcance" as const, label: ETAPA_LABEL.alcance, pregunta: ETAPA_PREGUNTA.alcance };
  const h = p.historial ?? [];

  // No existe un "suficientes oyentes" universal: depende del objetivo, del
  // género y del mercado. Así que el alcance se mide contra sí mismo — si
  // sube, no es el cuello; si está plano o cae, sí.
  if (h.length < 2) {
    return {
      ...base,
      estado: "noSeSabe",
      evidencia: `${formatStreams(p.resumen.streamsMes)} al mes`,
      porQue:
        "Con una sola foto no se sabe si el alcance sube o está frenado, y no existe un número universal de oyentes que sirva de referencia.",
      falta: "Guardar una segunda foto del mes para poder comparar.",
      nivel: 1,
    };
  }

  const ordenado = [...h].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const antes = ordenado[ordenado.length - 2];
  const ahora = ordenado[ordenado.length - 1];
  const cambio = antes.streamsMes > 0 ? ((ahora.streamsMes - antes.streamsMes) / antes.streamsMes) * 100 : 0;
  const frenado = cambio < 5;

  return {
    ...base,
    estado: frenado ? "roto" : "ok",
    evidencia: `${cambio >= 0 ? "+" : ""}${cambio.toFixed(1)}% entre ${antes.fecha} y ${ahora.fecha}`,
    porQue: frenado
      ? `los streams se movieron ${cambio.toFixed(1)}% entre las dos últimas fotos: no está entrando gente nueva a ritmo`
      : `Los streams crecieron ${cambio.toFixed(1)}% entre las dos últimas fotos: está entrando gente.`,
    // Contra sí mismo, con solo dos puntos.
    nivel: 2,
  };
}

function listar(xs: string[]): string {
  if (xs.length === 1) return xs[0];
  return xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1];
}

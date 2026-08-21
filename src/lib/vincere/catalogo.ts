// Concentración del catálogo: ¿es un artista o es una canción con un nombre pegado?
//
// La pregunta que responde es de cuántas canciones depende la carrera. Un
// artista con una sola canción que carga todo no es un artista chico: es un
// artista frágil, que es otra cosa y se opera distinto. El día que esa canción
// deje de rotar, se va la carrera entera con ella.
//
// Es la métrica que decide si conviene sacar single o construir catálogo, y es
// la única de las que mide el sistema que se traduce directo a plata cuando
// alguien quiere comprar. Los compradores de catálogo la miran primero.
//
// ---------------------------------------------------------------------------
// De dónde salen los cortes
// ---------------------------------------------------------------------------
//
// Los tres números vienen de la mesa de valuación de catálogos, que es donde
// esta métrica sí está medida contra dinero:
//
//   ≤ 15% la canción más fuerte  → diversificación de origen, riesgo bajo
//   20% de las canciones ≈ 80%   → la forma normal de un catálogo
//   > 50% en una o dos canciones → descuento de 2 a 4 turnos en el múltiplo
//
// El tercero es el que importa: no dice "es riesgoso", dice cuánto cuesta. Y
// la dependencia de una sola canción es la causa que más correlaciona con que
// un catálogo rinda por debajo de lo pagado.
//
// ---------------------------------------------------------------------------
// Lo que este número NO puede decir
// ---------------------------------------------------------------------------
//
// Tres límites, y ninguno se puede tapar con más cálculo:
//
// 1. Los cortes son de INGRESO y acá se mide en STREAMS. Van juntos pero no
//    son lo mismo: un sync paga muy por encima de lo que streamea. Por eso la
//    lectura es nivel 2 y no nivel 4 — es un traslado razonable, no una
//    medición.
//
// 2. Los streams de una canción son acumulados desde que salió. Una canción de
//    hace tres años tuvo tres años para juntar; la del mes pasado, un mes. Un
//    catálogo puede verse concentrado solo porque el hit es viejo. El sistema
//    no tiene fecha de salida por canción, así que no lo corrige: lo declara.
//
// 3. Solo se cuenta lo cargado. Si el artista tiene doce canciones y hay cinco
//    en el sistema, el número describe esas cinco.

import { VincereProyecto, VincereNivel } from "./types";

const CONSULTA = "2026-08-21";

// Cuando la canción más fuerte no pasa de acá, el catálogo tiene
// diversificación propia y el riesgo de concentración es bajo.
export const DIVERSIFICADO_PCT = 15;

// Una o dos canciones por encima de la mitad: acá aparece el descuento.
export const DEPENDENCIA_PCT = 50;

// Turnos de múltiplo que se pierden con esa dependencia.
export const TURNOS_DESCUENTO = { bajo: 2, alto: 4 };

// Debajo de este catálogo el veredicto de dependencia no se emite. No es
// prudencia: es aritmética. Con dos canciones la más fuerte pasa el 50% casi
// siempre, y llamarle dependencia a eso sería contar un empate como derrota.
export const MINIMO_PARA_VEREDICTO = 5;

// El corte de la fuente es "una o dos canciones por encima del 50%". Para UNA
// canción se aplica tal cual: pasar de la mitad es inequívoco con cualquier
// catálogo. Para DOS hace falta una condición más, y no por prudencia sino
// porque si no el test no mide nada.
//
// La fuente da también la forma normal de un catálogo: el 20% de las canciones
// hace el 80% de lo que entra. Ese 20% es la referencia. Con cinco temas, dos
// canciones son el 40% del catálogo — casi la mitad del repertorio: que
// carguen más de la mitad de los streams es lo esperable, no una alarma. La
// pregunta "¿dos canciones sostienen la carrera?" solo se puede hacer cuando
// dos canciones son una porción chica, y chica quiere decir ese 20%.
//
// Con diez canciones o más, dos son el 20% o menos y el corte del 50% ya
// aplica solo. Por eso no hay ningún multiplicador acá: no hace falta
// inventar uno.
export const PORCION_CHICA_PCT = 20;

export const FUENTE_DEPENDENCIA = {
  fuente: "Chartlex — cómo valúan los compradores un catálogo, 2026",
  url: "https://www.chartlex.com/blog/business/music-catalog-valuation-guide-2026",
  consultadoEn: CONSULTA,
};

export const FUENTE_DIVERSIFICACION = {
  fuente: "Royalty Exchange — cómo evaluar un catálogo antes de invertir",
  url: "https://royaltyexchange.com/blog/valuing-music-royalty-assets-a-how-to-guide",
  consultadoEn: CONSULTA,
};

export type EstadoCatalogo = "dependencia" | "concentrado" | "repartido" | "sinVeredicto";

export const ESTADO_CATALOGO_LABEL: Record<EstadoCatalogo, string> = {
  dependencia: "Depende de una canción",
  concentrado: "Concentrado",
  repartido: "Repartido",
  sinVeredicto: "Catálogo corto",
};

export interface CancionEnCatalogo {
  nombre: string;
  streams: number;
  pct: number;
}

export interface Concentracion {
  canciones: number;
  streamsTotal: number;
  // Ordenadas de mayor a menor, con su peso dentro del catálogo cargado.
  top: CancionEnCatalogo[];
  top1Pct: number;
  top2Pct: number;
  // El titular, y a propósito es un conteo y no un puntaje: en cuántas
  // canciones está la mitad de la carrera. Si da 1, ya está dicho todo.
  cancionesParaLaMitad: number;
  // Lo que daría un reparto parejo con este tamaño de catálogo (100/n).
  // Sin esta referencia un 37% no se puede leer: en un catálogo de dos es
  // poco y en uno de cincuenta es dominio absoluto.
  parejoPct: number;
  // Cuántas veces por encima del parejo está la canción más fuerte.
  vecesSobreParejo: number;
  estado: EstadoCatalogo;
  lectura: string;
  queHacer: string;
  limite: string;
  nivel: VincereNivel;
}

export function concentracionDeCatalogo(p: VincereProyecto): Concentracion | null {
  const conStreams = (p.canciones ?? []).filter((c) => (c.streams ?? 0) > 0);
  if (conStreams.length < 2) return null;

  const orden = [...conStreams].sort((a, b) => b.streams - a.streams);
  const streamsTotal = orden.reduce((s, c) => s + c.streams, 0);
  if (streamsTotal <= 0) return null;

  const pct = (n: number) => Math.round((n / streamsTotal) * 1000) / 10;
  const top: CancionEnCatalogo[] = orden.map((c) => ({
    nombre: c.nombre,
    streams: c.streams,
    pct: pct(c.streams),
  }));

  const canciones = orden.length;
  const top1Pct = top[0].pct;
  const top2Pct = pct(orden[0].streams + orden[1].streams);
  const parejoPct = Math.round((100 / canciones) * 10) / 10;
  const vecesSobreParejo = Math.round((top1Pct / parejoPct) * 10) / 10;

  let acumulado = 0;
  let cancionesParaLaMitad = canciones;
  for (let i = 0; i < orden.length; i++) {
    acumulado += orden[i].streams;
    if (acumulado / streamsTotal >= 0.5) {
      cancionesParaLaMitad = i + 1;
      break;
    }
  }

  const nombreTop = top[0].nombre;
  const corto = canciones < MINIMO_PARA_VEREDICTO;

  let estado: EstadoCatalogo;
  let lectura: string;
  let queHacer: string;

  if (corto) {
    estado = "sinVeredicto";
    lectura =
      `Hay ${canciones} canciones cargadas. La mitad de los streams está en ${frase(cancionesParaLaMitad)} ` +
      `y la más fuerte, «${nombreTop}», pesa ${top1Pct}%. Con este catálogo no se puede decir si eso es dependencia ` +
      `o si es simplemente lo que pasa cuando hay pocas canciones: con ${canciones}, un reparto parejo ya daría ${parejoPct}% cada una.`;
    queHacer =
      `El veredicto de dependencia arranca en ${MINIMO_PARA_VEREDICTO} canciones. Antes de eso el número existe pero no decide nada — ` +
      `si el artista tiene más canciones publicadas, cargarlas cambia la lectura más que cualquier análisis.`;
  } else if (top1Pct > DEPENDENCIA_PCT || dosCargan(top2Pct, canciones)) {
    estado = "dependencia";
    const cual =
      top1Pct > DEPENDENCIA_PCT
        ? `«${nombreTop}» sola carga el ${top1Pct}% de los streams`
        : `«${nombreTop}» y «${top[1].nombre}» cargan el ${top2Pct}% entre las dos`;
    lectura =
      `${cual}. Eso es dependencia, no catálogo: la carrera está apoyada en algo que el artista no controla, ` +
      `porque el día que deje de rotar se va con ella la mayor parte de los números. En la mesa donde se compran catálogos, ` +
      `una o dos canciones por encima del ${DEPENDENCIA_PCT}% cuestan entre ${TURNOS_DESCUENTO.bajo} y ${TURNOS_DESCUENTO.alto} turnos de múltiplo.`;
    queHacer =
      `Acá el presupuesto va a las canciones que siguen, no a más pauta sobre la que ya funciona: empujar el hit sube los números ` +
      `y profundiza la dependencia al mismo tiempo. Y si se lanza, hay que calibrar la expectativa — el tema nuevo va a arrancar ` +
      `en una fracción de «${nombreTop}», y eso no es fracaso, es la aritmética de salir contra un catálogo desbalanceado.`;
  } else if (top1Pct <= DIVERSIFICADO_PCT) {
    estado = "repartido";
    lectura =
      `Ninguna canción pasa del ${DIVERSIFICADO_PCT}%: la más fuerte, «${nombreTop}», pesa ${top1Pct}% y la mitad de los streams ` +
      `está repartida en ${frase(cancionesParaLaMitad)}. Es un catálogo con diversificación propia — no hay una sola pieza cuya caída se lleve la carrera.`;
    queHacer =
      `El repertorio no es el problema. Si los números totales son bajos, es alcance, y eso no se arregla sacando otro single: ` +
      `se arregla llevando más gente a lo que ya está publicado y funcionando.`;
  } else {
    estado = "concentrado";
    lectura =
      `«${nombreTop}» pesa ${top1Pct}% del catálogo, ${vecesSobreParejo}× lo que daría un reparto parejo entre ${canciones} canciones (${parejoPct}%). ` +
      `La mitad de los streams está en ${frase(cancionesParaLaMitad)}. Está por encima del ${DIVERSIFICADO_PCT}% que marca diversificación ` +
      `pero lejos del ${DEPENDENCIA_PCT}% donde aparece el descuento: es la forma normal de un catálogo que tiene un tema más fuerte.`;
    queHacer =
      `Lo que hay que mirar no es este número sino cómo se mueve: si el próximo lanzamiento no le quita peso a «${nombreTop}», ` +
      `la concentración sube sola con el tiempo, porque el tema fuerte sigue acumulando mientras los nuevos arrancan de cero.`;
  }

  const limite =
    `Los cortes de la industria son de ingreso y esto se mide en streams — van juntos pero no son lo mismo. ` +
    `Además los streams son acumulados desde que salió cada canción, así que un tema viejo tuvo más tiempo para juntar. ` +
    `Y solo cuenta lo cargado: son ${canciones} canciones en el sistema.`;

  return {
    canciones,
    streamsTotal,
    top,
    top1Pct,
    top2Pct,
    cancionesParaLaMitad,
    parejoPct,
    vecesSobreParejo,
    estado,
    lectura,
    queHacer,
    limite,
    // Nivel 2: el traslado de ingreso a streams es razonable pero no medido.
    nivel: 2,
  };
}

function frase(n: number): string {
  return n === 1 ? "una sola canción" : `${n} canciones`;
}

// Las dos más fuertes pasan la mitad, y dos canciones son una porción chica de
// este catálogo. Sin la segunda condición el test dispara solo en catálogos
// cortos, donde dos canciones son medio repertorio.
function dosCargan(top2Pct: number, canciones: number): boolean {
  const dosSonElPct = (2 / canciones) * 100;
  return top2Pct > DEPENDENCIA_PCT && dosSonElPct <= PORCION_CHICA_PCT;
}

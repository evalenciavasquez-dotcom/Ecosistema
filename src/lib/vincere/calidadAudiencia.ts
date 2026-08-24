// Calidad de la audiencia: ¿es tuya o la estás alquilando?
//
// El fan rate responde si te siguieron. Este módulo responde las otras dos
// mitades de la misma pregunta:
//
//   ¿Te vuelven a poner?  → streams por oyente
//   ¿De dónde vienen?     → playlist contra algorítmico
//
// Las tres juntas separan una carrera de un pico. Un artista puede tener
// novecientos mil oyentes y no tener nada: si vienen de una playlist editorial,
// escuchan una vez y no siguen, ese número desaparece el día que el curador
// rote la lista. Los tres indicadores lo detectan desde ángulos distintos, y
// por eso vale la pena mirarlos juntos y no por separado.
//
// A DIFERENCIA DEL FAN RATE, acá sí hay umbrales publicados, y eso cambia lo
// que el sistema puede decir. Con el fan rate solo se puede comparar al artista
// contra sí mismo; acá se puede decir "está por debajo de la línea", porque la
// línea existe y tiene fuente.

import { VincereProyecto } from "./types";

const CONSULTA = "2026-08-20";

// ---------------------------------------------------------------------------
// Streams por oyente
// ---------------------------------------------------------------------------
//
// Cuántas veces al mes te pone cada persona. Seguir es un toque y es barato;
// volver a poner una canción es la única señal que no se finge.
//
// El umbral no es una opinión: los temas que sostienen más de 2,0 disparan
// colocación en playlists algorítmicas en diez a catorce días, porque el
// algoritmo pesa la re-escucha muy por encima del volumen bruto.
export const UMBRAL_STREAMS_POR_OYENTE = 2.0;

export const FUENTE_UMBRAL = {
  fuente: "Chartlex — cómo funciona el algoritmo de Spotify 2026",
  url: "https://www.chartlex.com/blog/streaming/how-spotify-algorithm-works-2026-complete-guide",
  consultadoEn: CONSULTA,
};

export interface Profundidad {
  ratio: number;
  streams: number;
  oyentes: number;
  // Sobre la línea que dispara el empuje algorítmico.
  sobreUmbral: boolean;
  lectura: string;
}

export function profundidadDeEscucha(p: VincereProyecto): Profundidad | null {
  const streams = p.resumen.streamsMes ?? 0;
  const oyentes = p.resumen.oyentesMes ?? 0;
  if (streams <= 0 || oyentes <= 0) return null;

  const ratio = Math.round((streams / oyentes) * 100) / 100;
  const sobreUmbral = ratio >= UMBRAL_STREAMS_POR_OYENTE;

  let lectura: string;
  if (ratio >= 3) {
    lectura = `${ratio} reproducciones por persona al mes. Es alto: no te descubren, te ponen. Esta es la señal que más pesa para que el algoritmo empuje solo.`;
  } else if (sobreUmbral) {
    lectura = `${ratio} reproducciones por persona al mes, por encima de la línea de ${UMBRAL_STREAMS_POR_OYENTE} que dispara el empuje algorítmico. La gente vuelve.`;
  } else if (ratio >= 1.5) {
    lectura = `${ratio} reproducciones por persona, por debajo de la línea de ${UMBRAL_STREAMS_POR_OYENTE}. Escuchan y no vuelven lo suficiente para que el algoritmo lo note. Es el rango donde crecer cuesta pauta.`;
  } else {
    lectura = `${ratio} reproducciones por persona: prácticamente una sola escucha. Eso es descubrimiento, no consumo — casi todos los que llegan no vuelven.`;
  }

  return { ratio, streams, oyentes, sobreUmbral, lectura };
}

// ---------------------------------------------------------------------------
// De dónde vienen los streams
// ---------------------------------------------------------------------------
//
// La tesis del tráfico prestado, medida. Por encima del 70% desde playlists el
// crecimiento no es del artista: es del curador, y se acaba cuando él decida.

export const ALARMA_PLAYLIST = 70;
export const SANO_PLAYLIST = 60;
export const MINIMO_ALGORITMICO = 40;

export const FUENTE_ORIGEN = {
  fuente: "Chartlex — métricas que predicen crecimiento en Spotify 2026",
  url: "https://www.chartlex.com/blog/streaming/how-to-track-spotify-growth-metrics-2026",
  consultadoEn: CONSULTA,
};

export type EstadoOrigen = "prestado" | "mixto" | "propio";

export const ESTADO_ORIGEN_LABEL: Record<EstadoOrigen, string> = {
  prestado: "Crecimiento prestado",
  mixto: "Mixto",
  propio: "Crecimiento propio",
};

export interface LecturaOrigen {
  playlistPct: number | null;
  algoritmicoPct: number | null;
  perfilPct: number | null;
  externoPct: number | null;
  // Lo que no quedó clasificado. Se muestra en vez de repartirlo: forzar el
  // 100% inventaría data que Spotify no entregó.
  sinClasificarPct: number;
  estado: EstadoOrigen;
  lectura: string;
  // Qué hacer con esto. Es lo que convierte el indicador en una decisión.
  queHacer: string;
}

export function lecturaDeOrigen(p: VincereProyecto): LecturaOrigen | null {
  const o = p.resumen.origenStreams;
  if (!o) return null;

  const playlist = o.playlistPct ?? null;
  const algoritmico = o.algoritmicoPct ?? null;
  const perfil = o.perfilPct ?? null;
  const externo = o.externoPct ?? null;

  if (playlist == null && algoritmico == null) return null;

  const suma = (playlist ?? 0) + (algoritmico ?? 0) + (perfil ?? 0) + (externo ?? 0);
  const sinClasificar = Math.max(0, Math.round((100 - suma) * 10) / 10);

  let estado: EstadoOrigen;
  let lectura: string;
  let queHacer: string;

  if (playlist != null && playlist > ALARMA_PLAYLIST) {
    estado = "prestado";
    lectura = `${playlist}% de los streams viene de playlists, por encima del ${ALARMA_PLAYLIST}% que marca la alarma. Este crecimiento no es del artista: es del curador. El día que rote la lista, los streams se van con ella.`;
    queHacer =
      "Antes de meter más presupuesto en playlists, hay que mover la aguja algorítmica: eso se hace con re-escucha y guardados, no con más alcance. Una campaña que traiga oyentes nuevos sobre esta base solo agranda la dependencia.";
  } else if (algoritmico != null && algoritmico >= MINIMO_ALGORITMICO) {
    estado = "propio";
    lectura = `${algoritmico}% viene del algoritmo${
      playlist != null ? ` y ${playlist}% de playlists` : ""
    }. El algoritmo empuja solo, y eso no se apaga de un día para otro: es la parte del crecimiento que sí es del artista.`;
    queHacer =
      "Esta base sostiene una campaña: la audiencia que entre va a caer sobre un motor que ya está andando, y el algoritmo la va a amplificar en vez de dejarla morir.";
  } else {
    estado = "mixto";
    lectura = `${playlist != null ? `${playlist}% de playlists` : "Reparto parcial"}${
      algoritmico != null ? ` y ${algoritmico}% algorítmico` : ""
    }: ni dependencia clara ni motor propio. Lo sano es playlist por debajo de ${SANO_PLAYLIST}% con algorítmico sobre ${MINIMO_ALGORITMICO}%.`;
    queHacer =
      "Es el momento de empujar la parte algorítmica antes de escalar pauta: subir guardados y re-escucha cuesta menos ahora que cuando la dependencia ya esté hecha.";
  }

  if (sinClasificar > 15) {
    lectura += ` Queda ${sinClasificar}% sin clasificar, así que estos porcentajes describen solo lo que se cargó.`;
  }

  return {
    playlistPct: playlist,
    algoritmicoPct: algoritmico,
    perfilPct: perfil,
    externoPct: externo,
    sinClasificarPct: sinClasificar,
    estado,
    lectura,
    queHacer,
  };
}

// ---------------------------------------------------------------------------
// El cuadro: fan rate contra profundidad
// ---------------------------------------------------------------------------
//
// Ninguno de los dos solos alcanza. El fan rate alto con poca escucha es gente
// que siguió por gesto; mucha escucha con fan rate bajo es gente que consume y
// no se compromete. El cruce es el que nombra la situación.

export type Cuadrante = "fans" | "consumen" | "gesto" | "prestado";

export const CUADRANTE_LABEL: Record<Cuadrante, string> = {
  fans: "Fans de verdad",
  consumen: "Consumen sin comprometerse",
  gesto: "Siguen por gesto",
  prestado: "Tráfico prestado",
};

export interface CuadroAudiencia {
  cuadrante: Cuadrante;
  fanRatePct: number;
  ratio: number;
  lectura: string;
  queHacer: string;
}

// El corte del fan rate es el propio acumulado del artista, no una tabla de
// industria: no existe una confiable, y usar una inventada sería peor que no
// cruzar nada. Lo que el cuadro compara es la audiencia NUEVA contra la
// histórica del mismo artista.
export function cuadroDeAudiencia(
  fanRatePct: number | null,
  fanRateReferencia: number | null,
  prof: Profundidad | null
): CuadroAudiencia | null {
  if (fanRatePct == null || fanRateReferencia == null || !prof) return null;

  const convierte = fanRatePct >= fanRateReferencia * 0.85;
  const vuelven = prof.sobreUmbral;

  const cuadrante: Cuadrante = convierte
    ? vuelven
      ? "fans"
      : "gesto"
    : vuelven
      ? "consumen"
      : "prestado";

  const textos: Record<Cuadrante, { lectura: string; queHacer: string }> = {
    fans: {
      lectura: `Convierte (${fanRatePct}%) y vuelve (${prof.ratio} por persona). La audiencia que está entrando es audiencia de verdad.`,
      queHacer:
        "Acá el presupuesto rinde más en producto que en alcance: otra fecha, merch, contenido. Comprar más gente sobre una base que ya funciona es lo más caro que se puede hacer.",
    },
    consumen: {
      lectura: `Vuelve a ponerte (${prof.ratio} por persona) pero no se compromete (${fanRatePct}% de fan rate). Escuchan la música y no adoptan al artista.`,
      queHacer:
        "El problema no es la música, es la marca: no hay razón para seguir a quien ya te gusta. Es un caso de identidad, no de pauta.",
    },
    gesto: {
      lectura: `Siguen (${fanRatePct}%) pero casi no vuelven (${prof.ratio} por persona). Un follow es un toque y cuesta poco; volver a poner una canción no.`,
      queHacer:
        "Típico de campañas que optimizan seguidores. El número de seguidores va a subir y no va a traducirse en nada: hay que cambiar el objetivo de la campaña hacia escucha, no hacia follow.",
    },
    prestado: {
      lectura: `Ni convierte (${fanRatePct}%) ni vuelve (${prof.ratio} por persona). Es tráfico prestado: entra, oye una vez y se va.`,
      queHacer:
        "Meter más presupuesto acá amplifica el problema. Antes de comprar alcance hay que entender por qué la gente que llega no se queda — y eso se mira en la canción y en el perfil, no en el administrador de anuncios.",
    },
  };

  return { cuadrante, fanRatePct, ratio: prof.ratio, ...textos[cuadrante] };
}

import {
  VincereAudioAnalisis,
  VincereLetraMetrica,
  VincereProyecto,
  VincereSeccion,
  VINCERE_SECCION_LABEL,
} from "./types";
import { describirTextura } from "./audio";
import { formatFollowers, formatStreams } from "./format";

// Versión compacta de las medidas del audio para el contexto. No se manda la
// curva de energía completa: son 64 números que la IA no puede leer mejor que
// el resumen, y ocuparían el contexto de varias canciones.
function resumenAudio(a: VincereAudioAnalisis) {
  return {
    bpm: a.bpm > 0 ? a.bpm : null,
    // Un BPM medido con poca confianza no debe citarse como hecho: se dice.
    fiabilidadDelBpm: a.bpmConfianza >= 0.6 ? "alta" : a.bpmConfianza >= 0.3 ? "media" : "baja",
    tonalidad: a.tonalidad,
    duracionSeg: a.duracionSeg,
    ganchoEntraEnSeg: a.ganchoSeg,
    seccionesTotal: a.secciones.length,
    energiaMedia: a.energiaMedia,
    rangoDinamicoDb: a.rangoDinamico,
    textura: describirTextura(a),
    aviso: "La textura describe el espectro medido. NO se detectaron instrumentos: no afirmes que hay guitarra, piano ni voz.",
  };
}

function resumenMetrica(m: VincereLetraMetrica) {
  return {
    versos: m.versos,
    silabasPorVersoDominante: m.metricaDominante,
    regularidadPct: m.regularidad,
    esquemaRima: m.esquemaRima,
    tipoRima: m.tipoRima,
    densidadLexicaPct: m.densidadLexica,
    versoMasRepetido: m.repeticiones[0] ?? null,
  };
}

// Construye el contexto compacto que se le entrega a la IA por sección —
// solo la data de ESA sección, para que la interpretación sea específica y
// no un resumen genérico de todo el proyecto.
// Últimas fotos de los indicadores, de más antigua a más reciente. Es lo que
// permite que la lectura hable de evolución ("cayó respecto al mes pasado")
// en vez de describir una foto suelta.
function historialReciente(p: VincereProyecto, cuantas = 8) {
  const h = p.historial ?? [];
  if (h.length < 2) return undefined;
  return h.slice(-cuantas).map((s) => ({
    fecha: s.fecha,
    streamsMes: s.streamsMes,
    seguidores: s.seguidores,
    momentumIndex: s.momentumIndex,
    cancionesEnCatalogo: s.cancionesTotal,
    origen: s.etiqueta,
  }));
}

// Lo que el sistema encontró afuera. Se entrega aparte y etiquetado como
// externo a propósito: la IA nunca debe mezclarlo con la data propia, porque
// una cifra leída en una nota de prensa no tiene el peso de una de Spotify.
// 'respaldo' dice si el hallazgo venía con fuente o era criterio del motor.
export function investigacionExterna(
  p: VincereProyecto,
  foco: "plazas" | "catalogo" | "general" | "todo",
  cuantas = 3
): unknown | undefined {
  const invs = (p.investigaciones ?? []).slice(0, cuantas);
  if (!invs.length) return undefined;

  const lista = invs.map((inv) => {
    const comun = {
      consulta: inv.consulta,
      fecha: inv.creadoEn.slice(0, 10),
      resumen: inv.resumen,
      hallazgos: inv.hallazgos.map((h) => ({
        hallazgo: h.texto,
        implicacion: h.implicacion,
        nivel: h.nivel,
        respaldo: h.fuentes.length ? `${h.fuentes.length} fuente(s) web` : "sin fuente — criterio del motor",
      })),
      preguntasSinResponder: inv.preguntasAbiertas,
    };
    if (foco === "todo") {
      return {
        ...comun,
        senalesDePlaza: inv.senalesPlaza,
        implicacionesParaElCatalogo: inv.implicacionesCatalogo,
      };
    }
    if (foco === "plazas") {
      return { ...comun, senalesDePlaza: inv.senalesPlaza };
    }
    if (foco === "catalogo") {
      return { ...comun, implicacionesParaElCatalogo: inv.implicacionesCatalogo };
    }
    return comun;
  });

  return {
    advertencia:
      "Esto viene de búsquedas en la web, NO de la data propia del artista. Trátalo como referencia externa: nómbralo como tal y nunca lo presentes como una métrica del proyecto.",
    investigaciones: lista,
  };
}

export function buildSectionContext(p: VincereProyecto, seccion: VincereSeccion): unknown {
  const base = { proyecto: p.nombre, genero: p.genero, fase: p.fase, tipo: p.tipo };
  const evolucion = historialReciente(p);
  const conExterno = (foco: "plazas" | "catalogo" | "general") => {
    const externo = investigacionExterna(p, foco);
    return externo ? { investigacionExterna: externo } : {};
  };

  switch (seccion) {
    case "resumen":
      return {
        ...base,
        streamsMes: p.resumen.streamsMes,
        streamsCambioPct: p.resumen.streamsCambioPct,
        seguidores: p.resumen.seguidores,
        seguidoresCambioPct: p.resumen.seguidoresCambioPct,
        momentumIndex: p.resumen.momentumIndex,
        serieStreamsMiles: p.resumen.serie,
        ...(evolucion ? { historialDeCargas: evolucion } : {}),
        ...conExterno("general"),
      };
    case "diagnostico":
      return { ...base, diagnostico: p.diagnostico, ...conExterno("general") };
    case "song":
      return {
        ...base,
        // Con audio medido en varias canciones esta lectura deja de ser sobre
        // temas sueltos y pasa a ser sobre el PATRÓN: qué tempo, qué energía y
        // qué momento de gancho tienen las que de verdad funcionan.
        nota: p.canciones.some((c) => c.audio)
          ? "Varias canciones traen medidas del audio. Busca el patrón: compara tempo, energía, momento del gancho y textura entre las que retienen y las que se saltan."
          : undefined,
        canciones: p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
          ...(c.metrica ? { metrica: resumenMetrica(c.metrica) } : {}),
          ...(c.notasProduccion?.trim()
            ? { observacionExterna: { texto: c.notasProduccion.trim(), origen: "servicio externo o productor, NO medido por la plataforma" } }
            : {}),
        })),
        ...conExterno("catalogo"),
      };
    case "audiencia":
      return { ...base, audiencia: p.audiencia, ...conExterno("general") };
    case "calor":
      return { ...base, zonasCalor: p.zonasCalor, ...conExterno("plazas") };
    case "management":
      return { ...base, decisiones: p.decisiones, ...conExterno("general") };
    case "kpis":
      return { ...base, kpis: p.kpis, ...(evolucion ? { historialDeCargas: evolucion } : {}) };
    default:
      return base;
  }
}

export function sectionTitle(seccion: VincereSeccion): string {
  return `Lectura VINCERE — ${VINCERE_SECCION_LABEL[seccion]}`;
}

// Contexto del proyecto COMPLETO para el informe final — a diferencia del
// contexto por sección (deliberadamente estrecho), aquí se entrega todo junto,
// incluidas las lecturas ya generadas, para que la IA cruce motores entre sí.
export function buildInformeContext(p: VincereProyecto): unknown {
  const sinData = (arr: unknown[]) => (arr.length === 0 ? "sin data cargada" : arr);

  const lecturasPrevias = Object.entries(p.insights)
    .filter(([, list]) => (list?.length ?? 0) > 0)
    .map(([seccion, list]) => ({
      seccion: VINCERE_SECCION_LABEL[seccion as VincereSeccion] ?? seccion,
      lecturas: (list ?? []).map((i) => ({ texto: i.texto, nivel: i.nivel })),
    }));

  const preguntasTrabajadas = Object.entries(p.qaLog)
    .filter(([, list]) => (list?.length ?? 0) > 0)
    .flatMap(([seccion, list]) =>
      (list ?? []).map((q) => ({
        seccion: VINCERE_SECCION_LABEL[seccion as VincereSeccion] ?? seccion,
        pregunta: q.pregunta,
        respuesta: q.respuesta,
        nivel: q.nivel,
      }))
    );

  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      streamsCambioPct: p.resumen.streamsCambioPct,
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
      seguidoresCambioPct: p.resumen.seguidoresCambioPct,
      momentumIndex: p.resumen.momentumIndex,
      serieStreamsMiles: sinData(p.resumen.serie),
    },
    diagnostico: p.diagnostico,
    canciones: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
          ...(c.metrica ? { metrica: resumenMetrica(c.metrica) } : {}),
          // El análisis de letra, cuando existe, es material de primera para
          // explicar por qué una canción retiene o se salta.
          analisisLetra: c.analisis
            ? {
                tema: c.analisis.tema,
                gancho: c.analisis.gancho,
                audiencia: c.analisis.audiencia,
                fitMarca: c.analisis.fitMarca,
                potencial: c.analisis.clasificacionPotencial,
                decision: c.analisis.decision,
                nivel: c.analisis.nivel,
              }
            : null,
        }))
      : "sin data cargada",
    audiencia: {
      edad: sinData(p.audiencia.edad),
      plataformas: sinData(p.audiencia.plataformas),
      paises: sinData(p.audiencia.paises),
    },
    zonasCalor: sinData(p.zonasCalor),
    decisiones: sinData(p.decisiones),
    kpis: sinData(p.kpis),
    lecturasVincerePrevias: lecturasPrevias.length ? lecturasPrevias : "todavía no se han generado lecturas por sección",
    preguntasTrabajadas: preguntasTrabajadas.length ? preguntasTrabajadas : "sin preguntas trabajadas",
    historialDeCargas:
      historialReciente(p, 12) ??
      "solo hay una foto de indicadores: todavía no se puede leer evolución en el tiempo",
    investigacionExterna:
      investigacionExterna(p, "todo", 4) ??
      "no se ha investigado nada afuera para este proyecto: el informe se sostiene solo en data propia",
    informeAnterior: (p.informesArchivados ?? [])[0]
      ? {
          fecha: (p.informesArchivados ?? [])[0].generadoEn.slice(0, 10),
          titulo: (p.informesArchivados ?? [])[0].titulo,
          veredicto: (p.informesArchivados ?? [])[0].veredicto,
          pasosCumplidos: (p.informesArchivados ?? [])[0].proximosPasos.filter((x) => x.hecho).map((x) => x.accion),
          pasosPendientes: (p.informesArchivados ?? [])[0].proximosPasos.filter((x) => !x.hecho).map((x) => x.accion),
        }
      : "no hay informe anterior con el que comparar",
  };
}

export function buildComparacionContext(a: VincereProyecto, b: VincereProyecto): unknown {
  const snap = (p: VincereProyecto) => ({
    nombre: p.nombre,
    tipo: p.tipo,
    fase: p.fase,
    streamsMes: p.resumen.streamsMes,
    streamsMesLegible: formatStreams(p.resumen.streamsMes),
    streamsCambioPct: p.resumen.streamsCambioPct,
    seguidores: p.resumen.seguidores,
    seguidoresLegible: formatFollowers(p.resumen.seguidores),
    seguidoresCambioPct: p.resumen.seguidoresCambioPct,
    momentumIndex: p.resumen.momentumIndex,
  });
  return {
    nota: "b es una referencia de mercado; si su tipo es 'competencia' su data suele ser pública/parcial (nivel 2). Ajusta la lectura por macro-fase.",
    a: snap(a),
    b: snap(b),
  };
}

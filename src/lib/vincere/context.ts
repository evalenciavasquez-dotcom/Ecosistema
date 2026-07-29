import { VincereProyecto, VincereSeccion, VINCERE_SECCION_LABEL } from "./types";
import { formatFollowers, formatStreams } from "./format";

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

export function buildSectionContext(p: VincereProyecto, seccion: VincereSeccion): unknown {
  const base = { proyecto: p.nombre, genero: p.genero, fase: p.fase, tipo: p.tipo };
  const evolucion = historialReciente(p);

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
      };
    case "diagnostico":
      return { ...base, diagnostico: p.diagnostico };
    case "song":
      return {
        ...base,
        canciones: p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
        })),
      };
    case "audiencia":
      return { ...base, audiencia: p.audiencia };
    case "calor":
      return { ...base, zonasCalor: p.zonasCalor };
    case "management":
      return { ...base, decisiones: p.decisiones };
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

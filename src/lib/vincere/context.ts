import { VincereProyecto, VincereSeccion, VINCERE_SECCION_LABEL } from "./types";
import { formatFollowers, formatStreams } from "./format";

// Construye el contexto compacto que se le entrega a la IA por sección —
// solo la data de ESA sección, para que la interpretación sea específica y
// no un resumen genérico de todo el proyecto.
export function buildSectionContext(p: VincereProyecto, seccion: VincereSeccion): unknown {
  const base = { proyecto: p.nombre, genero: p.genero, fase: p.fase, tipo: p.tipo };

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
      return { ...base, kpis: p.kpis };
    default:
      return base;
  }
}

export function sectionTitle(seccion: VincereSeccion): string {
  return `Lectura VINCERE — ${VINCERE_SECCION_LABEL[seccion]}`;
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

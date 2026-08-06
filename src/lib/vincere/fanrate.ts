// Fan rate: qué proporción de quien escucha se queda.
//
// Es la métrica que separa un pico de un crecimiento. Un artista puede duplicar
// oyentes en un mes por una playlist editorial y no ganar un solo seguidor: eso
// no es carrera, es tráfico prestado. El fan rate lo hace visible.
//
// Se calcula contra OYENTES, no contra streams. Streams son reproducciones y
// oyentes son personas; dividir seguidores entre streams da un número que se
// ve igual de convincente y no significa nada. Si no hay oyentes cargados, esto
// devuelve null y lo dice — antes que inventar la cuenta.

import { VincereProyecto, VincereSnapshot } from "./types";

export interface FanRate {
  // Acumulado: de toda la audiencia que escucha hoy, qué parte siguió.
  pct: number;
  seguidores: number;
  oyentes: number;
}

export interface FanRateMarginal {
  // Lo que importa de verdad: de los oyentes GANADOS entre dos fotos, cuántos
  // se volvieron seguidores. El acumulado arrastra años de historia y esconde
  // lo que está pasando ahora.
  pct: number;
  oyentesGanados: number;
  seguidoresGanados: number;
  desde: string;
  hasta: string;
  // Si la audiencia bajó, el marginal no se puede leer como conversión.
  audienciaBajo: boolean;
}

export interface LecturaFanRate {
  actual: FanRate | null;
  marginal: FanRateMarginal | null;
  // Por qué falta, cuando falta. Es más útil que un guion.
  falta: string | null;
  // Referencia de lectura, no un estándar de industria: no existe una tabla
  // pública confiable de fan rate por género, y presentar una inventada sería
  // el peor error de este archivo.
  lectura: string;
}

function pct(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

export function calcularFanRate(p: VincereProyecto): LecturaFanRate {
  const oyentes = p.resumen.oyentesMes ?? 0;
  const seguidores = p.resumen.seguidores ?? 0;

  if (oyentes <= 0) {
    return {
      actual: null,
      marginal: null,
      falta:
        "Falta el dato de oyentes mensuales. Sale de Spotify for Artists → Audiencia, y es distinto de los streams: streams son reproducciones, oyentes son personas.",
      lectura: "",
    };
  }

  const actual: FanRate = { pct: pct(seguidores, oyentes), seguidores, oyentes };

  // El marginal necesita dos fotos con oyentes. Se toma la más vieja que los
  // tenga contra la de hoy: cuanto más separadas, más limpia la lectura.
  const conOyentes = (p.historial ?? [])
    .filter((s: VincereSnapshot) => (s.oyentesMes ?? 0) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  let marginal: FanRateMarginal | null = null;
  const primera = conOyentes[0];
  if (primera && primera.oyentesMes) {
    const oyentesGanados = oyentes - primera.oyentesMes;
    const seguidoresGanados = seguidores - primera.seguidores;
    marginal = {
      pct: oyentesGanados > 0 ? pct(seguidoresGanados, oyentesGanados) : 0,
      oyentesGanados,
      seguidoresGanados,
      desde: primera.fecha,
      hasta: new Date().toISOString().slice(0, 10),
      audienciaBajo: oyentesGanados <= 0,
    };
  }

  return {
    actual,
    marginal,
    falta: marginal
      ? null
      : "Con una sola carga no hay fan rate marginal, que es el que dice si el crecimiento de ahora está convirtiendo. Aparece con la segunda carga de data.",
    lectura: leer(actual, marginal),
  };
}

function leer(a: FanRate, m: FanRateMarginal | null): string {
  if (m && !m.audienciaBajo && m.oyentesGanados > 0) {
    if (m.pct > a.pct * 1.15) {
      return "La audiencia que está entrando ahora convierte mejor que la histórica: lo que se está haciendo atrae gente que se queda.";
    }
    if (m.pct < a.pct * 0.6) {
      return "La audiencia nueva convierte peor que la histórica. Está entrando tráfico que escucha y sigue de largo — típico de un empuje de playlist o de pauta mal apuntada.";
    }
    return "La audiencia nueva convierte parecido a la histórica: el crecimiento mantiene la calidad de fan que ya tenía.";
  }
  if (m?.audienciaBajo) {
    return "Los oyentes bajaron respecto a la primera foto, así que el marginal no se puede leer como conversión. Lo que dice es que se perdió audiencia, no que se convirtió mal.";
  }
  return "";
}

// Fan rate de una foto concreta del histórico. Sirve para dibujar la evolución.
export function fanRateDeSnapshot(s: VincereSnapshot): number | null {
  if (!s.oyentesMes || s.oyentesMes <= 0) return null;
  return pct(s.seguidores, s.oyentesMes);
}

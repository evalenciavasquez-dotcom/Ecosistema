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

// Qué pasó con la audiencia entre las dos fotos. Son tres cosas distintas y
// tratarlas como una sola producía un diagnóstico falso: con cero oyentes
// ganados el sistema decía «los oyentes bajaron», y no habían bajado — se
// habían quedado quietos, que significa otra cosa.
export type MovimientoAudiencia = "creció" | "plana" | "cayó";

export interface FanRateMarginal {
  // De los oyentes GANADOS entre dos fotos, cuántos se volvieron seguidores.
  // El acumulado arrastra años de historia y esconde lo que está pasando ahora.
  pct: number;
  oyentesGanados: number;
  seguidoresGanados: number;
  desde: string;
  hasta: string;
  // Cuántos días cubre. Sin esto, «marginal» es una palabra que no dice nada:
  // no es lo mismo medir sobre treinta días que sobre siete meses.
  dias: number;
  movimiento: MovimientoAudiencia;
  // Un porcentaje por encima de 100 NO es una tasa de conversión: significa que
  // entraron más seguidores que oyentes nuevos, lo cual es posible —se sigue a
  // un artista sin ser oyente mensual ese mes— pero ya no mide conversión.
  // Presentarlo como «convierte mejor» sería una cifra falsa y muy citable.
  imposibleComoConversion: boolean;
  // Si la audiencia bajó, el marginal no se puede leer como conversión.
  audienciaBajo: boolean;
}

export interface LecturaFanRate {
  actual: FanRate | null;
  // El tramo reciente: la última foto contra hoy. Responde «¿lo que estoy
  // haciendo AHORA convierte?».
  marginal: FanRateMarginal | null;
  // Todo el recorrido: la foto más vieja contra hoy. Responde «¿la fase de
  // crecimiento completa convirtió?». Son preguntas distintas y antes se
  // respondían las dos con el mismo número, etiquetado como si fuera la
  // primera.
  desdeElInicio: FanRateMarginal | null;
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
      desdeElInicio: null,
      falta:
        "Falta el dato de oyentes mensuales. Sale de Spotify for Artists → Audiencia, y es distinto de los streams: streams son reproducciones, oyentes son personas.",
      lectura: "",
    };
  }

  const actual: FanRate = { pct: pct(seguidores, oyentes), seguidores, oyentes };

  const conOyentes = (p.historial ?? [])
    .filter((s: VincereSnapshot) => (s.oyentesMes ?? 0) > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const hoy = new Date().toISOString().slice(0, 10);

  // La ÚLTIMA foto contra hoy: eso es lo que está pasando ahora.
  //
  // Antes esto se calculaba contra la foto más VIEJA y se llamaba igual. Con
  // ocho meses de historial, el número decía «la audiencia que está entrando
  // ahora» mientras medía ocho meses — y ese es justo el error que el marginal
  // existe para evitar, porque es el mismo defecto del acumulado con otro
  // nombre.
  const marginal = tramo(conOyentes[conOyentes.length - 1], oyentes, seguidores, hoy);
  const desdeElInicio = conOyentes.length > 1 ? tramo(conOyentes[0], oyentes, seguidores, hoy) : null;

  return {
    actual,
    marginal,
    desdeElInicio,
    falta: marginal
      ? null
      : "Con una sola carga no hay fan rate marginal, que es el que dice si el crecimiento de ahora está convirtiendo. Aparece con la segunda carga de data.",
    lectura: leer(actual, marginal),
  };
}

function tramo(
  base: VincereSnapshot | undefined,
  oyentes: number,
  seguidores: number,
  hoy: string
): FanRateMarginal | null {
  if (!base || !base.oyentesMes) return null;

  const oyentesGanados = oyentes - base.oyentesMes;
  const seguidoresGanados = seguidores - base.seguidores;
  const crudo = oyentesGanados > 0 ? pct(seguidoresGanados, oyentesGanados) : 0;

  const movimiento: MovimientoAudiencia =
    oyentesGanados > 0 ? "creció" : oyentesGanados === 0 ? "plana" : "cayó";

  const dias = Math.max(
    0,
    Math.round(
      (new Date(hoy + "T12:00:00").getTime() - new Date(base.fecha + "T12:00:00").getTime()) / 86400000
    )
  );

  return {
    pct: crudo,
    oyentesGanados,
    seguidoresGanados,
    desde: base.fecha,
    hasta: hoy,
    dias,
    movimiento,
    imposibleComoConversion: crudo > 100,
    audienciaBajo: oyentesGanados < 0,
  };
}

function leer(a: FanRate, m: FanRateMarginal | null): string {
  if (!m) return "";

  if (m.movimiento === "cayó") {
    return `Los oyentes cayeron ${Math.abs(m.oyentesGanados).toLocaleString(
      "es"
    )} desde la última carga, así que este número no se puede leer como conversión. Lo que dice es que se perdió audiencia, no que se convirtió mal.`;
  }

  if (m.movimiento === "plana") {
    return `Los oyentes quedaron igual desde la última carga: no hay audiencia nueva sobre la cual medir conversión. No es una caída — es que no pasó nada, que también es una lectura.`;
  }

  // Más seguidores que oyentes nuevos. Es posible y no es conversión: se puede
  // seguir a un artista sin ser oyente mensual ese mes (llegó por un video, por
  // un show, por un feature). Llamarlo «convierte mejor» sería falso.
  if (m.imposibleComoConversion) {
    return `Entraron ${m.seguidoresGanados.toLocaleString("es")} seguidores contra ${m.oyentesGanados.toLocaleString(
      "es"
    )} oyentes nuevos: más seguidores que oyentes. Eso no es una tasa de conversión —da ${m.pct}%, que como conversión es imposible—: significa que están llegando seguidores por fuera del streaming, de un video, un show o un feature. Es buena señal, pero se mide en otro lado.`;
  }

  if (m.pct > a.pct * 1.15) {
    return "La audiencia que está entrando ahora convierte mejor que la histórica: lo que se está haciendo atrae gente que se queda.";
  }
  if (m.pct < a.pct * 0.6) {
    return "La audiencia nueva convierte peor que la histórica. Está entrando tráfico que escucha y sigue de largo — típico de un empuje de playlist o de pauta mal apuntada.";
  }
  return "La audiencia nueva convierte parecido a la histórica: el crecimiento mantiene la calidad de fan que ya tenía.";
}

// Fan rate de una foto concreta del histórico. Sirve para dibujar la evolución.
export function fanRateDeSnapshot(s: VincereSnapshot): number | null {
  if (!s.oyentesMes || s.oyentesMes <= 0) return null;
  return pct(s.seguidores, s.oyentesMes);
}

// Firma sonora: en qué se parece y en qué NO se parece la candidata a las
// canciones que ya le funcionaron a este artista.
//
// La tesis que sostiene: una canción también se pega por cómo está hecha —el
// peso del bajo, dónde entra el gancho, qué tan densa es la letra— y esas cosas
// se miden. Este módulo no las interpreta: las pone lado a lado con números.
//
// LO QUE ESTO NO ES, y hay que decirlo antes que nada: no predice éxito.
// Parecerse a lo que funcionó no lo causa, y tres canciones son una muestra
// diminuta. Lo que sí hace es convertir "me suena distinta" en "está 14 puntos
// por debajo en peso de graves", que es una frase que se puede discutir.
//
// Comparar contra el propio artista y no contra el género es deliberado: no
// existe una tabla pública confiable de "cómo suena el reguetón que pega", y
// usar una inventada sería peor que no comparar.

import { VincereCancion } from "./types";

export type Direccion = "dentro" | "porDebajo" | "porEncima";

export interface DimensionComparada {
  clave: string;
  label: string;
  unidad: string;
  // Cómo se nombra la diferencia dentro de una frase. Es distinto de 'unidad':
  // una escala 0-100 se muestra como "0-100" al lado del valor, pero en una
  // oración se dice "11 puntos por debajo", no "11 0-100 por debajo".
  unidadEnFrase: string;
  // Cómo leer la diferencia. No todas las dimensiones tienen un "mejor".
  queSignifica: string;
  candidata: number;
  refMin: number;
  refMax: number;
  refMedia: number;
  direccion: Direccion;
  // Distancia al borde del rango de referencia, en la unidad de la dimensión.
  // 0 cuando cae dentro.
  distancia: number;
  refsUsadas: number;
}

export interface FirmaComparada {
  candidata: string;
  referencias: string[];
  dimensiones: DimensionComparada[];
  // Las que se salen del rango, de mayor a menor distancia relativa.
  fueraDeRango: DimensionComparada[];
  // Qué no se pudo comparar y por qué. Tan importante como lo que sí.
  noComparables: string[];
  advertencia: string;
}

interface Def {
  clave: string;
  label: string;
  unidad: string;
  unidadEnFrase: string;
  queSignifica: string;
  // Escala típica de la dimensión, para poder ordenar las distancias entre
  // magnitudes distintas (un BPM y un porcentaje no se comparan directo).
  escala: number;
  valor: (c: VincereCancion) => number | null;
}

const DEFS: Def[] = [
  {
    clave: "pesoGraves",
    label: "Peso de graves",
    unidad: "% de energía bajo 200 Hz",
    unidadEnFrase: "puntos",
    queSignifica:
      "Cuánto del cuerpo de la canción vive en el bajo. Es lo que se siente en un parlante de carro o de discoteca antes que cualquier otra cosa.",
    escala: 100,
    valor: (c) => c.audio?.pesoGraves ?? null,
  },
  {
    clave: "energiaMedia",
    label: "Energía media",
    unidad: "0-100",
    unidadEnFrase: "puntos",
    queSignifica: "Qué tan constante es la intensidad. Alta se sostiene sola; baja necesita que la letra cargue.",
    escala: 100,
    valor: (c) => c.audio?.energiaMedia ?? null,
  },
  {
    clave: "brillo",
    label: "Brillo",
    unidad: "0-100",
    unidadEnFrase: "puntos",
    queSignifica: "Cuánta energía está en los agudos. Es lo que hace que una mezcla suene abierta o cerrada.",
    escala: 100,
    valor: (c) => c.audio?.brillo ?? null,
  },
  {
    clave: "densidad",
    label: "Densidad rítmica",
    unidad: "eventos por segundo",
    unidadEnFrase: "eventos por segundo",
    queSignifica: "Cuánto pasa por segundo. Mucha densidad llena; poca deja aire para la voz.",
    escala: 10,
    valor: (c) => c.audio?.densidad ?? null,
  },
  {
    clave: "rangoDinamico",
    label: "Rango dinámico",
    unidad: "dB",
    unidadEnFrase: "dB",
    queSignifica:
      "Distancia entre lo suave y lo fuerte. Rango chico suena más alto en una playlist; rango amplio deja respirar la producción.",
    escala: 20,
    valor: (c) => c.audio?.rangoDinamico ?? null,
  },
  {
    clave: "bpm",
    label: "Tempo",
    unidad: "BPM",
    unidadEnFrase: "BPM",
    queSignifica: "La velocidad. Cambia con qué se mezcla la canción en una playlist y en un set.",
    escala: 60,
    // Un BPM medido con poca confianza no se compara: daría una diferencia
    // falsa sobre un número que el propio análisis no sostiene.
    valor: (c) => (c.audio && c.audio.bpm > 0 && c.audio.bpmConfianza >= 0.3 ? c.audio.bpm : null),
  },
  {
    clave: "ganchoSeg",
    label: "Cuándo entra el gancho",
    unidad: "segundos",
    unidadEnFrase: "segundos",
    queSignifica:
      "En qué segundo la canción llega a su punto alto. Es lo que decide si alguien se queda o se salta — y en streaming los primeros treinta segundos son el examen.",
    escala: 40,
    valor: (c) => c.audio?.ganchoSeg ?? null,
  },
  {
    clave: "duracionSeg",
    label: "Duración",
    unidad: "segundos",
    unidadEnFrase: "segundos",
    queSignifica: "Lo que dura. Afecta cuántas reproducciones completas caben en una sesión.",
    escala: 60,
    valor: (c) => c.audio?.duracionSeg ?? null,
  },
  {
    clave: "densidadLexica",
    label: "Densidad de la letra",
    unidad: "% de palabras distintas",
    unidadEnFrase: "puntos",
    queSignifica:
      "Baja significa repetitiva y pegajosa; alta significa narrativa. Ninguna es mejor: dependen de qué le funciona a este artista.",
    escala: 100,
    valor: (c) => c.metrica?.densidadLexica ?? null,
  },
  {
    clave: "silabasMedia",
    label: "Sílabas por verso",
    unidad: "sílabas",
    unidadEnFrase: "sílabas",
    queSignifica: "El largo del verso. Marca el flow y qué tan cómodo es cantarla encima del beat.",
    escala: 16,
    valor: (c) => c.metrica?.silabasMedia ?? null,
  },
  {
    clave: "regularidad",
    label: "Regularidad métrica",
    unidad: "%",
    unidadEnFrase: "puntos",
    queSignifica: "Qué parte de los versos se ciñe al mismo metro. Alta se memoriza más fácil; baja suena más hablada.",
    escala: 100,
    valor: (c) => c.metrica?.regularidad ?? null,
  },
];

const MIN_REFS = 2;

// Las que ya funcionaron, por defecto: las de más streams. Es la vara que el
// artista ya se ganó, no una tabla de género.
export function referenciasSugeridas(canciones: VincereCancion[], excluirId: string, cuantas = 3): VincereCancion[] {
  return canciones
    .filter((c) => c.id !== excluirId && c.audio)
    .sort((a, b) => b.streams - a.streams)
    .slice(0, cuantas);
}

function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function compararFirma(candidata: VincereCancion, referencias: VincereCancion[]): FirmaComparada {
  const dimensiones: DimensionComparada[] = [];
  const noComparables: string[] = [];

  for (const d of DEFS) {
    const vc = d.valor(candidata);
    const vrefs = referencias.map(d.valor).filter((v): v is number => v != null);

    if (vc == null) {
      noComparables.push(`${d.label}: falta el dato en «${candidata.nombre}».`);
      continue;
    }
    if (vrefs.length < MIN_REFS) {
      noComparables.push(
        `${d.label}: solo ${vrefs.length} de ${referencias.length} referencias lo tienen; con menos de ${MIN_REFS} no hay rango que comparar.`
      );
      continue;
    }

    const refMin = Math.min(...vrefs);
    const refMax = Math.max(...vrefs);
    const refMedia = mediana(vrefs);

    let direccion: Direccion = "dentro";
    let distancia = 0;
    if (vc < refMin) {
      direccion = "porDebajo";
      distancia = r1(refMin - vc);
    } else if (vc > refMax) {
      direccion = "porEncima";
      distancia = r1(vc - refMax);
    }

    dimensiones.push({
      clave: d.clave,
      label: d.label,
      unidad: d.unidad,
      unidadEnFrase: d.unidadEnFrase,
      queSignifica: d.queSignifica,
      candidata: r1(vc),
      refMin: r1(refMin),
      refMax: r1(refMax),
      refMedia: r1(refMedia),
      direccion,
      distancia,
      refsUsadas: vrefs.length,
    });
  }

  // Se ordenan por distancia relativa a la escala de cada dimensión: 10 BPM y
  // 10 puntos de graves no son la misma diferencia.
  const fueraDeRango = dimensiones
    .filter((x) => x.direccion !== "dentro")
    .sort((a, b) => {
      const ea = DEFS.find((d) => d.clave === a.clave)!.escala;
      const eb = DEFS.find((d) => d.clave === b.clave)!.escala;
      return b.distancia / eb - a.distancia / ea;
    });

  return {
    candidata: candidata.nombre,
    referencias: referencias.map((r) => r.nombre),
    dimensiones,
    fueraDeRango,
    noComparables,
    advertencia:
      referencias.length < 3
        ? `Solo ${referencias.length} referencia(s). Con tan pocas, el "rango" es casi una línea y cualquier diferencia se ve grande. Esto ubica, no concluye.`
        : "Parecerse a lo que funcionó no lo causa: esto ubica la canción frente al propio historial del artista, no predice cómo le va a ir. Con tres o cuatro referencias la muestra sigue siendo diminuta.",
  };
}

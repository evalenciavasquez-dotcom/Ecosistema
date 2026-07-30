// Métrica de la letra: sílabas por verso, rima y estilo de escritura.
//
// Esto no lo hace la IA. Contar sílabas es una regla, no una interpretación, y
// una regla se aplica igual siempre — un modelo de lenguaje se equivoca al
// contar y además cambia de respuesta entre llamadas. Así que se mide aquí y
// lo medido se le entrega a la IA para que lo INTERPRETE, que es lo suyo.
//
// Se aplican las reglas de la métrica española: sinalefa entre palabras y
// ajuste por el acento de la última palabra del verso.

import { VincereLetraMetrica } from "./types";

const VOCALES_FUERTES = "aeoáéó";
const VOCALES_DEBILES = "iuü";
const VOCALES_DEBILES_TILDADAS = "íú";
const TODAS_VOCALES = VOCALES_FUERTES + VOCALES_DEBILES + VOCALES_DEBILES_TILDADAS;

function esVocal(c: string): boolean {
  return TODAS_VOCALES.includes(c);
}

function sinTilde(c: string): string {
  const mapa: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" };
  return mapa[c] ?? c;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[""«»"'`´]/g, "")
    .replace(/[¡!¿?.,;:()\[\]—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Núcleos vocálicos de una palabra. Dos vocales seguidas forman diptongo (un
// solo núcleo) salvo que ambas sean fuertes o la débil lleve tilde — que es
// justo cuando hay hiato y cuentan por separado.
function nucleosDePalabra(palabra: string): number {
  let nucleos = 0;
  let i = 0;
  while (i < palabra.length) {
    if (!esVocal(palabra[i])) {
      i++;
      continue;
    }
    nucleos++;
    let j = i + 1;
    while (j < palabra.length && esVocal(palabra[j])) {
      const a = palabra[j - 1];
      const b = palabra[j];
      const aFuerte = VOCALES_FUERTES.includes(a);
      const bFuerte = VOCALES_FUERTES.includes(b);
      const hiato =
        (aFuerte && bFuerte) ||
        VOCALES_DEBILES_TILDADAS.includes(a) ||
        VOCALES_DEBILES_TILDADAS.includes(b) ||
        (sinTilde(a) === sinTilde(b) && !VOCALES_DEBILES.includes(sinTilde(a)));
      if (hiato) break;
      j++;
    }
    i = j;
  }
  return nucleos;
}

type Acentuacion = "aguda" | "llana" | "esdrujula";

// Dónde cae el acento de una palabra, por las reglas ortográficas del español.
function acentuacion(palabra: string): Acentuacion {
  const nucleos = nucleosDePalabra(palabra);
  if (nucleos <= 1) return "aguda";

  const posTilde = [...palabra].findIndex((c) => "áéíóú".includes(c));
  if (posTilde >= 0) {
    // Se cuenta desde el final qué núcleo lleva la tilde.
    let nucleosTrasTilde = 0;
    let i = posTilde + 1;
    while (i < palabra.length) {
      if (esVocal(palabra[i])) {
        nucleosTrasTilde++;
        while (i + 1 < palabra.length && esVocal(palabra[i + 1])) i++;
      }
      i++;
    }
    if (nucleosTrasTilde === 0) return "aguda";
    if (nucleosTrasTilde === 1) return "llana";
    return "esdrujula";
  }

  const ultima = palabra[palabra.length - 1];
  // Sin tilde: llana si termina en vocal, n o s; aguda en cualquier otro caso.
  return esVocal(ultima) || ultima === "n" || ultima === "s" ? "llana" : "aguda";
}

/**
 * Sílabas métricas de un verso, con sinalefa y ajuste por acento final.
 * Es el conteo que usa la poesía y la canción en español, no el conteo
 * gramatical: "vine a verte" son 4 sílabas métricas, no 5.
 */
export function silabasDeVerso(verso: string): number {
  const limpio = normalizar(verso);
  if (!limpio) return 0;
  const palabras = limpio.split(" ").filter(Boolean);
  if (!palabras.length) return 0;

  let total = 0;
  for (let p = 0; p < palabras.length; p++) {
    total += nucleosDePalabra(palabras[p]);
    // Sinalefa: si esta palabra acaba en vocal y la siguiente empieza por
    // vocal (o h muda), las dos sílabas se funden en una.
    if (p < palabras.length - 1) {
      const actual = palabras[p];
      const siguiente = palabras[p + 1];
      const finVocal = esVocal(actual[actual.length - 1]);
      const inicio = siguiente[0] === "h" ? siguiente[1] : siguiente[0];
      if (finVocal && inicio && esVocal(inicio)) total -= 1;
    }
  }

  // La regla del acento final: verso agudo suma una, esdrújulo resta una.
  const ultimaPalabra = palabras[palabras.length - 1];
  const ac = acentuacion(ultimaPalabra);
  if (ac === "aguda") total += 1;
  else if (ac === "esdrujula") total -= 1;

  return Math.max(0, total);
}

// Terminación rimada de un verso: desde su última vocal acentuada hasta el
// final. Es lo que define si dos versos riman.
function terminacion(verso: string): { consonante: string; asonante: string } | null {
  const limpio = normalizar(verso);
  const palabras = limpio.split(" ").filter(Boolean);
  if (!palabras.length) return null;
  const palabra = palabras[palabras.length - 1];

  const posiciones: number[] = [];
  for (let i = 0; i < palabra.length; i++) {
    if (!esVocal(palabra[i])) continue;
    posiciones.push(i);
    while (i + 1 < palabra.length && esVocal(palabra[i + 1])) i++;
  }
  if (!posiciones.length) return null;

  const ac = acentuacion(palabra);
  const desdeElFinal = ac === "aguda" ? 1 : ac === "llana" ? 2 : 3;
  const idx = Math.max(0, posiciones.length - desdeElFinal);
  const desde = posiciones[idx];

  const cola = palabra.slice(desde);
  const consonante = [...cola].map(sinTilde).join("");
  const asonante = [...cola]
    .filter(esVocal)
    .map(sinTilde)
    // En rima asonante los diptongos cuentan solo por su vocal fuerte.
    .filter((v, i, arr) => i === 0 || arr.length <= 2 || VOCALES_FUERTES.includes(v))
    .join("");

  return { consonante, asonante };
}

const LETRAS_RIMA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Mide la letra: métrica, rima y rasgos de estilo. Devuelve números; la
 * lectura de qué significan es trabajo de la IA.
 */
export function analizarLetra(letra: string): VincereLetraMetrica | null {
  const versos = letra
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (versos.length < 2) return null;

  const silabas = versos.map(silabasDeVerso);
  const validas = silabas.filter((s) => s > 0);
  if (!validas.length) return null;

  const media = validas.reduce((a, b) => a + b, 0) / validas.length;

  // Metro dominante: el número de sílabas que más se repite. Si más de la
  // mitad de los versos lo comparten, la canción tiene métrica regular.
  const conteo = new Map<number, number>();
  for (const s of validas) conteo.set(s, (conteo.get(s) ?? 0) + 1);
  let metricaDominante: number | null = null;
  let masFrecuente = 0;
  for (const [silabasVerso, veces] of conteo) {
    if (veces > masFrecuente) {
      masFrecuente = veces;
      metricaDominante = silabasVerso;
    }
  }
  // Se admite ±1 sílaba: en canción el fraseo absorbe esa diferencia y seguir
  // llamando irregular a eso sería una lectura falsa.
  let cercaDelMetro = 0;
  for (const s of validas) if (metricaDominante !== null && Math.abs(s - metricaDominante) <= 1) cercaDelMetro++;
  const regularidad = Math.round((cercaDelMetro / validas.length) * 100);

  // Esquema de rima: se etiquetan las terminaciones por orden de aparición.
  const terminaciones = versos.map(terminacion);
  const etiquetas: string[] = [];
  const vistas: { consonante: string; asonante: string; letra: string }[] = [];
  let consonantes = 0;
  let asonantes = 0;

  for (const t of terminaciones) {
    if (!t) {
      etiquetas.push("-");
      continue;
    }
    const previa = vistas.find((v) => v.consonante === t.consonante || (v.asonante === t.asonante && t.asonante.length >= 2));
    if (previa) {
      etiquetas.push(previa.letra);
      if (previa.consonante === t.consonante) consonantes++;
      else asonantes++;
    } else {
      const letraNueva = LETRAS_RIMA[vistas.length % LETRAS_RIMA.length];
      vistas.push({ ...t, letra: letraNueva });
      etiquetas.push(letraNueva);
    }
  }

  const versosRimados = consonantes + asonantes;
  const tipoRima: VincereLetraMetrica["tipoRima"] =
    versosRimados < versos.length * 0.25
      ? "libre"
      : consonantes > asonantes * 2
        ? "consonante"
        : asonantes > consonantes * 2
          ? "asonante"
          : "mixta";

  // Estilo: densidad léxica y repetición. Un estribillo pegajoso tiene poca
  // densidad y mucha repetición; una letra narrativa, lo contrario.
  const palabras = normalizar(letra).split(" ").filter(Boolean);
  const unicas = new Set(palabras);
  const densidadLexica = palabras.length ? Math.round((unicas.size / palabras.length) * 100) : 0;

  const cuentaVersos = new Map<string, number>();
  for (const v of versos) {
    const clave = normalizar(v);
    if (clave.length < 4) continue;
    cuentaVersos.set(clave, (cuentaVersos.get(clave) ?? 0) + 1);
  }
  const repeticiones = [...cuentaVersos.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([texto, veces]) => ({ texto, veces }));

  return {
    versos: versos.length,
    silabasPorVerso: silabas,
    silabasMedia: Math.round(media * 10) / 10,
    metricaDominante,
    regularidad,
    esquemaRima: etiquetas.slice(0, 16).join(""),
    tipoRima,
    densidadLexica,
    repeticiones,
    palabrasTotal: palabras.length,
  };
}

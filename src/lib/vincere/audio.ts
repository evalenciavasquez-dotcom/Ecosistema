// Análisis de señal de audio para Song Intelligence.
//
// Claude no acepta audio como entrada — solo texto, imagen y PDF. Así que el
// audio no se le manda: se MIDE aquí, en el navegador, y lo que viaja a la IA
// son los números. Es la misma división que el resto de la plataforma (capa
// data / capa interpretación), y tiene tres ventajas prácticas: el archivo
// nunca sale del equipo de Eduardo, no hay costo de subida ni almacenamiento,
// y no hay material con derechos viajando a ningún servidor.
//
// Todo lo de aquí es DSP clásico escrito a mano, sin dependencias: una FFT
// radix-2, flujo espectral para los onsets, autocorrelación para el tempo y
// una matriz de auto-similitud con kernel de tablero para partir la canción en
// secciones. Se evita una librería a propósito — ninguna da directamente lo
// que hace falta (dónde entra el gancho), y un WASM de varios MB por eso no
// se justifica.

import { VincereAudioAnalisis, VincereAudioSeccion } from "./types";

// 22050 Hz basta: por encima de 11 kHz no hay información que cambie ninguna
// de estas medidas, y bajar la frecuencia divide el trabajo por dos.
const SR_OBJETIVO = 22050;
const VENTANA = 2048;
const SALTO = 512;

// --- FFT radix-2 iterativa, in-place ---
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const mitad = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < mitad; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + mitad];
        const xi = im[i + k + mitad];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + mitad] = ur - vr;
        im[i + k + mitad] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function ventanaHann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// Mezcla a mono y remuestrea por interpolación lineal. Suficiente para medir:
// no se va a reproducir este audio, solo analizarlo.
function aMonoRemuestreado(buffer: AudioBuffer, srDestino: number): Float32Array {
  const canales = buffer.numberOfChannels;
  const origen = buffer.length;
  const mono = new Float32Array(origen);
  for (let c = 0; c < canales; c++) {
    const datos = buffer.getChannelData(c);
    for (let i = 0; i < origen; i++) mono[i] += datos[i] / canales;
  }
  if (Math.abs(buffer.sampleRate - srDestino) < 1) return mono;

  const razon = buffer.sampleRate / srDestino;
  const destino = Math.floor(origen / razon);
  const salida = new Float32Array(destino);
  for (let i = 0; i < destino; i++) {
    const pos = i * razon;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = mono[i0] ?? 0;
    const b = mono[i0 + 1] ?? a;
    salida[i] = a + (b - a) * frac;
  }
  return salida;
}

interface Espectrograma {
  magnitudes: Float32Array[]; // por marco, VENTANA/2 bins
  rms: Float32Array; // energía por marco
  centroide: Float32Array; // centroide espectral en Hz
  marcosPorSegundo: number;
}

function calcularEspectrograma(muestras: Float32Array, sr: number): Espectrograma {
  const ventana = ventanaHann(VENTANA);
  const bins = VENTANA >> 1;
  const marcos = Math.max(1, Math.floor((muestras.length - VENTANA) / SALTO) + 1);

  const magnitudes: Float32Array[] = new Array(marcos);
  const rms = new Float32Array(marcos);
  const centroide = new Float32Array(marcos);

  const re = new Float32Array(VENTANA);
  const im = new Float32Array(VENTANA);
  const hzPorBin = sr / VENTANA;

  for (let m = 0; m < marcos; m++) {
    const inicio = m * SALTO;
    let suma = 0;
    for (let i = 0; i < VENTANA; i++) {
      const s = muestras[inicio + i] ?? 0;
      suma += s * s;
      re[i] = s * ventana[i];
      im[i] = 0;
    }
    rms[m] = Math.sqrt(suma / VENTANA);

    fft(re, im);

    const mag = new Float32Array(bins);
    let pesoTotal = 0;
    let pesoFrec = 0;
    for (let k = 0; k < bins; k++) {
      const v = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      mag[k] = v;
      pesoTotal += v;
      pesoFrec += v * k * hzPorBin;
    }
    magnitudes[m] = mag;
    centroide[m] = pesoTotal > 1e-9 ? pesoFrec / pesoTotal : 0;
  }

  return { magnitudes, rms, centroide, marcosPorSegundo: sr / SALTO };
}

// Flujo espectral rectificado: cuánta energía APARECE de un marco al siguiente.
// Es la señal donde se ven los golpes, y de ella salen tanto el tempo como la
// densidad rítmica.
//
// El flujo se calcula POR BANDAS LOGARÍTMICAS y luego se promedia. Sumar todos
// los bins por igual parece lo natural y está mal: los bins de la FFT están
// espaciados linealmente, así que la zona aguda tiene cientos de bins contra
// un puñado en los graves. Un charles de banda ancha aporta entonces mucho más
// flujo que un bombo, y el detector acaba marcando el tempo de las corcheas en
// vez del pulso. Igualar el peso de cada banda corrige ese sesgo de raíz.
function envolventeDeOnsets(esp: Espectrograma, sr: number): Float32Array {
  const { magnitudes } = esp;
  const marcos = magnitudes.length;
  const bins = magnitudes[0].length;
  const flujo = new Float32Array(marcos);

  const BANDAS = 24;
  const hzPorBin = sr / VENTANA;
  const limites: number[] = [];
  for (let b = 0; b <= BANDAS; b++) {
    const hz = 40 * Math.pow(11000 / 40, b / BANDAS);
    limites.push(Math.min(bins, Math.max(1, Math.round(hz / hzPorBin))));
  }

  for (let m = 1; m < marcos; m++) {
    const actual = magnitudes[m];
    const previo = magnitudes[m - 1];
    let suma = 0;
    let bandasUsadas = 0;
    for (let b = 0; b < BANDAS; b++) {
      const desde = limites[b];
      const hasta = limites[b + 1];
      if (hasta <= desde) continue;
      let banda = 0;
      for (let k = desde; k < hasta; k++) {
        const d = actual[k] - previo[k];
        if (d > 0) banda += d;
      }
      // Media dentro de la banda: así una banda ancha no vale más que una
      // estrecha solo por tener más bins.
      suma += banda / (hasta - desde);
      bandasUsadas++;
    }
    flujo[m] = bandasUsadas ? suma / bandasUsadas : 0;
  }

  // Se le resta su propia media móvil: quita la tendencia lenta (un tema que
  // crece de volumen) y deja solo los picos, que es lo rítmico.
  const ventana = Math.round(esp.marcosPorSegundo * 0.4);
  const limpio = new Float32Array(marcos);
  for (let m = 0; m < marcos; m++) {
    let suma = 0;
    let n = 0;
    for (let i = Math.max(0, m - ventana); i <= Math.min(marcos - 1, m + ventana); i++) {
      suma += flujo[i];
      n++;
    }
    limpio[m] = Math.max(0, flujo[m] - suma / n);
  }
  return limpio;
}

interface Tempo {
  bpm: number;
  confianza: number;
}

// Autocorrelación de la envolvente sobre una rejilla continua de BPM. Se
// evalúa cada candidato con interpolación lineal en vez de saltar de muestra
// en muestra: a 160 BPM la diferencia entre dos retardos enteros son varios
// BPM, y eso haría inútil el número.
function detectarTempo(onsets: Float32Array, marcosPorSegundo: number): Tempo {
  const n = onsets.length;
  if (n < marcosPorSegundo * 4) return { bpm: 0, confianza: 0 };

  let media = 0;
  for (let i = 0; i < n; i++) media += onsets[i];
  media /= n;
  const centrado = new Float32Array(n);
  for (let i = 0; i < n; i++) centrado[i] = onsets[i] - media;

  let energia = 0;
  for (let i = 0; i < n; i++) energia += centrado[i] * centrado[i];
  if (energia < 1e-9) return { bpm: 0, confianza: 0 };

  const correlacionEn = (retardo: number): number => {
    const base = Math.floor(retardo);
    const frac = retardo - base;
    let suma = 0;
    const limite = n - base - 2;
    for (let i = 0; i < limite; i++) {
      const a = centrado[i + base];
      const b = centrado[i + base + 1];
      suma += centrado[i] * (a + (b - a) * frac);
    }
    return suma / energia;
  };

  let mejorBpm = 0;
  let mejorPuntaje = -Infinity;
  const puntajes: { bpm: number; puntaje: number }[] = [];

  for (let bpm = 60; bpm <= 200; bpm += 0.25) {
    const retardo = (60 / bpm) * marcosPorSegundo;
    if (retardo >= n - 3) continue;

    // Un pulso periódico correlaciona igual de bien con su propio periodo que
    // con el doble y el cuádruple: la autocorrelación sola no distingue 120 de
    // 60, y de ahí salen los errores de octava. Se resuelve como lo hacen los
    // detectores de ritmo reales — con una preferencia log-normal centrada en
    // 120 BPM. Cuando la señal es ambigua entre T y 2T, la que un humano
    // marcaría con el pie es casi siempre la más cercana a 120.
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);

    // Refuerzo leve del compás: ayuda cuando la envolvente es pobre, pero se
    // mantiene bajo para no reintroducir el sesgo hacia tempos lentos.
    let bruto = correlacionEn(retardo);
    const r2 = retardo * 2;
    if (r2 < n - 3) bruto += 0.3 * correlacionEn(r2);

    const puntaje = bruto * prior;
    puntajes.push({ bpm, puntaje });
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorBpm = bpm;
    }
  }

  if (mejorBpm === 0) return { bpm: 0, confianza: 0 };

  // La confianza compara el pico con el resto: un tema con pulso claro deja un
  // pico muy por encima de la media; uno sin ritmo marcado, apenas.
  let suma = 0;
  for (const p of puntajes) suma += p.puntaje;
  const mediaPuntaje = suma / puntajes.length;
  let varianza = 0;
  for (const p of puntajes) varianza += (p.puntaje - mediaPuntaje) ** 2;
  const desv = Math.sqrt(varianza / puntajes.length);
  const confianza = desv > 1e-9 ? Math.min(1, Math.max(0, (mejorPuntaje - mediaPuntaje) / (desv * 4))) : 0;

  return { bpm: Math.round(mejorBpm * 10) / 10, confianza: Math.round(confianza * 100) / 100 };
}

// Perfiles de Krumhansl-Schmuckler: el peso que tiene cada grado de la escala
// en música tonal. Correlacionar el cromagrama del tema contra las 24
// rotaciones da la tonalidad más probable.
const PERFIL_MAYOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTAS = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

function detectarTonalidad(esp: Espectrograma, sr: number): string | null {
  const bins = esp.magnitudes[0].length;
  const croma = new Float64Array(12);
  const hzPorBin = sr / VENTANA;

  for (const mag of esp.magnitudes) {
    for (let k = 1; k < bins; k++) {
      const hz = k * hzPorBin;
      // Fuera de este rango hay más ruido y armónicos que información tonal.
      if (hz < 65 || hz > 2100) continue;
      const midi = 69 + 12 * Math.log2(hz / 440);
      const clase = ((Math.round(midi) % 12) + 12) % 12;
      croma[clase] += mag[k];
    }
  }

  let total = 0;
  for (let i = 0; i < 12; i++) total += croma[i];
  if (total < 1e-6) return null;
  for (let i = 0; i < 12; i++) croma[i] /= total;

  const correlacion = (perfil: number[], desplazamiento: number): number => {
    let mediaA = 0;
    let mediaB = 0;
    for (let i = 0; i < 12; i++) {
      mediaA += croma[(i + desplazamiento) % 12];
      mediaB += perfil[i];
    }
    mediaA /= 12;
    mediaB /= 12;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < 12; i++) {
      const a = croma[(i + desplazamiento) % 12] - mediaA;
      const b = perfil[i] - mediaB;
      num += a * b;
      da += a * a;
      db += b * b;
    }
    return da > 1e-12 && db > 1e-12 ? num / Math.sqrt(da * db) : 0;
  };

  let mejor = -Infinity;
  let etiqueta: string | null = null;
  for (let t = 0; t < 12; t++) {
    const may = correlacion(PERFIL_MAYOR, t);
    if (may > mejor) {
      mejor = may;
      etiqueta = `${NOTAS[t]} mayor`;
    }
    const men = correlacion(PERFIL_MENOR, t);
    if (men > mejor) {
      mejor = men;
      etiqueta = `${NOTAS[t]} menor`;
    }
  }
  // Por debajo de esto la correlación no distingue nada — mejor no afirmar.
  return mejor > 0.55 ? etiqueta : null;
}

// Segmentación por novedad: se construye una matriz de auto-similitud sobre
// rasgos gruesos (energía por bandas) y se recorre su diagonal con un kernel
// de tablero. Donde el kernel se dispara, la canción cambia de sección — y ahí
// es donde entran o salen las partes que importan.
function segmentar(
  esp: Espectrograma,
  sr: number,
  duracionSeg: number
): { fronterasSeg: number[]; energiaPorSeg: Float32Array; resolucionSeg: number } {
  const marcosPorPaso = Math.max(1, Math.round(esp.marcosPorSegundo * 0.5));
  const pasos = Math.floor(esp.magnitudes.length / marcosPorPaso);
  const resolucionSeg = marcosPorPaso / esp.marcosPorSegundo;

  const BANDAS = 12;
  const bins = esp.magnitudes[0].length;
  const hzPorBin = sr / VENTANA;
  // Bandas logarítmicas: el oído y la instrumentación se reparten así, no
  // linealmente.
  const limites: number[] = [];
  for (let b = 0; b <= BANDAS; b++) {
    const hz = 40 * Math.pow(11000 / 40, b / BANDAS);
    limites.push(Math.min(bins - 1, Math.max(1, Math.round(hz / hzPorBin))));
  }

  const rasgos: Float32Array[] = [];
  const energiaPorSeg = new Float32Array(pasos);
  for (let p = 0; p < pasos; p++) {
    const v = new Float32Array(BANDAS);
    let rmsSuma = 0;
    for (let m = p * marcosPorPaso; m < (p + 1) * marcosPorPaso; m++) {
      const mag = esp.magnitudes[m];
      rmsSuma += esp.rms[m];
      for (let b = 0; b < BANDAS; b++) {
        let s = 0;
        for (let k = limites[b]; k < limites[b + 1]; k++) s += mag[k];
        v[b] += s;
      }
    }
    energiaPorSeg[p] = rmsSuma / marcosPorPaso;
    // Escala logarítmica y normalización: interesa el PERFIL tímbrico del
    // trozo, no su volumen — si no, cualquier subida de nivel parecería un
    // cambio de sección.
    let norma = 0;
    for (let b = 0; b < BANDAS; b++) {
      v[b] = Math.log1p(v[b]);
      norma += v[b] * v[b];
    }
    norma = Math.sqrt(norma);
    if (norma > 1e-9) for (let b = 0; b < BANDAS; b++) v[b] /= norma;
    rasgos.push(v);
  }

  const L = Math.max(4, Math.round(6 / resolucionSeg)); // medio kernel ≈ 6 s
  const novedad = new Float32Array(pasos);
  const similitud = (a: Float32Array, b: Float32Array): number => {
    let s = 0;
    for (let i = 0; i < BANDAS; i++) s += a[i] * b[i];
    return s;
  };

  for (let p = L; p < pasos - L; p++) {
    let dentro = 0;
    let cruzado = 0;
    let nDentro = 0;
    let nCruzado = 0;
    for (let i = -L; i < 0; i++) {
      for (let j = -L; j < 0; j++) {
        dentro += similitud(rasgos[p + i], rasgos[p + j]);
        nDentro++;
      }
      for (let j = 0; j < L; j++) {
        cruzado += similitud(rasgos[p + i], rasgos[p + j]);
        nCruzado++;
      }
    }
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < L; j++) {
        dentro += similitud(rasgos[p + i], rasgos[p + j]);
        nDentro++;
      }
    }
    novedad[p] = dentro / Math.max(1, nDentro) - cruzado / Math.max(1, nCruzado);
  }

  // Picos separados al menos 8 s: por debajo de eso no son secciones, son
  // variaciones dentro de la misma parte.
  const separacionMin = Math.round(8 / resolucionSeg);
  let maxNov = 0;
  for (let p = 0; p < pasos; p++) if (novedad[p] > maxNov) maxNov = novedad[p];
  const umbral = maxNov * 0.35;

  const fronteras: number[] = [0];
  let ultima = -separacionMin;
  for (let p = L; p < pasos - L; p++) {
    if (novedad[p] < umbral) continue;
    if (novedad[p] < novedad[p - 1] || novedad[p] < novedad[p + 1]) continue;
    if (p - ultima < separacionMin) continue;
    fronteras.push(p);
    ultima = p;
  }

  return {
    fronterasSeg: fronteras.map((p) => Math.round(p * resolucionSeg * 10) / 10).filter((s) => s < duracionSeg - 4),
    energiaPorSeg,
    resolucionSeg,
  };
}

function percentil(valores: Float32Array, p: number): number {
  const copia = Array.from(valores).sort((a, b) => a - b);
  const i = Math.min(copia.length - 1, Math.max(0, Math.round((copia.length - 1) * p)));
  return copia[i];
}

/**
 * Analiza un archivo de audio y devuelve sus medidas. Corre entero en el
 * navegador: el archivo nunca se sube a ningún servidor.
 */
export async function analizarAudio(
  archivo: File,
  alProgresar?: (etapa: string) => void
): Promise<VincereAudioAnalisis> {
  alProgresar?.("Decodificando el archivo…");
  const datos = await archivo.arrayBuffer();

  const Contexto =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexto) throw new Error("Este navegador no puede decodificar audio");

  const ctx = new Contexto();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(datos);
  } catch {
    throw new Error("No se pudo leer el audio. Prueba con MP3, WAV, M4A u OGG.");
  } finally {
    void ctx.close();
  }

  const duracionSeg = buffer.duration;
  if (duracionSeg < 5) throw new Error("El audio es demasiado corto para analizarlo (mínimo 5 segundos)");

  alProgresar?.("Midiendo el espectro…");
  const muestras = aMonoRemuestreado(buffer, SR_OBJETIVO);
  const esp = calcularEspectrograma(muestras, SR_OBJETIVO);

  alProgresar?.("Buscando el pulso…");
  const onsets = envolventeDeOnsets(esp, SR_OBJETIVO);
  const tempo = detectarTempo(onsets, esp.marcosPorSegundo);

  // Densidad rítmica: golpes por segundo por encima de un umbral relativo.
  const picoOnset = percentil(onsets, 0.98);
  let golpes = 0;
  for (let m = 1; m < onsets.length - 1; m++) {
    if (onsets[m] > picoOnset * 0.3 && onsets[m] >= onsets[m - 1] && onsets[m] > onsets[m + 1]) golpes++;
  }
  const densidad = Math.round((golpes / duracionSeg) * 10) / 10;

  alProgresar?.("Leyendo la estructura…");
  const { fronterasSeg, energiaPorSeg, resolucionSeg } = segmentar(esp, SR_OBJETIVO, duracionSeg);
  const tonalidad = detectarTonalidad(esp, SR_OBJETIVO);

  // Textura: brillo por centroide, peso de graves por reparto de energía.
  let centroideSuma = 0;
  for (let m = 0; m < esp.centroide.length; m++) centroideSuma += esp.centroide[m];
  const centroideMedio = centroideSuma / Math.max(1, esp.centroide.length);
  const brillo = Math.round(Math.min(100, (centroideMedio / 4000) * 100));

  const hzPorBin = SR_OBJETIVO / VENTANA;
  const binGrave = Math.round(200 / hzPorBin);
  const binMedio = Math.round(2000 / hzPorBin);
  let eGrave = 0;
  let eMedio = 0;
  let eAgudo = 0;
  for (const mag of esp.magnitudes) {
    for (let k = 1; k < mag.length; k++) {
      if (k < binGrave) eGrave += mag[k];
      else if (k < binMedio) eMedio += mag[k];
      else eAgudo += mag[k];
    }
  }
  const eTotal = eGrave + eMedio + eAgudo || 1;
  const pesoGraves = Math.round((eGrave / eTotal) * 100);
  const pesoAgudos = Math.round((eAgudo / eTotal) * 100);

  const rmsAlto = percentil(esp.rms, 0.95);
  const rmsBajo = Math.max(1e-6, percentil(esp.rms, 0.1));
  const rangoDinamico = Math.round(20 * Math.log10(rmsAlto / rmsBajo) * 10) / 10;
  const energiaMedia = Math.round(Math.min(100, (percentil(esp.rms, 0.5) / Math.max(1e-6, rmsAlto)) * 100));

  // Curva de energía en 64 puntos: es para dibujar, no para medir.
  const PUNTOS = 64;
  const curvaEnergia: number[] = [];
  const picoRms = Math.max(1e-6, rmsAlto);
  for (let i = 0; i < PUNTOS; i++) {
    const desde = Math.floor((i * esp.rms.length) / PUNTOS);
    const hasta = Math.floor(((i + 1) * esp.rms.length) / PUNTOS);
    let suma = 0;
    for (let m = desde; m < hasta; m++) suma += esp.rms[m];
    const v = suma / Math.max(1, hasta - desde);
    curvaEnergia.push(Math.round(Math.min(100, (v / picoRms) * 100)));
  }

  // Secciones a partir de las fronteras, con su energía media.
  const secciones: VincereAudioSeccion[] = [];
  const cortes = [...fronterasSeg, duracionSeg];
  for (let i = 0; i < cortes.length - 1; i++) {
    const inicio = cortes[i];
    const fin = cortes[i + 1];
    if (fin - inicio < 3) continue;
    const p0 = Math.floor(inicio / resolucionSeg);
    const p1 = Math.min(energiaPorSeg.length, Math.ceil(fin / resolucionSeg));
    let suma = 0;
    for (let p = p0; p < p1; p++) suma += energiaPorSeg[p];
    const media = suma / Math.max(1, p1 - p0);
    secciones.push({
      inicioSeg: Math.round(inicio * 10) / 10,
      finSeg: Math.round(fin * 10) / 10,
      energia: Math.round(Math.min(100, (media / picoRms) * 100)),
    });
  }

  // El gancho: la primera sección que alcanza el estado de alta energía del
  // tema y se sostiene. No es "el estribillo" con certeza — es el momento en
  // que la canción por fin da todo lo que tiene, que es lo que decide si
  // alguien se queda o se la salta.
  let ganchoSeg: number | null = null;
  if (secciones.length) {
    const maxEnergia = Math.max(...secciones.map((s) => s.energia));
    const candidata = secciones.find((s) => s.energia >= maxEnergia * 0.9 && s.finSeg - s.inicioSeg >= 8);
    ganchoSeg = candidata ? candidata.inicioSeg : null;
  }

  return {
    archivo: archivo.name,
    duracionSeg: Math.round(duracionSeg * 10) / 10,
    bpm: tempo.bpm,
    bpmConfianza: tempo.confianza,
    tonalidad,
    energiaMedia,
    rangoDinamico,
    brillo,
    pesoGraves,
    pesoAgudos,
    densidad,
    curvaEnergia,
    secciones,
    ganchoSeg,
    analizadoEn: new Date().toISOString(),
  };
}

// Descripción en palabras de la textura, para que la IA no tenga que inferir
// qué significa "brillo 34". Deliberadamente habla de TEXTURA y no de
// instrumentos: sin un modelo de reconocimiento, afirmar "hay guitarra" sería
// inventar, y este sistema no inventa.
export function describirTextura(a: VincereAudioAnalisis): string {
  const partes: string[] = [];
  partes.push(a.brillo >= 65 ? "brillante, con mucho agudo" : a.brillo >= 40 ? "equilibrada en brillo" : "oscura, centrada en graves y medios");
  if (a.pesoGraves >= 45) partes.push("con base muy pesada");
  else if (a.pesoGraves >= 28) partes.push("con base presente");
  else partes.push("con poco peso de graves");
  partes.push(a.densidad >= 6 ? "rítmicamente densa" : a.densidad >= 3 ? "de densidad rítmica media" : "espaciada, con pocos eventos por segundo");
  if (a.rangoDinamico <= 8) partes.push("muy comprimida (poca diferencia entre lo suave y lo fuerte)");
  else if (a.rangoDinamico >= 18) partes.push("con rango dinámico amplio");
  return partes.join(", ");
}

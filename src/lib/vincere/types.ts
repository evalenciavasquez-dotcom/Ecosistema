// Modelo de datos de VINCERE Intelligence Platform — PRD v3.0.
// Módulo separado del resto de C.C.O. E.V.: VINCERE dirige carreras de
// artistas musicales, no proyectos personales/de negocio de Eduardo.

// 1 = especulativo, 2 = evidencia parcial, 3 = evidencia sólida, 4 = alta evidencia.
export type VincereNivel = 1 | 2 | 3 | 4;

export const VINCERE_NIVEL_LABEL: Record<VincereNivel, string> = {
  1: "Especulativo",
  2: "Evidencia parcial",
  3: "Evidencia sólida",
  4: "Alta evidencia",
};

export type VincereSeccion =
  | "resumen"
  | "diagnostico"
  | "marca"
  | "song"
  | "ar"
  | "touring"
  | "oportunidad"
  | "pitch"
  | "monetizacion"
  | "predicciones"
  | "audiencia"
  | "calor"
  | "management"
  | "kpis"
  | "triage"
  | "ingesta"
  | "investigacion"
  | "stress"
  | "informe"
  | "manual";

export const VINCERE_SECCION_LABEL: Record<VincereSeccion, string> = {
  resumen: "Resumen · Momentum",
  diagnostico: "Diagnóstico Maestro",
  marca: "Marca",
  song: "Song Intelligence",
  ar: "A&R y Colaboraciones",
  touring: "Shows y Touring",
  oportunidad: "Oportunidad de Negocio",
  pitch: "Pitch y Presentación",
  monetizacion: "Monetización",
  predicciones: "Predicciones",
  audiencia: "Audiencia y Segmentos",
  calor: "Zonas de Calor",
  management: "Management / Decisiones",
  kpis: "Ejecución / KPIs",
  triage: "Triage",
  ingesta: "Cargar data",
  investigacion: "Investigación",
  stress: "Plan Stress-Test",
  informe: "Informe Final",
  manual: "Documentación",
};

// Moneda base del proyecto. Cada artista puede operar en la suya: un colombiano
// cobra shows en COP y liquidaciones en USD, y forzar una sola moneda a todo el
// sistema obliga a convertir de cabeza o a cargar cifras que no significan nada.
export const VINCERE_MONEDA_POR_DEFECTO = "COP";

export const VINCERE_MONEDAS_SUGERIDAS = ["COP", "USD", "MXN", "EUR", "ARS", "CLP", "PEN"] as const;

export type VincereProyectoTipo = "propio" | "competencia";
export type VincereFase = "Emergente" | "Emergente → Consolidación" | "Consolidación" | "Establecido";

export interface VincereInsight {
  id: string;
  texto: string;
  nivel: VincereNivel;
}

export interface VincereQAEntry {
  id: string;
  pregunta: string;
  respuesta: string;
  nivel: VincereNivel;
  creadoEn: string;
}

export interface VincereStreamMes {
  mes: string;
  valor: number;
}

export interface VincereResumen {
  streamsMes: number;
  streamsCambioPct: number;
  seguidores: number;
  seguidoresCambioPct: number;
  // Oyentes mensuales únicos. Distinto de streams: streams son reproducciones,
  // oyentes son personas. Es el denominador del fan rate, y sin él esa métrica
  // no se puede calcular — dividir seguidores entre streams da un número que se
  // ve bien y no significa nada. Opcional por compatibilidad con lo ya guardado.
  oyentesMes?: number;
  momentumIndex: number;
  serie: VincereStreamMes[];
}

export interface VincereDiagnostico {
  faseActual: string;
  fortalezaNucleo: string;
  riesgoPrincipal: string;
  prioridad: string;
}

export type VincerePotencialCancion = "single" | "album" | "relleno" | "incierto";

export const VINCERE_POTENCIAL_LABEL: Record<VincerePotencialCancion, string> = {
  single: "Potencial single",
  album: "Tema de álbum",
  relleno: "Relleno / descartable",
  incierto: "Potencial incierto",
};

// Lectura profunda de la canción como obra (letra + tema), no solo sus métricas.
// Es la capa que un director interpreta y que un dashboard de números no toca.
export interface VincereCancionAnalisis {
  tema: string; // De qué habla de verdad, más allá de lo obvio.
  arcoEmocional: string; // Cómo lleva la emoción de la primera línea al final.
  gancho: string; // Fuerza del gancho y si engancha rápido — conecta con el skip.
  sonido: string; // Cómo está construida sonoramente, cruzando las medidas del audio.
  audiencia: string; // A qué audiencia le habla y si cuadra con la que ya escucha.
  fitMarca: string; // Coherencia con la marca/identidad del artista.
  potencial: string; // Lectura del potencial comercial en texto.
  clasificacionPotencial: VincerePotencialCancion; // Etiqueta corta para badge.
  reescrituras: string[]; // Qué reescribiría o afinaría — el verso flojo, el puente que sobra.
  decision: string; // Qué hacer con la canción: gestión (single, empujar, sacar, feature…).
  nivel: VincereNivel;
  generadoEn: string;
}

// --- Medidas del audio ---
// Claude no acepta audio: solo texto, imagen y PDF. Así que el archivo no se
// le manda — se mide en el navegador con procesamiento de señal y lo que
// viaja a la IA son estos números. El audio nunca sale del equipo.

export interface VincereAudioSeccion {
  inicioSeg: number;
  finSeg: number;
  energia: number; // 0-100 relativo al pico del tema
}

export interface VincereAudioAnalisis {
  archivo: string;
  duracionSeg: number;
  bpm: number;
  bpmConfianza: number; // 0-1 — un tema sin pulso claro no debe dar un BPM creíble
  tonalidad: string | null;
  energiaMedia: number; // 0-100
  rangoDinamico: number; // dB entre lo suave y lo fuerte
  brillo: number; // 0-100 por centroide espectral
  pesoGraves: number; // % de energía bajo 200 Hz
  pesoAgudos: number; // % de energía sobre 2 kHz
  densidad: number; // eventos rítmicos por segundo
  curvaEnergia: number[]; // 64 puntos, para dibujar
  secciones: VincereAudioSeccion[];
  // Dónde la canción alcanza por fin su estado de alta energía. No es "el
  // estribillo" con certeza — es el momento que decide si alguien se queda.
  ganchoSeg: number | null;
  analizadoEn: string;
}

// --- Medidas de la letra ---
// Contar sílabas es una regla, no una interpretación: se calcula aquí para que
// dé siempre lo mismo, y la IA solo lee qué significa.

export interface VincereLetraMetrica {
  versos: number;
  silabasPorVerso: number[];
  silabasMedia: number;
  metricaDominante: number | null; // el metro más repetido
  regularidad: number; // 0-100: qué parte de los versos se ciñe al metro
  esquemaRima: string; // "ABAB", "AABB", …
  tipoRima: "consonante" | "asonante" | "mixta" | "libre";
  densidadLexica: number; // % de palabras distintas — baja = pegajosa, alta = narrativa
  repeticiones: { texto: string; veces: number }[];
  palabrasTotal: number;
}

export interface VincereCancion {
  id: string;
  nombre: string;
  streams: number;
  retencionPct: number;
  skipPct: number;
  playlistAdds: number;
  // Contenido artístico de la canción — opcional para no romper data ya cargada.
  letra?: string;
  analisis?: VincereCancionAnalisis | null;
  audio?: VincereAudioAnalisis | null;
  metrica?: VincereLetraMetrica | null;
  // Lo que el análisis propio NO puede medir y viene de fuera: instrumentos
  // reconocidos, mood, artistas similares. Sea de un servicio (Cyanite,
  // Music.ai) o del oído del productor — para el sistema es lo mismo: una
  // observación externa que la IA lee junto al audio medido.
  notasProduccion?: string;
}

export interface VincereAudienciaSegmento {
  label: string;
  pct: number;
}

export interface VincereAudiencia {
  edad: VincereAudienciaSegmento[];
  plataformas: VincereAudienciaSegmento[];
  paises: VincereAudienciaSegmento[];
}

export interface VincereZonaCalor {
  id: string;
  ciudad: string;
  calor: number; // 0-100
  // El país permite leer expansión: una ciudad fría en un país donde ya hay
  // plazas calientes es candidata natural a abrir, y una fría y aislada no.
  // Opcional: sin él la plaza se evalúa sola, y el sistema lo dice.
  pais?: string;
}

// Temperatura de una plaza. El calor no es una decisión de dónde tocar: es
// dónde hay demanda que se puede reforzar, y el argumento con el que se le
// vende un show a un empresario.
export type VincereTemperatura = "frio" | "medio" | "caliente";

export const VINCERE_TEMPERATURA_LABEL: Record<VincereTemperatura, string> = {
  frio: "Frío",
  medio: "Medio",
  caliente: "Caliente",
};

export const VINCERE_TEMPERATURA_COLOR: Record<VincereTemperatura, string> = {
  frio: "#4a9eff",
  medio: "#f59e42",
  caliente: "#e0483a",
};

export const VINCERE_TEMPERATURA_LECTURA: Record<VincereTemperatura, string> = {
  frio: "Poca escucha. Entrar aquí es abrir mercado, no cosechar.",
  medio: "Hay base. Sirve para reforzar, todavía no para apostar fuerte.",
  caliente: "Demanda real. Es el argumento más fuerte para venderle un show a un empresario de la plaza.",
};

// Mismos cortes que el semáforo de Oportunidad, a propósito: dos escalas con
// umbrales distintos en el mismo sistema obligan a recordar cuál es cuál.
export function temperaturaDe(calor: number): VincereTemperatura {
  if (calor >= 70) return "caliente";
  if (calor >= 40) return "medio";
  return "frio";
}

export type VincereDecisionEstado = "Pendiente" | "Tomada";

export interface VincereDecision {
  id: string;
  texto: string;
  estado: VincereDecisionEstado;
  creadoEn: string;
}

export interface VincereKpi {
  id: string;
  label: string;
  actual: number;
  meta: number;
  unidad: string;
  nota: string;
}

// --- Ingesta: cargar data real sin escribirla campo por campo ---
// La IA lee el archivo o el texto, extrae los números, los reparte al motor
// que les corresponde y levanta alertas. Nada se escribe sin aprobación.

export type VincereAlertaSeveridad = "critica" | "atencion" | "oportunidad";

export const VINCERE_SEVERIDAD_LABEL: Record<VincereAlertaSeveridad, string> = {
  critica: "Crítica",
  atencion: "Atención",
  oportunidad: "Oportunidad",
};

export interface VincereAlerta {
  id: string;
  texto: string;
  severidad: VincereAlertaSeveridad;
  seccion: VincereSeccion | null;
  nivel: VincereNivel;
  origen: string; // De qué carga salió, para poder rastrearla.
  creadoEn: string;
}

// Propuesta de cambios que devuelve la lectura de un archivo. Cada bloque es
// opcional: un pantallazo de Spotify llena unos motores y no otros.
export interface VincereIngestaPropuesta {
  resumen?: Partial<VincereResumen> | null;
  diagnostico?: Partial<VincereDiagnostico> | null;
  canciones?: Omit<VincereCancion, "id">[] | null;
  audiencia?: Partial<VincereAudiencia> | null;
  zonasCalor?: Omit<VincereZonaCalor, "id">[] | null;
  kpis?: Omit<VincereKpi, "id">[] | null;
}

export interface VincereIngestaResultado {
  fuente: string; // Qué es el archivo, según lo que la IA reconoció.
  lectura: string; // Una frase sobre qué contiene.
  propuesta: VincereIngestaPropuesta;
  alertas: Omit<VincereAlerta, "id" | "creadoEn" | "origen">[];
  faltante: string[]; // Qué esperaba encontrar y no estaba.
  confianza: VincereNivel;
}

// --- Plan Stress-Test ---
// Se pega el plan de un tercero (un manager, un sello, un promotor) y el
// sistema lo somete a prueba contra la realidad de ESTE artista: qué lo hace
// funcionar, qué lo rompe, y qué habría que exigir antes de aceptarlo.

export type VincereVariableTipo = "ganadora" | "perdedora" | "incierta";
export type VincereImpacto = "alto" | "medio" | "bajo";

export const VINCERE_VARIABLE_LABEL: Record<VincereVariableTipo, string> = {
  ganadora: "Ganadora",
  perdedora: "Perdedora",
  incierta: "Incierta",
};

export interface VincereVariablePlan {
  variable: string;
  lectura: string;
  tipo: VincereVariableTipo;
  impacto: VincereImpacto;
  nivel: VincereNivel;
}

export const VINCERE_ESCENARIOS_PLAN = ["Pierde", "Break-even", "Probable", "Gana", "Expansión"] as const;
export type VincereEscenarioNombre = (typeof VINCERE_ESCENARIOS_PLAN)[number];

export interface VincereEscenarioPlan {
  nombre: VincereEscenarioNombre;
  queOcurre: string;
  quePasaSiSeDa: string; // Impacto concreto en la carrera.
  probabilidad: string; // Lectura de qué tan plausible es, con su razón.
  nivel: VincereNivel;
}

export interface VincereStressTest {
  id: string;
  titulo: string;
  fuente: string; // De quién viene el plan.
  resumenPlan: string;
  supuestos: string[]; // Lo que el plan da por hecho sin decirlo.
  variables: VincereVariablePlan[];
  escenarios: VincereEscenarioPlan[];
  puntoDeQuiebre: string; // Qué tiene que fallar para que se caiga entero.
  condiciones: string[]; // Qué exigir antes de aceptar.
  veredicto: string;
  nivelGlobal: VincereNivel;
  creadoEn: string;
}

// --- Marca ---
// El resto de la plataforma mide lo que el artista PRODUCE. Este motor declara
// lo que el artista DICE SER, y ese es su único propósito: sin una marca
// declarada, "coherencia con la marca" es una frase que no se puede verificar
// contra nada. El análisis de canción ya venía juzgando ese fit a ciegas.
//
// La pieza que hace útil al motor no es la declaración sino la BRECHA: lo que
// se declara contra lo que la data muestra que la gente realmente recibe.

export type VincereCoherencia = "alineado" | "tibio" | "desalineado";

export const VINCERE_COHERENCIA_LABEL: Record<VincereCoherencia, string> = {
  alineado: "Alineado",
  tibio: "Tibio",
  desalineado: "Desalineado",
};

// Dónde la marca se toca de verdad: el perfil de Spotify, el feed, el vivo.
// Un artista puede tener un posicionamiento impecable escrito y tres canales
// diciendo cosas distintas.
export interface VincerePuntoContacto {
  id: string;
  canal: string; // Spotify, Instagram, TikTok, vivo, prensa…
  queProyecta: string; // Qué dice hoy ese canal sobre quién es el artista.
  coherencia: VincereCoherencia;
}

// La marca declarada — la escribe Eduardo, no la IA.
export interface VincereMarca {
  posicionamiento: string; // La frase que define qué es este artista.
  promesa: string; // Qué recibe quien lo escucha.
  atributos: string[]; // Los rasgos que lo definen: crudo, íntimo, bailable…
  territorio: string; // Territorio sonoro y referentes donde se ubica.
  // Lo que el artista NO es. Es el campo que casi nadie llena y el que más
  // filo da: una marca que no excluye nada no distingue nada.
  antipatron: string;
  puntosContacto: VincerePuntoContacto[];
  actualizadoEn: string;
}

// Una grieta concreta entre lo declarado y lo recibido.
export interface VincereBrechaMarca {
  declarado: string; // Lo que la marca dice ser en este punto.
  recibido: string; // Lo que la data sugiere que llega realmente.
  lectura: string; // Por qué se abre la brecha y qué cuesta.
  nivel: VincereNivel;
}

export interface VincereMarcaDiagnostico {
  coherencia: string; // Si la marca declarada se sostiene contra la data.
  puntuacionCoherencia: number; // 0-100, para poder verlo de un vistazo.
  brechas: VincereBrechaMarca[];
  diferenciacion: string; // Si el posicionamiento distingue o es genérico.
  senalesDeMarca: string[]; // Qué dice la data propia sobre la marca, se declare o no.
  riesgos: string[];
  movimientos: string[]; // Qué hacer, concreto.
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- Pitch y Presentación ---
// Tres destinos, tres documentos distintos. Un editor de DSP lee cientos de
// pitches por semana y descarta el que se extiende; una disquera necesita una
// tesis de negocio; una marca no compra al artista, compra su audiencia.
// Escribir uno solo y cambiarle el título es la forma más común de que ninguno
// funcione.
//
// La decisión de diseño que lo distingue: el pitch declara su propio riesgo y
// el nivel de evidencia de cada dato. Todos llegan a esa sala con números
// buenos; el que nombra su punto débil antes de que lo encuentren es el único
// al que le creen el resto. Eso no vende al artista — posiciona a quien
// presenta.

// El cuarto destino es el que cierra el circuito con Zonas de Calor. El calor
// no dice dónde tocar: dice dónde hay demanda que se puede reforzar. Y la
// forma de reforzarla es venderle una fecha a quien pone la sala y el riesgo.
// Es el único pitch que va por ciudad, porque un empresario de Medellín no
// compra la audiencia nacional del artista — compra la suya.
export type VincerePitchDestino = "dsp" | "disquera" | "marca" | "promotor";

export const VINCERE_PITCH_DESTINO_LABEL: Record<VincerePitchDestino, string> = {
  dsp: "DSP / Editorial",
  disquera: "Disquera / Sello",
  marca: "Marca / Sponsor",
  promotor: "Empresario / Promotor de plaza",
};

export const VINCERE_PITCH_DESTINO_DESC: Record<VincerePitchDestino, string> = {
  dsp: "Para pitchear un tema a los editores de Spotify, Apple o Deezer. Corto y concreto: leen cientos por semana.",
  disquera: "Propuesta de negocio a un sello. Abre con una tesis de mercado, no con la biografía.",
  marca: "Para un sponsor o una marca. No se vende al artista: se vende la audiencia y el encaje.",
  promotor: "Para venderle una fecha a quien pone la sala y arriesga su plata. Va por ciudad: solo le importa cuánta gente de ESA plaza paga entrada.",
};

export interface VincerePitchBloque {
  titulo: string;
  contenido: string;
}

// Cada dato del pitch va con su origen y su nivel. Es lo que permite decir en
// la sala "esto es nivel 2, no apuesten la casa" — y que eso sume en vez de
// restar.
export interface VincereEvidenciaPitch {
  dato: string;
  deDondeSale: string;
  nivel: VincereNivel;
}

export interface VincerePitch {
  id: string;
  destino: VincerePitchDestino;
  // Solo promotor: la ciudad de la fecha que se está vendiendo. Sale de las
  // zonas de calor, que es donde se ve dónde hay demanda para reforzar.
  plaza: string | null;
  objetivo: string; // Lo que se pide, escrito por Eduardo antes de generar.
  titular: string; // La primera frase. Lo único que se garantiza que van a leer.
  apertura: string; // Tesis de mercado (disquera/marca) o el porqué de ahora (DSP).
  bloques: VincerePitchBloque[];
  evidencia: VincereEvidenciaPitch[];
  // El diferencial.
  riesgoQueNombramos: string;
  porQueIgualFunciona: string;
  elPedido: string; // Qué se pide exactamente. Un pitch sin pedido es una charla.
  queDamosACambio: string;
  // Qué callar en ESTA sala. Distinto del riesgo: no es ocultar, es no
  // debilitarse con información que no aporta a esta conversación.
  queNoDecir: string[];
  // Solo DSP: el campo literal que se pega en Spotify for Artists.
  pitchCorto: string | null;
  etiquetas: string[];
  // Solo promotor: el aforo que esta plaza aguanta hoy. Es el único número que
  // decide si la fecha sale bien o quema la ciudad — una sala de 600 con 310
  // adentro se ve peor que una de 300 llena, y el empresario no vuelve.
  aforoSugerido: number | null;
  porQueEseAforo: string | null;
  // Solo disquera/marca/promotor: a quién y por qué.
  destinatarioSugerido: string | null;
  porQueEseDestinatario: string | null;
  // Contactos propios que aparecieron como puente hacia ese destinatario.
  contactosRelevantes: string[];
  siguientePaso: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- Predicciones ---
// La debilidad de fondo de todo el sistema: las lecturas son juicios en prosa,
// y si una recomendación falla siempre se puede decir que la ejecución estuvo
// mal. Sin marcador, nada es falsable y todo suena convincente.
//
// Esto lo cierra. Se registra qué se espera que pase y para cuándo, y después
// se contrasta contra lo que ocurrió.
//
// Hay un segundo uso, menos obvio y más valioso: los niveles de evidencia los
// asigna el mismo modelo que hace la afirmación — un examen autocorregido.
// Guardando el nivel que tenía cada predicción al emitirse se puede comprobar
// si el nivel 4 acierta más que el 2. Si no, esos niveles son decoración, y
// conviene saberlo con números en vez de suponerlo.

export type VincereEstadoPrediccion = "abierta" | "acertada" | "fallada" | "parcial" | "no-verificable";

export const VINCERE_ESTADO_PREDICCION_LABEL: Record<VincereEstadoPrediccion, string> = {
  abierta: "Abierta",
  acertada: "Acertada",
  fallada: "Fallada",
  parcial: "Parcial",
  "no-verificable": "No verificable",
};

export const VINCERE_ESTADO_PREDICCION_COLOR: Record<VincereEstadoPrediccion, string> = {
  abierta: "#a39c92",
  acertada: "#5cc98e",
  fallada: "#e0483a",
  parcial: "#e0a83a",
  "no-verificable": "#6b645c",
};

export interface VincerePrediccion {
  id: string;
  motor: VincereSeccion | null; // De qué lectura salió, si salió de una.
  afirmacion: string;
  // Sin esto no es una predicción, es una opinión con fecha. Se exige al
  // crearla: qué habría que observar para decir que falló.
  comoSeVerifica: string;
  venceEn: string; // YYYY-MM-DD
  // El nivel que el sistema se auto-asignó al emitirla. Es lo que permite
  // auditar después si esos niveles significan algo.
  nivelAlEmitir: VincereNivel;
  estado: VincereEstadoPrediccion;
  queOcurrio: string | null;
  verificadoEn: string | null;
  creadoEn: string;
}

export interface CalibracionNivel {
  nivel: VincereNivel;
  cerradas: number;
  acertadas: number;
  pct: number | null;
}

export interface MarcadorPredicciones {
  abiertas: number;
  vencidas: number; // Abiertas cuyo plazo ya pasó: son las que hay que cerrar.
  cerradas: number;
  acertadas: number;
  falladas: number;
  parciales: number;
  noVerificables: number;
  // Solo cuenta acertadas y falladas: las parciales y las no verificables
  // ensuciarían el número, y un marcador que se infla a sí mismo no sirve.
  pctAcierto: number | null;
  calibracion: CalibracionNivel[];
  // ¿Los niveles altos aciertan más que los bajos? Es la pregunta que audita
  // el diferencial del sistema. null mientras no haya datos suficientes.
  nivelesSirven: boolean | null;
}

const HOY = () => new Date().toISOString().slice(0, 10);

export function calcularMarcador(preds: VincerePrediccion[]): MarcadorPredicciones {
  const hoy = HOY();
  const abiertas = preds.filter((p) => p.estado === "abierta");
  const cerradas = preds.filter((p) => p.estado !== "abierta");
  const acertadas = cerradas.filter((p) => p.estado === "acertada").length;
  const falladas = cerradas.filter((p) => p.estado === "fallada").length;
  const decisivas = acertadas + falladas;

  const calibracion: CalibracionNivel[] = ([1, 2, 3, 4] as VincereNivel[]).map((nivel) => {
    const delNivel = cerradas.filter(
      (p) => p.nivelAlEmitir === nivel && (p.estado === "acertada" || p.estado === "fallada")
    );
    const ok = delNivel.filter((p) => p.estado === "acertada").length;
    return {
      nivel,
      cerradas: delNivel.length,
      acertadas: ok,
      pct: delNivel.length > 0 ? Math.round((ok / delNivel.length) * 100) : null,
    };
  });

  // Se compara el bloque alto (3-4) contra el bajo (1-2). Hace falta un mínimo
  // de casos en ambos: con dos predicciones no se concluye nada.
  const alto = calibracion.filter((c) => c.nivel >= 3).reduce(
    (a, c) => ({ n: a.n + c.cerradas, ok: a.ok + c.acertadas }),
    { n: 0, ok: 0 }
  );
  const bajo = calibracion.filter((c) => c.nivel <= 2).reduce(
    (a, c) => ({ n: a.n + c.cerradas, ok: a.ok + c.acertadas }),
    { n: 0, ok: 0 }
  );
  const nivelesSirven =
    alto.n >= 3 && bajo.n >= 3 ? alto.ok / alto.n > bajo.ok / bajo.n : null;

  return {
    abiertas: abiertas.length,
    vencidas: abiertas.filter((p) => p.venceEn <= hoy).length,
    cerradas: cerradas.length,
    acertadas,
    falladas,
    parciales: cerradas.filter((p) => p.estado === "parcial").length,
    noVerificables: cerradas.filter((p) => p.estado === "no-verificable").length,
    pctAcierto: decisivas > 0 ? Math.round((acertadas / decisivas) * 100) : null,
    calibracion,
    nivelesSirven,
  };
}

// --- Monetización ---
// Tres preguntas distintas metidas en una palabra: de dónde viene el dinero,
// cuánto queda de nuestro lado, y por dónde más podría entrar. Las tres viven
// acá porque comparten la misma base, pero se leen por separado.
//
// El desajuste que este motor existe para mostrar: la atención se va a donde
// se ven los números —el streaming— y el dinero suele entrar por otro lado.
// El sistema ya tiene los dos datos y nadie los había puesto juntos.

export type VincereFuenteTipo =
  | "streaming"
  | "shows"
  | "merch"
  | "sync"
  | "publishing"
  | "marca"
  | "otro";

export const VINCERE_FUENTE_LABEL: Record<VincereFuenteTipo, string> = {
  streaming: "Streaming",
  shows: "Shows",
  merch: "Merch",
  sync: "Sync / Licencias",
  publishing: "Publishing / Regalías",
  marca: "Marcas / Sponsors",
  otro: "Otro",
};

export const VINCERE_FUENTE_COLOR: Record<VincereFuenteTipo, string> = {
  streaming: "#2dd4bf",
  shows: "#5cc98e",
  merch: "#e0a83a",
  sync: "#a78bfa",
  publishing: "#60a5fa",
  marca: "#f472b6",
  otro: "#a39c92",
};

export interface VincereIngreso {
  id: string;
  tipo: VincereFuenteTipo;
  monto: number;
  moneda: string;
  periodo: string; // YYYY-MM
  nota: string;
}

export interface VincereViaSinExplotar {
  via: string;
  porQueEncaja: string; // Contra la data de ESTE artista, no en general.
  queHaceFalta: string;
  esfuerzo: "bajo" | "medio" | "alto";
  nivel: VincereNivel;
}

export interface VincereMonetizacionDiagnostico {
  lecturaGeneral: string;
  // El corazón del motor: dónde se pone el esfuerzo contra dónde entra el dinero.
  brechaAtencionIngreso: string;
  riesgoDeConcentracion: string;
  loQueYaFunciona: string[];
  viasSinExplotar: VincereViaSinExplotar[];
  queMoverAhora: string[];
  // Lectura del lado propio: qué significa este negocio para quien lo dirige.
  lecturaDeLoMio: string;
  queFaltaSaber: string[];
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- Vínculo ---
// Hasta acá el sistema trataba todos los proyectos igual. Pero un CLIENTE al
// que se le cobra una tarifa y un proyecto PROPIO donde se tiene un porcentaje
// son dos negocios distintos, y esa diferencia cambia todo lo que el sistema
// debería decir: a un cliente no se le calcula participación, y a un socio no
// se le cotiza una tarifa.
//
// Se separa lo confirmado de lo que se está pensando. No es lo mismo el
// porcentaje que se tiene que el que se querría tener, y mezclarlos hace que
// las proyecciones mientan.

export type VincereVinculoTipo = "propio" | "socio" | "cliente" | "evaluando" | "ninguno";

export const VINCERE_VINCULO_LABEL: Record<VincereVinculoTipo, string> = {
  propio: "Proyecto propio",
  socio: "Sociedad",
  cliente: "Cliente",
  evaluando: "Evaluando",
  ninguno: "Sin vínculo",
};

export const VINCERE_VINCULO_DESC: Record<VincereVinculoTipo, string> = {
  propio: "Lo diriges y participas de sus ingresos.",
  socio: "Sociedad con el artista o con un tercero, con participación acordada.",
  cliente: "Te contrata por servicios y cobras una tarifa. No participas de sus ingresos.",
  evaluando: "Todavía no hay acuerdo. Lo que cargues aquí es la hipótesis, no un hecho.",
  ninguno: "Referencia de mercado o competencia. No hay negocio.",
};

// Un vínculo de cliente se mide en tarifa; uno de sociedad, en porcentaje.
// Guardar ambos y usar solo el que corresponde evita el error de proyectar
// ingresos por participación sobre un cliente que solo paga una factura.
export interface VincereVinculo {
  tipo: VincereVinculoTipo;
  // false = es lo que se está pensando pedir, no lo que está acordado.
  confirmado: boolean;
  participacionPct: number | null; // Solo para propio/socio.
  tarifa: number | null; // Solo para cliente.
  moneda: string;
  periodicidad: string; // "mensual", "por proyecto", "por show"…
  // La pieza que vuelve el costo de oportunidad un número en vez de un párrafo.
  horasSemanales: number | null;
  notas: string;
  actualizadoEn: string;
}

export function vinculoVacio(): VincereVinculo {
  return {
    tipo: "evaluando",
    confirmado: false,
    participacionPct: null,
    tarifa: null,
    moneda: VINCERE_MONEDA_POR_DEFECTO,
    periodicidad: "mensual",
    horasSemanales: null,
    notas: "",
    actualizadoEn: new Date().toISOString(),
  };
}

// Si de este proyecto entra dinero propio, y por qué vía.
export function participaDelNegocio(v: VincereVinculo | null | undefined): boolean {
  return !!v && (v.tipo === "propio" || v.tipo === "socio" || v.tipo === "cliente");
}

// --- Oportunidad de Negocio ---
// Todos los demás motores dirigen un artista que ya está adentro. Este decide
// lo anterior a todo: si conviene entrar. Triage da la primera lectura de un
// caso nuevo en cuatro campos; este es la versión que se firma.
//
// El puntaje va de 0 a 100 en pasos de diez a propósito. Un número redondo se
// discute ("¿por qué 60 y no 70?"); un 63 finge una precisión que no existe
// cuando media evaluación es criterio.

export type VincereSemaforo = "rojo" | "amarillo" | "verde";

export const VINCERE_SEMAFORO_LABEL: Record<VincereSemaforo, string> = {
  rojo: "No conviene",
  amarillo: "Posible con condiciones",
  verde: "Conviene entrar",
};

export const VINCERE_SEMAFORO_COLOR: Record<VincereSemaforo, string> = {
  rojo: "#e0483a",
  amarillo: "#e0a83a",
  verde: "#5cc98e",
};

// Umbrales fijos y no interpretados por la IA: el mismo puntaje tiene que dar
// siempre el mismo color, o el semáforo deja de significar algo.
export function semaforoDe(puntaje: number): VincereSemaforo {
  if (puntaje >= 70) return "verde";
  if (puntaje >= 40) return "amarillo";
  return "rojo";
}

export type VincereModalidad =
  | "management"
  | "management-360"
  | "por-proyecto"
  | "servicios"
  | "sociedad"
  | "distribucion"
  | "solo-asesoria";

export const VINCERE_MODALIDAD_LABEL: Record<VincereModalidad, string> = {
  management: "Management",
  "management-360": "Management 360",
  "por-proyecto": "Por proyecto",
  servicios: "Servicios sueltos",
  sociedad: "Sociedad / JV",
  distribucion: "Distribución",
  "solo-asesoria": "Solo asesoría",
};

// Una forma concreta de entrar, con su economía. No es una idea suelta: trae
// qué se pide, qué se da, qué se espera recuperar y cómo se sale.
export interface VincereViaDeEntrada {
  modalidad: VincereModalidad;
  comoFunciona: string;
  participacion: string; // El % o la estructura, con su razón. Rango, no cifra inventada.
  queAportamos: string;
  queEsperamosRecuperar: string; // ROI en términos concretos y su plazo.
  compromisosNuestros: string[];
  compromisosDelArtista: string[];
  // Sin esto se termina atado a un artista que dejó de moverse. Todo trato
  // propuesto trae su puerta de salida.
  clausulaDeRevision: string;
  riesgo: string;
  nivel: VincereNivel;
}

export interface VincereEscenarioNegocio {
  nombre: string;
  queOcurre: string;
  queSignificaParaNosotros: string;
  probabilidad: string;
  nivel: VincereNivel;
}

export interface VincereOportunidad {
  puntaje: number; // 0-100, múltiplo de 10.
  porQueEsePuntaje: string; // Qué lo sube y qué lo baja, explícito.
  loQueLoSube: string[];
  loQueLoBaja: string[];
  vias: VincereViaDeEntrada[];
  viaRecomendada: string; // Una sola. Elegir es el trabajo.
  escenarios: VincereEscenarioNegocio[];
  serviciosQueOfrecemos: string[];
  // El artista también nos elige a nosotros. Sin esto el análisis es una sola
  // cara de la mesa.
  porQueNosotros: string;
  // Decir que sí acá es decir que no a otra cosa: para un equipo chico el
  // cuello de botella es el tiempo, no las ganas.
  costoDeOportunidad: string;
  senalesDeAlerta: string[];
  queFaltaSaber: string[];
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- A&R y Colaboraciones ---
// La app ya registraba una decisión tomada — "rechazar feature con artista de
// bajo fit de marca" — sin ningún motor que la tomara. Y el motor de
// Investigación ya recoge de un artista "en qué se solapa o se diferencia del
// nuestro", que es exactamente la pregunta de una colaboración, sin que nada
// lo convirtiera en veredicto.
//
// Las dos ideas que sostienen el motor: una colaboración con alguien cuya
// audiencia YA es la tuya no te da audiencia nueva, y la diferencia de tamaño
// decide quién de los dos gana de verdad.

export type VincereCandidatoTipo = "artista" | "productor" | "compositor";

export const VINCERE_CANDIDATO_TIPO_LABEL: Record<VincereCandidatoTipo, string> = {
  artista: "Artista",
  productor: "Productor",
  compositor: "Compositor",
};

export type VincereCandidatoEstado = "propuesto" | "conversando" | "cerrado" | "descartado";

export const VINCERE_CANDIDATO_ESTADO_LABEL: Record<VincereCandidatoEstado, string> = {
  propuesto: "Propuesto",
  conversando: "En conversación",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

export interface VincereCandidato {
  id: string;
  nombre: string;
  tipo: VincereCandidatoTipo;
  queAporta: string; // Qué se supone que suma esta colaboración.
  origen: string; // De dónde salió: quién lo propuso, o si salió de Investigación.
  estado: VincereCandidatoEstado;
  creadoEn: string;
}

export type VincereVeredictoColab = "perseguir" | "explorar" | "esperar" | "descartar";

export const VINCERE_VEREDICTO_COLAB_LABEL: Record<VincereVeredictoColab, string> = {
  perseguir: "Perseguir",
  explorar: "Explorar",
  esperar: "Esperar",
  descartar: "Descartar",
};

export interface VincereCandidatoEvaluado {
  nombre: string;
  veredicto: VincereVeredictoColab;
  fitMarca: string; // Contra la marca declarada y, sobre todo, su antipatrón.
  // Si la audiencia ya se solapa, la colaboración no trae gente nueva: se
  // paga por llegar a quien ya escucha. Es la trampa más común del feature.
  solapamiento: string;
  // Quién gana más según la diferencia de tamaño. Muy arriba: eres invitado en
  // tu propia canción. Muy abajo: le estás haciendo un favor.
  asimetria: string;
  queGana: string;
  queArriesga: string;
  nivel: VincereNivel;
}

export interface VincereARDiagnostico {
  lecturaGeneral: string;
  candidatos: VincereCandidatoEvaluado[];
  primeroPerseguir: string; // A quién ir primero y por qué.
  senalesDeAlerta: string[]; // Colaboraciones que se ven bien y no lo son.
  perfilQueFalta: string; // Qué tipo de colaborador le falta a este artista hoy.
  queFaltaSaber: string[];
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- Shows y Touring ---
// Zonas de Calor dice dónde te escuchan. Este motor responde la pregunta que
// esa data insinúa pero no contesta: dónde conviene tocar. La Guía del Usuario
// ya prometía ese recorrido ("de cómo suena la canción a dónde tocar") y se
// cortaba en el mapa.
//
// La distinción que sostiene el motor: escuchar es gratis, ir a un show no.
// Una plaza con muchos streams puede vender cero entradas, y esa trampa es
// justo la que arruina una gira de artista emergente.

export type VincereVeredictoPlaza = "ir" | "probar" | "esperar" | "no";

export const VINCERE_VEREDICTO_PLAZA_LABEL: Record<VincereVeredictoPlaza, string> = {
  ir: "Ir",
  probar: "Probar en chico",
  esperar: "Esperar",
  no: "No ir",
};

// Un show que ya ocurrió. Es la única evidencia dura de que una plaza responde:
// los streams dicen quién escucha, esto dice quién pagó y se movió.
export interface VincereShow {
  id: string;
  ciudad: string;
  fecha: string; // YYYY-MM-DD
  sala: string;
  aforo: number; // Capacidad de la sala.
  // Cuántos fueron de verdad. Puede no saberse: muchos empresarios no comparten
  // la taquilla, y exigir el dato impediría registrar el show. Sin él se pierde
  // la conversión, no el resto.
  asistencia: number | null;
  ingresoNeto: number | null; // Lo que quedó, si se sabe. null = no registrado.
  moneda: string;
  nota: string;
}

export interface VincerePlazaEvaluada {
  ciudad: string;
  veredicto: VincereVeredictoPlaza;
  tamanoSala: string; // Aforo que aguanta hoy, con su razón.
  lectura: string; // Por qué este veredicto, citando la data.
  // Distancia entre lo que la plaza escucha y lo que se puede esperar que
  // asista. Es el número que ningún dashboard de streaming da.
  senalDeConversion: string;
  nivel: VincereNivel;
}

export interface VincereTramoRuta {
  orden: number;
  ciudad: string;
  porQueVaAqui: string;
}

export interface VincereTouringDiagnostico {
  lecturaGeneral: string; // Si este artista está para salir de gira o todavía no.
  listoParaGira: boolean;
  plazas: VincerePlazaEvaluada[];
  ruta: VincereTramoRuta[]; // Orden sugerido, con la lógica de cada salto.
  // Plazas que la data hace ver bien y no lo están. La pieza más valiosa:
  // evita el show con sala vacía en la ciudad de más streams.
  trampas: string[];
  queFaltaSaber: string[]; // Lo que hay que averiguar antes de reservar.
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
}

// --- Histórico: que el sistema acumule en vez de sobrescribir ---
// Cada vez que entra data nueva se guarda una foto de los indicadores. Sin
// esto la plataforma solo sabe cómo está la carrera hoy, nunca cómo llegó
// hasta aquí — y la interpretación pierde la mitad de su valor.

export interface VincereSnapshot {
  id: string;
  fecha: string; // YYYY-MM-DD
  etiqueta: string; // De dónde vino esta foto.
  streamsMes: number;
  seguidores: number;
  // Se guarda para poder calcular después el fan rate marginal: de los oyentes
  // ganados entre dos fotos, cuántos se volvieron seguidores. Sin el dato
  // histórico esa lectura no existe, y es la que distingue crecimiento de pico.
  oyentesMes?: number;
  momentumIndex: number;
  cancionesTotal: number;
  creadoEn: string;
}

// --- Investigación: lo que el sistema sale a buscar afuera ---
// Todo lo demás en VINCERE se alimenta de data que Eduardo trae. Este motor
// es el único que mira hacia afuera: busca en la web al artista, la canción o
// la plaza, y devuelve hallazgos CON su fuente. La regla que lo hace confiable
// es que un hallazgo sin fuente nunca puede subir de nivel 2.

export type VincereInvestigacionTipo = "artista" | "cancion" | "mercado" | "libre";

export const VINCERE_INVESTIGACION_LABEL: Record<VincereInvestigacionTipo, string> = {
  artista: "Artista",
  cancion: "Canción",
  mercado: "Plaza / mercado",
  libre: "Pregunta abierta",
};

export const VINCERE_INVESTIGACION_PLACEHOLDER: Record<VincereInvestigacionTipo, string> = {
  artista: "Ej. «Feid» · «quién compite con nosotros en indie pop en español»",
  cancion: "Ej. «cómo le fue a Ojos Marrones de Lasso» · «qué canciones usan este mismo gancho»",
  mercado: "Ej. «escena de reggaetón en Santiago de Chile» · «festivales de verano en México 2026»",
  libre: "Ej. «cuánto paga hoy un sello por un anticipo a un emergente en Latam»",
};

export interface VincereFuente {
  titulo: string;
  url: string;
  fecha?: string | null; // Antigüedad que reporta el buscador, si la trae.
}

export interface VincereHallazgo {
  texto: string; // Qué se encontró.
  implicacion: string; // Qué significa para ESTE artista — el valor real.
  nivel: VincereNivel;
  fuentes: number[]; // Índices (base 1) dentro de fuentes[]. Vacío = inferencia.
}

// Lo que la investigación aporta a Zonas de Calor. No se escribe solo: se
// propone, y Eduardo decide si lo traslada al mapa.
export interface VincereSenalPlaza {
  ciudad: string;
  senal: string;
  calorSugerido: number; // 0-100
  nivel: VincereNivel;
}

export interface VincereInvestigacion {
  id: string;
  tipo: VincereInvestigacionTipo;
  consulta: string; // Lo que Eduardo pidió buscar.
  titulo: string;
  resumen: string;
  hallazgos: VincereHallazgo[];
  senalesPlaza: VincereSenalPlaza[];
  implicacionesCatalogo: string[]; // Qué le dice esto al catálogo propio.
  preguntasAbiertas: string[]; // Lo que la web no respondió.
  fuentes: VincereFuente[];
  nivelGlobal: VincereNivel;
  // Nada encontrado en la web: la lectura entonces es criterio, no evidencia.
  sinFuentes: boolean;
  aplicadaEnCalor?: boolean;
  creadoEn: string;
}

// --- Informe Final: el entregable que emite la plataforma ---
// No es un resumen de paneles: es la postura del director sobre el proyecto,
// cruzando todos los motores en un solo documento presentable.

export type VincerePrioridadPaso = "Alta" | "Media" | "Baja";

export interface VincereInformeBloque {
  titulo: string;
  parrafos: string[];
  nivel: VincereNivel;
}

export interface VincereInformeRiesgo {
  riesgo: string;
  consecuencia: string;
  nivel: VincereNivel;
}

export interface VincereInformeOportunidad {
  oportunidad: string;
  porQue: string;
  nivel: VincereNivel;
}

export interface VincereInformePaso {
  accion: string;
  responsable: string;
  plazo: string;
  prioridad: VincerePrioridadPaso;
  // El informe es un documento de trabajo: los pasos se van marcando aquí.
  // Opcional para no romper informes emitidos antes de esta capacidad.
  hecho?: boolean;
}

export interface VincereInforme {
  titulo: string;
  sinopsis: string;
  bloques: VincereInformeBloque[];
  riesgos: VincereInformeRiesgo[];
  oportunidades: VincereInformeOportunidad[];
  proximosPasos: VincereInformePaso[];
  veredicto: string;
  nivelGlobal: VincereNivel;
  generadoEn: string;
  // Marca de que Eduardo intervino el documento después de emitirlo — el
  // informe deja de ser solo la salida de la IA y pasa a llevar su criterio.
  editadoEn?: string | null;
}

export interface VincereProyecto {
  id: string;
  nombre: string;
  genero: string;
  fase: VincereFase;
  tipo: VincereProyectoTipo;
  // Opcional por compatibilidad: los proyectos guardados antes de que esto
  // existiera caen a VINCERE_MONEDA_POR_DEFECTO en vez de romperse.
  moneda?: string;
  resumen: VincereResumen;
  diagnostico: VincereDiagnostico;
  marca?: VincereMarca | null;
  marcaDiagnostico?: VincereMarcaDiagnostico | null;
  canciones: VincereCancion[];
  audiencia: VincereAudiencia;
  zonasCalor: VincereZonaCalor[];
  shows?: VincereShow[];
  touringDiagnostico?: VincereTouringDiagnostico | null;
  candidatos?: VincereCandidato[];
  arDiagnostico?: VincereARDiagnostico | null;
  vinculo?: VincereVinculo | null;
  predicciones?: VincerePrediccion[];
  ingresos?: VincereIngreso[];
  monetizacionDiagnostico?: VincereMonetizacionDiagnostico | null;
  oportunidad?: VincereOportunidad | null;
  pitches?: VincerePitch[];
  decisiones: VincereDecision[];
  kpis: VincereKpi[];
  insights: Partial<Record<VincereSeccion, VincereInsight[]>>;
  qaLog: Partial<Record<VincereSeccion, VincereQAEntry[]>>;
  informe?: VincereInforme | null;
  // Informes anteriores. Reemitir ya no destruye el trabajo hecho sobre el
  // informe: lo archiva aquí y queda como histórico consultable.
  informesArchivados?: VincereInforme[];
  alertas?: VincereAlerta[];
  historial?: VincereSnapshot[];
  stressTests?: VincereStressTest[];
  investigaciones?: VincereInvestigacion[];
  creadoEn: string;
}

export type VincereCantidadData = "baja" | "media" | "alta";

export const VINCERE_CANTIDAD_DATA_LABEL: Record<VincereCantidadData, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const VINCERE_CANTIDAD_DATA_DESC: Record<VincereCantidadData, string> = {
  baja: "Menos de 3 meses de historial, o solo cifras sueltas. El veredicto no puede pasar de nivel 2.",
  media: "3 a 6 meses de historial con métricas por canción y algo de audiencia. Permite leer tendencia, no ciclo.",
  alta: "6 meses o más, con catálogo, audiencia por país, plazas y algún show o liquidación. Aquí sí se puede afirmar.",
};

// Qué data mueve realmente la aguja, en orden de impacto. Se muestra en el
// Triage porque es el momento en que se decide qué pedir — después es tarde.
export const VINCERE_DATA_QUE_SIRVE: string[] = [
  "Streams y oyentes mensuales de los últimos 6 meses, no solo el número de hoy: una foto no muestra tendencia.",
  "Métricas por canción: retención, skip rate y playlist adds. Es lo que distingue un catálogo que funciona de uno que solo acumula.",
  "Audiencia por país y ciudad, para saber dónde hay algo que reforzar.",
  "Shows anteriores con aforo y, si se sabe, cuánta gente entró. Es la única prueba de que la audiencia paga.",
  "Liquidaciones de la distribuidora, aunque sean de un trimestre: sin ellas no se puede decir de qué vive.",
  "La letra de las canciones que importan, para leerlas como obra y no como fila de números.",
];

export interface VincereTriageCaso {
  id: string;
  nombre: string;
  genero: string;
  fase: string;
  descripcion: string;
  veredicto: string | null;
  prioridad: "Alta" | "Media" | "Baja" | null;
  motorRecomendado: string | null;
  nivel: VincereNivel | null;
  // Cuánta data hay realmente sobre este caso. Lo declara Eduardo, y limita
  // cuánto puede concluir el análisis: con data baja, un veredicto de alta
  // evidencia sería falso por construcción.
  dataDisponible: VincereCantidadData | null;
  // Propuesta de encuadre comercial desde el primer contacto. Es una sugerencia
  // para confirmar, no un acuerdo: por eso vive en el caso de triage y no en un
  // vínculo, que solo existe cuando el proyecto entra al sistema.
  vinculoSugerido: VincereVinculoTipo | null;
  comoCobrarlo: string | null; // Tarifa si es cliente, % si es sociedad, con su razón.
  horasSemanalesEstimadas: number | null;
  creadoEn: string;
}

export interface VincereComparacion {
  insights: VincereInsight[];
  qaLog: VincereQAEntry[];
}

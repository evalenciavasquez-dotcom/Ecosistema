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
  | "touring"
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
  touring: "Shows y Touring",
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
  asistencia: number; // Cuántos fueron de verdad.
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
  resumen: VincereResumen;
  diagnostico: VincereDiagnostico;
  marca?: VincereMarca | null;
  marcaDiagnostico?: VincereMarcaDiagnostico | null;
  canciones: VincereCancion[];
  audiencia: VincereAudiencia;
  zonasCalor: VincereZonaCalor[];
  shows?: VincereShow[];
  touringDiagnostico?: VincereTouringDiagnostico | null;
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
  creadoEn: string;
}

export interface VincereComparacion {
  insights: VincereInsight[];
  qaLog: VincereQAEntry[];
}

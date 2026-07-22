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
  | "song"
  | "audiencia"
  | "calor"
  | "management"
  | "kpis"
  | "triage";

export const VINCERE_SECCION_LABEL: Record<VincereSeccion, string> = {
  resumen: "Resumen · Momentum",
  diagnostico: "Diagnóstico Maestro",
  song: "Song Intelligence",
  audiencia: "Audiencia y Segmentos",
  calor: "Zonas de Calor",
  management: "Management / Decisiones",
  kpis: "Ejecución / KPIs",
  triage: "Triage",
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
  audiencia: string; // A qué audiencia le habla y si cuadra con la que ya escucha.
  fitMarca: string; // Coherencia con la marca/identidad del artista.
  potencial: string; // Lectura del potencial comercial en texto.
  clasificacionPotencial: VincerePotencialCancion; // Etiqueta corta para badge.
  reescrituras: string[]; // Qué reescribiría o afinaría — el verso flojo, el puente que sobra.
  decision: string; // Qué hacer con la canción: gestión (single, empujar, sacar, feature…).
  nivel: VincereNivel;
  generadoEn: string;
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

export interface VincereProyecto {
  id: string;
  nombre: string;
  genero: string;
  fase: VincereFase;
  tipo: VincereProyectoTipo;
  resumen: VincereResumen;
  diagnostico: VincereDiagnostico;
  canciones: VincereCancion[];
  audiencia: VincereAudiencia;
  zonasCalor: VincereZonaCalor[];
  decisiones: VincereDecision[];
  kpis: VincereKpi[];
  insights: Partial<Record<VincereSeccion, VincereInsight[]>>;
  qaLog: Partial<Record<VincereSeccion, VincereQAEntry[]>>;
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

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

export interface VincereCancion {
  id: string;
  nombre: string;
  streams: number;
  retencionPct: number;
  skipPct: number;
  playlistAdds: number;
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

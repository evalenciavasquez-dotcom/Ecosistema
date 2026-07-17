export type EvidenceLevel = "verificado" | "documentado" | "reportado" | "interpretacion";

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  verificado: "Verificado",
  documentado: "Documentado",
  reportado: "Reportado",
  interpretacion: "Interpretación",
};

export type ProyectoEstado =
  | "Idea"
  | "En evaluación"
  | "En negociación"
  | "Activo"
  | "Bloqueado"
  | "En espera"
  | "En riesgo"
  | "En cierre"
  | "Cerrado"
  | "Descartado";

export type Prioridad = "Alta" | "Media" | "Baja";

export type AccionEstado =
  | "Pendiente"
  | "En curso"
  | "Bloqueada"
  | "Esperando tercero"
  | "Completada"
  | "Cancelada";

export type NivelRiesgo = "Alto" | "Medio" | "Bajo";

export type EscenarioTipo =
  | "avanzar"
  | "avanzar_condicionado"
  | "probar"
  | "renegociar"
  | "esperar"
  | "pausar"
  | "salir"
  | "no_hacer_nada";

export const ESCENARIO_LABEL: Record<EscenarioTipo, string> = {
  avanzar: "Avanzar",
  avanzar_condicionado: "Avanzar condicionado",
  probar: "Probar",
  renegociar: "Renegociar",
  esperar: "Esperar",
  pausar: "Pausar",
  salir: "Salir",
  no_hacer_nada: "No hacer nada",
};

export const ESCENARIO_DESCRIPCION: Record<EscenarioTipo, string> = {
  avanzar: "Beneficio, costo y capacidad de ejecución",
  avanzar_condicionado: "Protecciones mínimas necesarias",
  probar: "Cómo validar con riesgo limitado",
  renegociar: "Qué términos deben cambiar",
  esperar: "Qué información falta y cuánto cuesta esperar",
  pausar: "Qué se protege al detener temporalmente",
  salir: "Costos, consecuencias y forma de cierre",
  no_hacer_nada: "Consecuencia real de la inacción",
};

export interface EscenarioEvaluacion {
  tipo: EscenarioTipo;
  analisis: string;
}

export interface Persona {
  id: string;
  nombre: string;
  empresaProyecto: string;
  rol: string;
  relacion: string;
  nivelInfluencia: Prioridad;
  intereses: string[];
  compromisos: string[];
  conversacionesPendientes: string;
  pagosRelacionados: string;
  riesgos: string[];
  ultimoContacto: string;
  proyectoIds: string[];
  diasSinResponder?: number;
}

export interface HistorialEntry {
  id: string;
  timestamp: string;
  entidadTipo: string;
  entidadId: string;
  cambio: string;
  autor: "usuario" | "ia";
}

export interface Proyecto {
  id: string;
  nombre: string;
  objetivo: string;
  estado: ProyectoEstado;
  prioridad: Prioridad;
  personaIds: string[];
  rolUsuario: string;
  situacionEconomica: string;
  proximoHito: string;
  riesgos: string[];
  oportunidades: string[];
  proximaAccionRecomendada: string;
  evidenceLevel: EvidenceLevel;
  creadoEn: string;
}

export interface Accion {
  id: string;
  titulo: string;
  resultadoEsperado: string;
  proyectoId: string | null;
  responsable: string;
  prioridad: "P1" | "P2" | "P3";
  estado: AccionEstado;
  fecha: string;
  duracionEstimada: string;
  dependencias: string;
  impactoFinanciero: string;
  evidenciaCierre: string;
  creadoEn: string;
}

export interface Decision {
  id: string;
  pregunta: string;
  contexto: string;
  proyectoId: string | null;
  fechaLimite: string;
  nivelRiesgo: NivelRiesgo;
  evidenceLevel: EvidenceLevel;
  opciones: string[];
  escenarios: EscenarioEvaluacion[];
  impactoEconomico: string;
  recomendacionSistema: string;
  decisionFinal: string;
  condiciones: string[];
  resultadoPosterior: string;
  estado: "Abierta" | "Decidida" | "Cerrada";
  creadoEn: string;
}

export type MovimientoTipo = "ingreso" | "gasto";
export type MovimientoEstado = "confirmado" | "esperado" | "sin_conciliar";

export interface MovimientoEconomico {
  id: string;
  tipo: MovimientoTipo;
  monto: number;
  moneda: string;
  fecha: string;
  proyectoId: string | null;
  descripcion: string;
  estado: MovimientoEstado;
  fuente: string;
}

export type EvidenciaTipo =
  | "contrato"
  | "correo"
  | "comprobante"
  | "captura"
  | "informe"
  | "audio"
  | "transcripcion"
  | "propuesta"
  | "archivo"
  | "enlace";

export interface Evidencia {
  id: string;
  tipo: EvidenciaTipo;
  fuente: string;
  fecha: string;
  proyectoId: string | null;
  nivelConfiabilidad: EvidenceLevel;
  afirmacionRespaldada: string;
  estadoVerificacion: "verificada" | "pendiente" | "rechazada";
}

export type BandejaEstado = "Nuevo" | "En análisis" | "Necesita confirmación" | "Procesado" | "Descartado";

export type BandejaDestino = "accion" | "decision" | "economia" | "evidencia" | "evento" | "registro";

export const BANDEJA_DESTINO_LABEL: Record<BandejaDestino, string> = {
  accion: "Acción",
  decision: "Decisión",
  economia: "Movimiento económico",
  evidencia: "Evidencia",
  evento: "Evento de agenda",
  registro: "Registro simple",
};

export interface ClasificacionSugerida {
  destino: BandejaDestino;
  proyectoId: string | null;
  confianza: number;
  razon: string;
}

export interface BandejaItem {
  id: string;
  texto: string;
  fecha: string;
  estado: BandejaEstado;
  clasificacion: ClasificacionSugerida;
  resultadoLabel?: string;
}

export interface AgendaEvento {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  proyectoId: string | null;
  descripcion: string;
  tipo: string;
}

export interface Insight {
  id: string;
  texto: string;
  evidenceLevel: EvidenceLevel;
  etiqueta: string;
}

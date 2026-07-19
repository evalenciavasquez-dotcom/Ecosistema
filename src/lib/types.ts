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
  antes?: Record<string, unknown>;
  despues?: Record<string, unknown>;
}

export interface AnalisisEconomicoProyecto {
  potencialIngresos: string;
  viasMonetizacion: string[];
  impactoEnCajaPersonal: string;
  riesgoFinanciero: string;
  evidenceLevel: EvidenceLevel;
  generadoEn: string;
}

export type ProyectoAmbito = "personal" | "negocio";

export interface Proyecto {
  id: string;
  nombre: string;
  objetivo: string;
  ambito: ProyectoAmbito;
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
  analisisEconomico?: AnalisisEconomicoProyecto | null;
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
  cuenta: string;
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
  archivoDatos?: string | null;
  archivoTipo?: string | null;
  archivoNombre?: string | null;
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
  // Campos extraídos del texto libre, según destino — null si no se detectaron.
  monto?: number | null;
  moneda?: string | null;
  cuenta?: string | null;
  tipoMovimiento?: MovimientoTipo | null;
  fechaEvento?: string | null;
  horaEvento?: string | null;
}

export interface BandejaItem {
  id: string;
  texto: string;
  fecha: string;
  estado: BandejaEstado;
  clasificacion: ClasificacionSugerida;
  resultadoLabel?: string;
}

export interface RegistroTiempo {
  id: string;
  proyectoId: string;
  fecha: string;
  minutos: number;
  descripcion: string;
  creadoEn: string;
}

export interface MetaFinanciera {
  id: string;
  descripcion: string;
  moneda: string;
  // Caja personal en esa moneda al momento de crear la meta — capturada
  // automáticamente, sirve de punto de partida para medir el avance real
  // (funciona igual para "ahorrar hasta X" que para "salir de deuda hasta 0").
  montoInicial: number;
  montoObjetivo: number;
  fechaObjetivo?: string | null;
  creadoEn: string;
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

// --- Motor de análisis estratégico: Caso Estratégico (StrategicCase) ---

export interface HechoOHipotesis {
  afirmacion: string;
  fuente: string;
  nivel: EvidenceLevel;
}

export interface Dofa {
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  amenazas: string[];
}

export interface GananciaPerdida {
  dimension: string;
  ganancia: string;
  perdida: string;
}

export type ConclusionRentabilidad =
  | "rentable"
  | "potencialmente_rentable"
  | "rentable_condicionado"
  | "estrategicamente_util_financieramente_debil"
  | "financieramente_rentable_operativamente_inviable"
  | "no_rentable"
  | "informacion_insuficiente";

export const CONCLUSION_RENTABILIDAD_LABEL: Record<ConclusionRentabilidad, string> = {
  rentable: "Rentable",
  potencialmente_rentable: "Potencialmente rentable",
  rentable_condicionado: "Rentable solo bajo condiciones",
  estrategicamente_util_financieramente_debil: "Estratégicamente útil pero financieramente débil",
  financieramente_rentable_operativamente_inviable: "Financieramente rentable pero operativamente inviable",
  no_rentable: "No rentable",
  informacion_insuficiente: "Información insuficiente",
};

export interface Rentabilidad {
  financiera: string;
  tiempo: string;
  estrategica: string;
  personal: string;
  conclusion: ConclusionRentabilidad;
}

export interface StakeholderAnalysis {
  nombre: string;
  interes: string;
  poder: NivelRiesgo;
  riesgo: string;
}

export interface Viabilidad {
  operativa: string;
  economica: string;
  estrategica: string;
}

export interface EscenarioProfundo {
  tipo: EscenarioTipo;
  analisis: string;
  beneficio: string;
  costo: string;
  riesgo: NivelRiesgo;
  probabilidadExito: string;
  impactoFinanciero: string;
  impactoEstrategico: string;
  impactoPersonal: string;
  consecuenciaPrincipal: string;
}

export interface RecomendacionEjecutiva {
  decision: string;
  razonPrincipal: string;
  condicionesMinimas: string[];
  limites: string[];
  fechaRevision: string;
  senalSalida: string;
  confianza: number;
  confianzaExplicacion: string;
}

export type NivelAnalisis = "1" | "2" | "3";

export interface StrategicCase {
  id: string;
  decisionId: string;
  preguntaEstrategica: string;
  tipoDeCaso: string;
  panelExpertos: string;
  resumenEjecutivo: string;
  hechos: HechoOHipotesis[];
  hipotesis: HechoOHipotesis[];
  vacios: string[];
  contradicciones: string[];
  puntoDeVista: string;
  dofa: Dofa;
  gananciasPerdidas: GananciaPerdida[];
  rentabilidad: Rentabilidad;
  costoOportunidad: string[];
  stakeholders: StakeholderAnalysis[];
  viabilidad: Viabilidad;
  escenarios: EscenarioProfundo[];
  recomendacion: RecomendacionEjecutiva;
  nivelAnalisis: NivelAnalisis;
  modeloUsado: string;
  creadoEn: string;
}

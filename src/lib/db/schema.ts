import { boolean, doublePrecision, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import type {
  AnalisisEconomicoProyecto,
  ChecklistProceso,
  CierreCategoriaGasto,
  CierreMetaSnapshot,
  CierrePagoVencido,
  CierreResumenMoneda,
  ClasificacionSugerida,
  Dofa,
  EscenarioEvaluacion,
  EscenarioProfundo,
  GananciaPerdida,
  HechoOHipotesis,
  MetricaFinanciera,
  RecomendacionEjecutiva,
  Rentabilidad,
  StakeholderAnalysis,
  Viabilidad,
} from "../types";

export const proyectos = pgTable("proyectos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  objetivo: text("objetivo").notNull(),
  ambito: text("ambito").notNull().default("negocio"),
  estado: text("estado").notNull(),
  prioridad: text("prioridad").notNull(),
  personaIds: jsonb("persona_ids").$type<string[]>().notNull(),
  rolUsuario: text("rol_usuario").notNull(),
  situacionEconomica: text("situacion_economica").notNull(),
  proximoHito: text("proximo_hito").notNull(),
  riesgos: jsonb("riesgos").$type<string[]>().notNull(),
  oportunidades: jsonb("oportunidades").$type<string[]>().notNull(),
  proximaAccionRecomendada: text("proxima_accion_recomendada").notNull(),
  evidenceLevel: text("evidence_level").notNull(),
  creadoEn: text("creado_en").notNull(),
  analisisEconomico: jsonb("analisis_economico").$type<AnalisisEconomicoProyecto>(),
});

export const personas = pgTable("personas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  empresaProyecto: text("empresa_proyecto").notNull(),
  rol: text("rol").notNull(),
  relacion: text("relacion").notNull(),
  nivelInfluencia: text("nivel_influencia").notNull(),
  intereses: jsonb("intereses").$type<string[]>().notNull(),
  compromisos: jsonb("compromisos").$type<string[]>().notNull(),
  conversacionesPendientes: text("conversaciones_pendientes").notNull(),
  pagosRelacionados: text("pagos_relacionados").notNull(),
  riesgos: jsonb("riesgos").$type<string[]>().notNull(),
  ultimoContacto: text("ultimo_contacto").notNull(),
  proyectoIds: jsonb("proyecto_ids").$type<string[]>().notNull(),
  diasSinResponder: integer("dias_sin_responder"),
});

export const acciones = pgTable("acciones", {
  id: text("id").primaryKey(),
  titulo: text("titulo").notNull(),
  resultadoEsperado: text("resultado_esperado").notNull(),
  proyectoId: text("proyecto_id"),
  responsable: text("responsable").notNull(),
  prioridad: text("prioridad").notNull(),
  estado: text("estado").notNull(),
  fecha: text("fecha").notNull(),
  duracionEstimada: text("duracion_estimada").notNull(),
  dependencias: text("dependencias").notNull(),
  impactoFinanciero: text("impacto_financiero").notNull(),
  evidenciaCierre: text("evidencia_cierre").notNull(),
  creadoEn: text("creado_en").notNull(),
  // Vincula esta acción con su tarea gemela en Google Tasks, para la
  // sincronización de doble vía — evita crear duplicados en cada pasada.
  googleTaskId: text("google_task_id"),
});

export const decisiones = pgTable("decisiones", {
  id: text("id").primaryKey(),
  pregunta: text("pregunta").notNull(),
  contexto: text("contexto").notNull(),
  proyectoId: text("proyecto_id"),
  fechaLimite: text("fecha_limite").notNull(),
  nivelRiesgo: text("nivel_riesgo").notNull(),
  evidenceLevel: text("evidence_level").notNull(),
  opciones: jsonb("opciones").$type<string[]>().notNull(),
  escenarios: jsonb("escenarios").$type<EscenarioEvaluacion[]>().notNull(),
  impactoEconomico: text("impacto_economico").notNull(),
  recomendacionSistema: text("recomendacion_sistema").notNull(),
  decisionFinal: text("decision_final").notNull(),
  condiciones: jsonb("condiciones").$type<string[]>().notNull(),
  resultadoPosterior: text("resultado_posterior").notNull(),
  estado: text("estado").notNull(),
  creadoEn: text("creado_en").notNull(),
  // Cuándo se registró la decisión final (resolverDecision) — usada por el
  // recordatorio de cierre de ciclo a los 30/60/90 días.
  fechaDecision: text("fecha_decision"),
});

export const movimientos = pgTable("movimientos", {
  id: text("id").primaryKey(),
  tipo: text("tipo").notNull(),
  monto: doublePrecision("monto").notNull(),
  moneda: text("moneda").notNull(),
  fecha: text("fecha").notNull(),
  proyectoId: text("proyecto_id"),
  descripcion: text("descripcion").notNull(),
  estado: text("estado").notNull(),
  fuente: text("fuente").notNull(),
  cuenta: text("cuenta").notNull(),
});

export const evidencias = pgTable("evidencias", {
  id: text("id").primaryKey(),
  tipo: text("tipo").notNull(),
  fuente: text("fuente").notNull(),
  fecha: text("fecha").notNull(),
  proyectoId: text("proyecto_id"),
  nivelConfiabilidad: text("nivel_confiabilidad").notNull(),
  afirmacionRespaldada: text("afirmacion_respaldada").notNull(),
  estadoVerificacion: text("estado_verificacion").notNull(),
  archivoDatos: text("archivo_datos"),
  archivoTipo: text("archivo_tipo"),
  archivoNombre: text("archivo_nombre"),
});

export const bandeja = pgTable("bandeja", {
  id: text("id").primaryKey(),
  texto: text("texto").notNull(),
  fecha: text("fecha").notNull(),
  estado: text("estado").notNull(),
  clasificacion: jsonb("clasificacion").$type<ClasificacionSugerida>().notNull(),
  resultadoLabel: text("resultado_label"),
});

export const agenda = pgTable("agenda", {
  id: text("id").primaryKey(),
  titulo: text("titulo").notNull(),
  fecha: text("fecha").notNull(),
  hora: text("hora").notNull(),
  proyectoId: text("proyecto_id"),
  descripcion: text("descripcion").notNull(),
  tipo: text("tipo").notNull(),
  // Vincula este evento con su contraparte en Google Calendar, para la
  // sincronización de doble vía — evita crear duplicados en cada sync.
  googleEventId: text("google_event_id"),
});

export const historial = pgTable("historial", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  entidadTipo: text("entidad_tipo").notNull(),
  entidadId: text("entidad_id").notNull(),
  cambio: text("cambio").notNull(),
  autor: text("autor").notNull(),
  antes: jsonb("antes").$type<Record<string, unknown>>(),
  despues: jsonb("despues").$type<Record<string, unknown>>(),
});

export const strategicCases = pgTable("strategic_cases", {
  id: text("id").primaryKey(),
  decisionId: text("decision_id").notNull(),
  preguntaEstrategica: text("pregunta_estrategica").notNull(),
  tipoDeCaso: text("tipo_de_caso"),
  // La columna lentes_activos quedó de un intento anterior (revertido por
  // tamaño de esquema en la salida estructurada de Claude) — sigue existiendo
  // en la base de datos pero ya no se lee ni se escribe.
  panelExpertos: jsonb("panel_expertos").$type<string>(),
  resumenEjecutivo: text("resumen_ejecutivo").notNull(),
  hechos: jsonb("hechos").$type<HechoOHipotesis[]>().notNull(),
  hipotesis: jsonb("hipotesis").$type<HechoOHipotesis[]>().notNull(),
  vacios: jsonb("vacios").$type<string[]>().notNull(),
  contradicciones: jsonb("contradicciones").$type<string[]>().notNull(),
  puntoDeVista: text("punto_de_vista").notNull(),
  dofa: jsonb("dofa").$type<Dofa>().notNull(),
  gananciasPerdidas: jsonb("ganancias_perdidas").$type<GananciaPerdida[]>().notNull(),
  rentabilidad: jsonb("rentabilidad").$type<Rentabilidad>().notNull(),
  costoOportunidad: jsonb("costo_oportunidad").$type<string[]>().notNull(),
  stakeholders: jsonb("stakeholders").$type<StakeholderAnalysis[]>().notNull(),
  viabilidad: jsonb("viabilidad").$type<Viabilidad>().notNull(),
  escenarios: jsonb("escenarios").$type<EscenarioProfundo[]>().notNull(),
  recomendacion: jsonb("recomendacion").$type<RecomendacionEjecutiva>().notNull(),
  nivelAnalisis: text("nivel_analisis").notNull(),
  modeloUsado: text("modelo_usado").notNull(),
  creadoEn: text("creado_en").notNull(),
  // --- Aprendizaje: cerrar el ciclo (ver "Capa de cuestionamiento en
  // decisiones", Bloque 3) — qué recomendó el sistema, si el proceso corrió
  // como debía, y qué pasó después de verdad. Todos nullable porque se
  // llenan progresivamente, no al momento de crear el análisis.
  recomendacionSistema: text("recomendacion_sistema"),
  hipotesisCritica: text("hipotesis_critica"),
  hipotesisSeCumplio: boolean("hipotesis_se_cumplio"),
  costoDiasRunway: doublePrecision("costo_dias_runway"),
  checklistProceso: jsonb("checklist_proceso").$type<ChecklistProceso>(),
  // --- Debate real del panel (Bloque 2) ---
  metricasFinancieras: jsonb("metricas_financieras").$type<MetricaFinanciera[]>(),
  argumentoEnContra: text("argumento_en_contra"),
  costoDeEsperar30Dias: text("costo_de_esperar_30_dias"),
});

export const tiempo = pgTable("tiempo", {
  id: text("id").primaryKey(),
  proyectoId: text("proyecto_id").notNull(),
  fecha: text("fecha").notNull(),
  minutos: integer("minutos").notNull(),
  descripcion: text("descripcion").notNull(),
  creadoEn: text("creado_en").notNull(),
});

export const metasFinancieras = pgTable("metas_financieras", {
  id: text("id").primaryKey(),
  descripcion: text("descripcion").notNull(),
  moneda: text("moneda").notNull(),
  montoInicial: doublePrecision("monto_inicial").notNull(),
  montoObjetivo: doublePrecision("monto_objetivo").notNull(),
  fechaObjetivo: text("fecha_objetivo"),
  creadoEn: text("creado_en").notNull(),
});

// Cierre económico mensual con lectura estratégica — una fila por mes en
// general (proyecto_id null) y una por cada proyecto activo ese mes.
export const cierresMensuales = pgTable("cierres_mensuales", {
  id: text("id").primaryKey(),
  mes: text("mes").notNull(),
  proyectoId: text("proyecto_id"),
  proyectoNombre: text("proyecto_nombre"),
  resumenPorMoneda: jsonb("resumen_por_moneda").$type<CierreResumenMoneda[]>().notNull(),
  categoriasGasto: jsonb("categorias_gasto").$type<CierreCategoriaGasto[]>().notNull(),
  horasInvertidas: doublePrecision("horas_invertidas"),
  metasFinancieras: jsonb("metas_financieras").$type<CierreMetaSnapshot[]>().notNull(),
  pagosVencidos: jsonb("pagos_vencidos").$type<CierrePagoVencido[]>().notNull(),
  proyectosEnRiesgo: jsonb("proyectos_en_riesgo").$type<string[]>().notNull(),
  decisionesSinCerrar: jsonb("decisiones_sin_cerrar").$type<string[]>().notNull(),
  lecturaEstrategica: text("lectura_estrategica").notNull(),
  semaforo: text("semaforo").notNull(),
  creadoEn: text("creado_en").notNull(),
});

// Conexión OAuth con Google — una sola fila (id fijo "default"), no es
// parte del modelo de dominio sincronizado con el cliente vía TABLES/mutate.
// Se maneja directamente desde src/lib/google.ts.
export const googleConnection = pgTable("google_connection", {
  id: text("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiryDate: text("expiry_date").notNull(),
  scope: text("scope").notNull(),
  gmailLabelId: text("gmail_label_id"),
  // Etiqueta "CCO-Sincronizado" — marca los correos ya procesados por el
  // barrido para no volver a leerlos en la siguiente pasada.
  gmailProcessedLabelId: text("gmail_processed_label_id"),
  lastGmailSync: text("last_gmail_sync"),
  // Token de sincronización incremental de Google Calendar (events.list) —
  // permite traer solo lo que cambió desde la última pasada, incluyendo
  // eliminaciones, en vez de releer todo el calendario cada vez.
  calendarSyncToken: text("calendar_sync_token"),
  // Marca de tiempo de la última pasada de Google Tasks — se usa como
  // "updatedMin" para traer solo tareas que cambiaron desde entonces.
  lastTasksSync: text("last_tasks_sync"),
  connectedAt: text("connected_at").notNull(),
});

export const TABLES = {
  tiempo,
  metasFinancieras,
  cierresMensuales,
  proyectos,
  personas,
  acciones,
  decisiones,
  movimientos,
  evidencias,
  bandeja,
  agenda,
  historial,
  strategicCases,
} as const;

export type TableName = keyof typeof TABLES;

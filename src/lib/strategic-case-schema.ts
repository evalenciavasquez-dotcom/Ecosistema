import { z } from "zod";

const evidenceLevelEnum = z.enum(["verificado", "documentado", "reportado", "interpretacion"]);
const nivelRiesgoEnum = z.enum(["Alto", "Medio", "Bajo"]);
const escenarioTipoEnum = z.enum([
  "avanzar",
  "avanzar_condicionado",
  "probar",
  "renegociar",
  "esperar",
  "pausar",
  "salir",
  "no_hacer_nada",
]);

const hechoOHipotesisSchema = z.object({
  afirmacion: z.string(),
  fuente: z.string(),
  nivel: evidenceLevelEnum,
});

const dofaSchema = z.object({
  fortalezas: z.array(z.string()),
  debilidades: z.array(z.string()),
  oportunidades: z.array(z.string()),
  amenazas: z.array(z.string()),
});

const gananciaPerdidaSchema = z.object({
  dimension: z.string(),
  ganancia: z.string(),
  perdida: z.string(),
});

const conclusionRentabilidadEnum = z.enum([
  "rentable",
  "potencialmente_rentable",
  "rentable_condicionado",
  "estrategicamente_util_financieramente_debil",
  "financieramente_rentable_operativamente_inviable",
  "no_rentable",
  "informacion_insuficiente",
]);

const rentabilidadSchema = z.object({
  financiera: z.string(),
  tiempo: z.string(),
  estrategica: z.string(),
  personal: z.string(),
  conclusion: conclusionRentabilidadEnum,
});

const stakeholderSchema = z.object({
  nombre: z.string(),
  interes: z.string(),
  poder: nivelRiesgoEnum,
  riesgo: z.string(),
});

const viabilidadSchema = z.object({
  operativa: z.string(),
  economica: z.string(),
  estrategica: z.string(),
});

const escenarioProfundoSchema = z.object({
  tipo: escenarioTipoEnum,
  analisis: z.string(),
  beneficio: z.string(),
  costo: z.string(),
  riesgo: nivelRiesgoEnum,
  probabilidadExito: z.string(),
  impactoFinanciero: z.string(),
  impactoEstrategico: z.string(),
  impactoPersonal: z.string(),
  consecuenciaPrincipal: z.string(),
});

const lenteAnalisisEnum = z.enum([
  "estrategico",
  "economico_financiero",
  "operativo",
  "proyectos",
  "riesgo_reputacion",
  "comercial_negociacion",
  "viabilidad_negocio",
  "industria_musical",
  "conductual",
]);

const lecturaExpertoSchema = z.object({
  perfil: z.string().describe("Nombre del rol activado, ej. 'CFO', 'Project Manager', 'Asesor Legal'"),
  area: z.string().describe("Área a la que pertenece ese perfil, ej. 'Finanzas', 'Riesgo y negociación'"),
  lectura: z.string().describe("Su lectura del caso desde su especialidad, en 2-4 frases concretas"),
});

const recomendacionSchema = z.object({
  decision: z.string(),
  razonPrincipal: z.string(),
  condicionesMinimas: z.array(z.string()),
  limites: z.array(z.string()),
  fechaRevision: z.string(),
  senalSalida: z.string(),
  confianza: z.number(),
  confianzaExplicacion: z.string(),
});

export const strategicCaseGeneratedSchema = z.object({
  preguntaEstrategica: z.string(),
  tipoDeCaso: z
    .string()
    .describe("Clasificación breve del caso, ej. 'Compra importante', 'Contrato musical', 'Decidir si soltar un proyecto'"),
  lentesActivos: z
    .array(lenteAnalisisEnum)
    .describe("Los lentes de análisis relevantes para este caso, solo los que apliquen"),
  panelExpertos: z
    .array(lecturaExpertoSchema)
    .describe("Lecturas de los perfiles profesionales activados para este caso — solo los relevantes, no todos"),
  resumenEjecutivo: z.string(),
  hechos: z.array(hechoOHipotesisSchema),
  hipotesis: z.array(hechoOHipotesisSchema),
  vacios: z.array(z.string()),
  contradicciones: z.array(z.string()),
  puntoDeVista: z.string(),
  dofa: dofaSchema,
  gananciasPerdidas: z.array(gananciaPerdidaSchema),
  rentabilidad: rentabilidadSchema,
  costoOportunidad: z.array(z.string()),
  stakeholders: z.array(stakeholderSchema),
  viabilidad: viabilidadSchema,
  escenarios: z.array(escenarioProfundoSchema),
  recomendacion: recomendacionSchema,
});

export type StrategicCaseGenerated = z.infer<typeof strategicCaseGeneratedSchema>;

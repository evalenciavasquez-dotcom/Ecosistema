import { z } from "zod";

const nivelSchema = z
  .number()
  .int()
  .min(1)
  .max(4)
  .describe("Nivel de evidencia: 4 alta, 3 sólida, 2 parcial/no verificada, 1 especulativo");

export const insightSchema = z.object({
  texto: z.string().describe("Un insight de lectura VINCERE — interpretación, no repetición del dato. 1-3 frases."),
  nivel: nivelSchema,
});

export const interpretResponseSchema = z.object({
  insights: z.array(insightSchema).min(1).max(4).describe("Entre 1 y 4 insights de lectura estratégica"),
});

export const askResponseSchema = z.object({
  respuesta: z.string().describe("Respuesta directa a la pregunta, en español, tono de dirección de carrera — máx ~90 palabras"),
  nivel: nivelSchema,
});

export const triageResponseSchema = z.object({
  veredicto: z.string().describe("Veredicto de una a dos frases con la razón concreta"),
  prioridad: z.enum(["Alta", "Media", "Baja"]).describe("Prioridad de atención del caso"),
  motorRecomendado: z.string().describe("Sección de VINCERE por la que debería empezar el análisis de este caso"),
  nivel: nivelSchema,
});

export type InterpretResponse = z.infer<typeof interpretResponseSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
export type TriageResponse = z.infer<typeof triageResponseSchema>;

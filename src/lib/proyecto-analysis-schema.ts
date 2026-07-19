import { z } from "zod";

export const proyectoAnalysisSchema = z.object({
  potencialIngresos: z
    .string()
    .describe("Evaluación honesta del potencial de ingresos del proyecto, basada solo en lo registrado — 2-4 frases"),
  viasMonetizacion: z
    .array(z.string())
    .max(5)
    .describe("Vías de monetización o crecimiento de ingresos concretas y realistas para este proyecto, máx 5, frases cortas"),
  impactoEnCajaPersonal: z
    .string()
    .describe("Cómo la trayectoria de este proyecto (si avanza bien o mal) afecta la caja personal de Eduardo — conecta con runway/proyección reales, no genérico"),
  riesgoFinanciero: z
    .string()
    .describe("El riesgo financiero más relevante de este proyecto en concreto — no genérico"),
  evidenceLevel: z
    .enum(["verificado", "documentado", "reportado", "interpretacion"])
    .describe("Qué tan sólida es la evidencia real detrás de este análisis"),
});

export type ProyectoAnalysis = z.infer<typeof proyectoAnalysisSchema>;

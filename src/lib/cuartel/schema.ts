import { z } from "zod";

// Esquemas de salida estructurada de Claude para el Cuartel. Con estos, la
// respuesta entra al store como datos y no como un bloque de texto que después
// hay que interpretar a mano.

const luz = z.enum(["verde", "amarillo", "rojo"]);

export const rutaAnalisisSchema = z.object({
  tipo: z.enum(["cortar", "sostener", "rediseñar", "otra"]),
  sombreros: z.object({
    hechos: z.string().describe("Qué se sabe con certeza vs. qué se está asumiendo en esta ruta."),
    emocion: z.string().describe("Qué se siente con esta ruta, sin racionalizar ni justificar."),
    riesgos: z.string().describe("Qué puede salir mal y qué patrón propio se repite acá."),
    beneficio: z.string().describe("Qué se gana de verdad con esta ruta, no lo que se cree ganar."),
    alternativas: z.string().describe("Variantes de esta misma ruta que no se habían considerado."),
    meta: z.string().describe("Si acerca o aleja del objetivo de vida real."),
  }),
  semaforo: z.object({
    desgaste: luz,
    patron: luz,
    costoOportunidad: luz,
    dependencia: luz,
  }),
  justificacionSemaforo: z
    .string()
    .describe("Una frase por métrica en rojo o amarillo explicando por qué esa luz y no otra."),
  legal: z.object({
    nivel: z.enum(["no-aplica", "recomendable", "necesario"]),
    nota: z.string().describe("Qué documento, contrato o gestión conviene, y por qué. Vacío si no aplica."),
  }),
  certezaRiesgos: z.enum(["hecho", "reportado", "interpretacion", "hipotesis"]),
});

export const analisisResponseSchema = z.object({
  rutas: z.array(rutaAnalisisSchema),
  lecturaGeneral: z.string().describe("Qué se ve al poner las rutas una al lado de la otra. Máximo 3 frases."),
});

export const instructorResponseSchema = z.object({
  tipo: z.enum(["contraste", "confrontativa", "consistencia", "psicologica", "aceptacion", "cierre"]),
  pregunta: z.string().describe("La pregunta, o el veredicto si el tipo es aceptación o cierre. Una sola."),
  porQue: z.string().describe("Para qué sirve esta pregunta acá. Una frase, para Eduardo, no para el sistema."),
});

export const recomendacionResponseSchema = z.object({
  rutaId: z.string().describe("El id exacto de la ruta recomendada, tomado del contexto."),
  razon: z.string().describe("Por qué esa ruta queda mejor parada que las otras válidas. 2-4 frases."),
  movidaConcreta: z
    .string()
    .describe("Una sola acción ejecutable, concreta y verificable. Nunca 'hablar las cosas' ni 'reflexionar'."),
  plazo: z.string().describe("Plazo de la movida en lenguaje corto: 'esta semana', 'antes del viernes', '48 horas'."),
  loQueSeAsume: z.string().describe("El supuesto que, si resulta falso, tumba esta recomendación."),
});

export type AnalisisResponse = z.infer<typeof analisisResponseSchema>;
export type InstructorResponse = z.infer<typeof instructorResponseSchema>;
export type RecomendacionResponse = z.infer<typeof recomendacionResponseSchema>;

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

export const songAnalysisResponseSchema = z.object({
  tema: z
    .string()
    .describe("De qué habla la canción de verdad — el tema real y su subtexto, no la lectura obvia de la superficie. 1-2 frases."),
  arcoEmocional: z
    .string()
    .describe("Cómo lleva la emoción de la primera línea al final — la trayectoria, dónde sube y dónde cae. 1-2 frases."),
  gancho: z
    .string()
    .describe("Fuerza del gancho/hook y si engancha rápido en los primeros segundos; conéctalo con el skip rate cuando exista. 1-2 frases."),
  audiencia: z
    .string()
    .describe("A qué audiencia le habla la letra y si cuadra con la que ya escucha al artista (usa la data de audiencia del contexto si está). 1-2 frases."),
  fitMarca: z
    .string()
    .describe("Coherencia con la marca/identidad del artista — ¿suena a este artista o se sale del carril? 1-2 frases."),
  potencial: z
    .string()
    .describe("Lectura del potencial comercial de la canción, justificada — no solo una etiqueta. 1-2 frases."),
  clasificacionPotencial: z
    .enum(["single", "album", "relleno", "incierto"])
    .describe("Clasificación corta del potencial: single (candidata a sencillo), album (buen tema de disco), relleno (descartable), incierto (falta data)"),
  reescrituras: z
    .array(z.string())
    .max(4)
    .describe("Qué reescribiría o afinaría — el verso flojo, el puente que sobra, el gancho tardío. Máx 4, concretas. Vacío si no aplica."),
  decision: z
    .string()
    .describe("Qué hacer con la canción (gestión de director): próximo single, empujar, sacar de rotación, buscar feature, retrabajar. 1-2 frases accionables."),
  nivel: nivelSchema,
});

export const informeResponseSchema = z.object({
  titulo: z
    .string()
    .describe("Título del informe: descriptivo y concreto sobre la situación real del artista, no genérico. Ej. 'Consolidación de SETTE: catálogo concentrado y presupuesto adelantado'"),
  sinopsis: z
    .string()
    .describe("Sinopsis Central: un solo párrafo denso (5-8 frases) que cuenta dónde está la carrera hoy, de qué depende, dónde está la fragilidad y qué se está apostando. Es el corazón del informe — un director debe entender toda la situación leyendo solo esto."),
  bloques: z
    .array(
      z.object({
        titulo: z.string().describe("Título del bloque temático — nombra la tensión o el asunto real, no la sección de origen"),
        parrafos: z.array(z.string()).min(1).max(3).describe("1-3 párrafos que desarrollan el bloque cruzando data de varios motores"),
        nivel: nivelSchema,
      })
    )
    .min(2)
    .max(5)
    .describe("Bloques temáticos que CRUZAN secciones (nunca uno por panel): la tensión entre catálogo y audiencia, entre ritmo de gasto y meta, entre plaza fuerte y expansión, etc."),
  riesgos: z
    .array(
      z.object({
        riesgo: z.string().describe("El riesgo nombrado directo, sin suavizar"),
        consecuencia: z.string().describe("Qué pasa concretamente si se materializa"),
        nivel: nivelSchema,
      })
    )
    .max(4)
    .describe("Riesgos reales derivados de la data, ordenados del más grave al menos. Vacío solo si de verdad no hay ninguno sostenible con la data."),
  oportunidades: z
    .array(
      z.object({
        oportunidad: z.string().describe("La oportunidad concreta, accionable"),
        porQue: z.string().describe("Qué dato la respalda"),
        nivel: nivelSchema,
      })
    )
    .max(4)
    .describe("Oportunidades que hoy no se están aprovechando, respaldadas por la data"),
  proximosPasos: z
    .array(
      z.object({
        accion: z.string().describe("Acción concreta y ejecutable, no una intención vaga"),
        responsable: z.string().describe("Quién la ejecuta — Eduardo (dirección), el artista, el equipo, un tercero nombrado en la data"),
        plazo: z.string().describe("Plazo concreto: 'esta semana', 'antes del cierre de trimestre', 'próximos 30 días'"),
        prioridad: z.enum(["Alta", "Media", "Baja"]),
      })
    )
    .min(2)
    .max(7)
    .describe("Próximos pasos con responsable y plazo — lo que se mueve al salir de esta lectura"),
  veredicto: z
    .string()
    .describe("La postura del director: qué se hace con este proyecto ahora y por qué. Clara y argumentada, nunca un 'depende' neutral. 2-4 frases."),
  nivelGlobal: nivelSchema.describe("Nivel de evidencia global del informe, según qué tan completa es la data disponible"),
});

export type InterpretResponse = z.infer<typeof interpretResponseSchema>;
export type InformeResponse = z.infer<typeof informeResponseSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
export type TriageResponse = z.infer<typeof triageResponseSchema>;
export type SongAnalysisResponse = z.infer<typeof songAnalysisResponseSchema>;

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AJENO, CONTRADICTOR, ESPECIALISTAS, type Especialista } from "./specialists";

// Motor de debate real del análisis estratégico (Bloque 2 de la capa de
// cuestionamiento en decisiones): router de especialistas + dos rondas de
// debate. La síntesis final la hace /api/analyze con el prompt existente,
// alimentado con las transcripciones que este módulo produce.

export interface RondaUnoRespuesta {
  id: string;
  nombre: string;
  texto: string;
}

export interface RondaDosRespuesta {
  id: string;
  nombre: string;
  respuestaMasFuerte: string;
  razonMasFuerte: string;
  puntoCiegoMasGrande: string;
  cualEsElPuntoCiego: string;
  queSeEscapoATodas: string;
}

const IDS_ESPECIALISTAS = ESPECIALISTAS.map((e) => e.id) as [string, ...string[]];

const routerSchema = z.object({
  especialistaIds: z
    .array(z.enum(IDS_ESPECIALISTAS))
    .min(3)
    .max(5)
    .describe(
      "Los 3-5 especialistas más relevantes para este caso específico, por tipo de decisión, proyecto asociado y riesgos detectados. Nunca actives los de industria musical (artist_manager, ar, music_marketing, distribution_manager) si el caso no es de esa industria."
    ),
});

// Elige 3-5 especialistas relevantes al caso — el Contradictor y el Ajeno se
// suman aparte, siempre, en el orquestador (/api/analyze).
export async function elegirEspecialistas(
  client: Anthropic,
  resumenCaso: string
): Promise<Especialista[]> {
  const roster = ESPECIALISTAS.map((e) => `- ${e.id}: ${e.nombre} — ${e.enfoque}`).join("\n");
  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      output_config: { format: zodOutputFormat(routerSchema) },
      system:
        "Eres el router de especialistas del motor de análisis de C.C.O. E.V. Dado un caso, elige del roster solo los especialistas realmente relevantes — activar de más diluye el análisis tanto como activar de menos.",
      messages: [{ role: "user", content: `ROSTER DISPONIBLE:\n${roster}\n\nCASO:\n${resumenCaso}` }],
    });
    const ids = response.parsed_output?.especialistaIds;
    if (!ids || ids.length === 0) return ESPECIALISTAS.slice(0, 4);
    return ids.map((id) => ESPECIALISTAS.find((e) => e.id === id)).filter((e): e is Especialista => !!e);
  } catch {
    // Si el router falla, un panel genérico razonable es mejor que bloquear
    // todo el análisis.
    return ESPECIALISTAS.slice(0, 4);
  }
}

// Ronda 1 — independiente: cada especialista responde sin ver a los demás,
// defendiendo su ángulo al máximo, sin buscar balance ni consenso.
export async function correrRondaUno(
  client: Anthropic,
  especialistas: Especialista[],
  resumenCaso: string
): Promise<RondaUnoRespuesta[]> {
  const resultados = await Promise.all(
    especialistas.map(async (esp) => {
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: `Eres "${esp.nombre}" dentro de un panel de análisis estratégico. Tu enfoque: ${esp.enfoque}\n\nVas a dar tu lectura INDEPENDIENTE de un caso, sin ver lo que dicen los demás especialistas todavía. Responde en 150-300 palabras, en español. No hagas de abogado del diablo cortés, no busques balance ni consenso — defendé tu ángulo al máximo con lo que ves en el caso. No inventes datos que no estén en el contexto.`,
          messages: [{ role: "user", content: resumenCaso }],
        });
        const texto = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return { id: esp.id, nombre: esp.nombre, texto: texto || "(sin respuesta)" };
      } catch (err) {
        console.error(`Ronda 1 falló para ${esp.nombre}`, err);
        return { id: esp.id, nombre: esp.nombre, texto: "(no respondió en esta ronda)" };
      }
    })
  );
  return resultados;
}

const rondaDosSchema = z.object({
  respuestaMasFuerte: z.string().describe("La letra (A, B, C...) de la respuesta que consideras más fuerte"),
  razonMasFuerte: z.string(),
  puntoCiegoMasGrande: z.string().describe("La letra de la respuesta con el punto ciego más grande"),
  cualEsElPuntoCiego: z.string(),
  queSeEscapoATodas: z.string().describe("Lo más importante: qué se le escapó a TODAS las respuestas, incluida la propia"),
});

// Ronda 2 — revisión cruzada anónima: cada especialista ve todas las
// lecturas de la ronda 1 anonimizadas (orden aleatorio) y responde las tres
// preguntas. La anonimización evita que se deferencien por autoridad en vez
// de evaluar el argumento.
export async function correrRondaDos(
  client: Anthropic,
  especialistas: Especialista[],
  rondaUno: RondaUnoRespuesta[]
): Promise<RondaDosRespuesta[]> {
  const letras = "ABCDEFGHIJ";
  const barajado = [...rondaUno].sort(() => Math.random() - 0.5);
  const anonimizado = barajado
    .map((r, i) => `Respuesta ${letras[i]}:\n${r.texto}`)
    .join("\n\n");

  const resultados = await Promise.all(
    especialistas.map(async (esp) => {
      try {
        const response = await client.messages.parse({
          model: "claude-sonnet-5",
          max_tokens: 700,
          output_config: { format: zodOutputFormat(rondaDosSchema) },
          system: `Eres "${esp.nombre}" (${esp.enfoque}). Ya diste tu lectura independiente de este caso. Ahora ves las lecturas de TODO el panel, anonimizadas y en orden aleatorio (la tuya está entre ellas, mezclada, pero no sabés cuál es). Respondé las tres preguntas con honestidad — la pregunta 3 es la más importante: ahí tiene que salir algo que ningún especialista individual iba a ver solo.`,
          messages: [
            {
              role: "user",
              content: `${anonimizado}\n\n1. ¿Cuál respuesta es la más fuerte y por qué?\n2. ¿Cuál tiene el punto ciego más grande y cuál es?\n3. ¿Qué se le escapó a TODAS, incluida la tuya?`,
            },
          ],
        });
        const parsed = response.parsed_output;
        if (!parsed) throw new Error("sin salida estructurada");
        return { id: esp.id, nombre: esp.nombre, ...parsed };
      } catch (err) {
        console.error(`Ronda 2 falló para ${esp.nombre}`, err);
        return {
          id: esp.id,
          nombre: esp.nombre,
          respuestaMasFuerte: "",
          razonMasFuerte: "",
          puntoCiegoMasGrande: "",
          cualEsElPuntoCiego: "",
          queSeEscapoATodas: "(no respondió en esta ronda)",
        };
      }
    })
  );
  return resultados;
}

export { CONTRADICTOR, AJENO };

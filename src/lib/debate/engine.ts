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
  necesitaDatosExternos: z
    .boolean()
    .describe(
      "true SOLO si la decisión depende de hechos verificables del mundo exterior que el caso no trae: precios o tarifas de mercado, condiciones de una industria, qué cobra la competencia, regulación, estado de una plataforma o empresa. false si es una decisión interna de Eduardo (priorizar, delegar, seguir o parar algo suyo) donde buscar afuera no aporta nada."
    ),
  consultaExterna: z
    .string()
    .describe(
      "Si necesitaDatosExternos es true: qué habría que averiguar afuera, en una frase concreta y buscable. Si es false: string vacío."
    ),
});

export interface RouterResultado {
  especialistas: Especialista[];
  necesitaDatosExternos: boolean;
  consultaExterna: string;
}

// Elige 3-5 especialistas relevantes al caso y decide si el caso necesita
// datos del mundo real — el Contradictor y el Ajeno se suman aparte,
// siempre, en el orquestador (/api/analyze).
export async function elegirEspecialistas(
  client: Anthropic,
  resumenCaso: string
): Promise<RouterResultado> {
  const roster = ESPECIALISTAS.map((e) => `- ${e.id}: ${e.nombre} — ${e.enfoque}`).join("\n");
  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      output_config: { format: zodOutputFormat(routerSchema) },
      system:
        "Eres el router de especialistas del motor de análisis de C.C.O. E.V. Dado un caso, elige del roster solo los especialistas realmente relevantes — activar de más diluye el análisis tanto como activar de menos. Además decides si el caso necesita datos verificables de afuera para no analizarse a ciegas.",
      messages: [{ role: "user", content: `ROSTER DISPONIBLE:\n${roster}\n\nCASO:\n${resumenCaso}` }],
    });
    const parsed = response.parsed_output;
    const ids = parsed?.especialistaIds;
    const especialistas =
      !ids || ids.length === 0
        ? ESPECIALISTAS.slice(0, 4)
        : ids.map((id) => ESPECIALISTAS.find((e) => e.id === id)).filter((e): e is Especialista => !!e);
    return {
      especialistas,
      necesitaDatosExternos: parsed?.necesitaDatosExternos ?? false,
      consultaExterna: parsed?.consultaExterna ?? "",
    };
  } catch {
    // Si el router falla, un panel genérico razonable es mejor que bloquear
    // todo el análisis.
    return { especialistas: ESPECIALISTAS.slice(0, 4), necesitaDatosExternos: false, consultaExterna: "" };
  }
}

export interface FuenteExterna {
  titulo: string;
  url: string;
}

export interface InvestigacionCaso {
  hallazgos: string;
  fuentes: FuenteExterna[];
}

// La búsqueda del lado del servidor corre su propio bucle. Si se queda corta
// devuelve pause_turn en vez de un error, y hay que reenviar el turno para
// que siga desde donde quedó — sin esto la investigación se corta a la mitad
// en silencio, que es peor que fallar.
const MAX_REANUDACIONES = 2;

const HERRAMIENTAS_BUSQUEDA = [
  { type: "web_search_20260209", name: "web_search", max_uses: 5 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3, max_content_tokens: 20000 },
] as const;

const INVESTIGACION_SYSTEM_PROMPT = `Eres el investigador de campo del motor de análisis estratégico de C.C.O. E.V. Antes de que el panel de especialistas debata un caso de Eduardo, tu trabajo es traer los datos verificables del mundo real que el caso necesita y no tiene.

Reglas:
- Busca solo lo que la consulta pide. No amplíes el alcance ni investigues de más.
- Reporta cifras, rangos, tarifas y condiciones concretas — no generalidades.
- Distingue siempre lo que encontraste con fuente de lo que es tu inferencia. Si un dato no aparece, dilo explícitamente en vez de rellenarlo.
- Si los datos son viejos o el mercado es opaco, adviértelo: para una decisión, saber que el dato es débil vale más que un número falsamente preciso.
- Responde en español, en prosa compacta. Máximo 400 palabras.`;

// Sale a buscar los datos externos que el router marcó como necesarios. La
// salida es prosa con fuentes: las citas de búsqueda y la salida estructurada
// no conviven en la misma llamada, y aquí lo que se necesita es material para
// que el panel debata, no un objeto tipado.
export async function investigarCaso(
  client: Anthropic,
  consulta: string,
  resumenCaso: string
): Promise<InvestigacionCaso | null> {
  const mensajes: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `CASO (contexto, no lo investigues entero — es solo para que entiendas para qué sirve el dato):\n${resumenCaso.slice(0, 3000)}\n\nLO QUE HAY QUE AVERIGUAR AFUERA:\n${consulta}`,
    },
  ];

  try {
    const bloques: Anthropic.ContentBlock[] = [];
    let respuesta = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      tools: [...HERRAMIENTAS_BUSQUEDA],
      system: INVESTIGACION_SYSTEM_PROMPT,
      messages: mensajes,
    });
    bloques.push(...respuesta.content);

    let reanudaciones = 0;
    while (respuesta.stop_reason === "pause_turn" && reanudaciones < MAX_REANUDACIONES) {
      // El turno pausado se reenvía tal cual; el servidor reconoce dónde
      // quedó. No se añade un mensaje pidiendo que continúe.
      mensajes.push({ role: "assistant", content: respuesta.content as unknown as Anthropic.ContentBlockParam[] });
      respuesta = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        tools: [...HERRAMIENTAS_BUSQUEDA],
        system: INVESTIGACION_SYSTEM_PROMPT,
        messages: mensajes,
      });
      bloques.push(...respuesta.content);
      reanudaciones += 1;
    }

    if (respuesta.stop_reason === "refusal") return null;

    const fuentes: FuenteExterna[] = [];
    const vistas = new Set<string>();
    for (const bloque of bloques) {
      if (bloque.type !== "web_search_tool_result") continue;
      // Un fallo de la herramienta llega como objeto en vez de lista, con
      // código 200: si se indexa a ciegas, revienta aquí.
      if (!Array.isArray(bloque.content)) continue;
      for (const resultado of bloque.content) {
        if (resultado.type !== "web_search_result") continue;
        if (vistas.has(resultado.url)) continue;
        vistas.add(resultado.url);
        fuentes.push({ titulo: resultado.title, url: resultado.url });
      }
    }

    const hallazgos = bloques
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join("\n\n");

    if (!hallazgos) return null;
    return { hallazgos, fuentes };
  } catch (err) {
    // La investigación es un complemento: si falla, el análisis sigue con lo
    // que Eduardo ya sabe en vez de bloquearse.
    console.error("La investigación externa del caso falló", err);
    return null;
  }
}

// Ronda 1 — independiente: cada especialista responde sin ver a los demás,
// defendiendo su ángulo al máximo, sin buscar balance ni consenso.
export async function correrRondaUno(
  client: Anthropic,
  especialistas: Especialista[],
  resumenCaso: string,
  investigacion?: InvestigacionCaso | null
): Promise<RondaUnoRespuesta[]> {
  const contenidoCaso = investigacion
    ? `${resumenCaso}\n\n--- DATOS EXTERNOS VERIFICADOS (traídos de fuentes reales para este caso) ---\n${investigacion.hallazgos}`
    : resumenCaso;

  const resultados = await Promise.all(
    especialistas.map(async (esp) => {
      try {
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: `Eres "${esp.nombre}" dentro de un panel de análisis estratégico. Tu enfoque: ${esp.enfoque}\n\nVas a dar tu lectura INDEPENDIENTE de un caso, sin ver lo que dicen los demás especialistas todavía. Responde en 150-300 palabras, en español. No hagas de abogado del diablo cortés, no busques balance ni consenso — defendé tu ángulo al máximo con lo que ves en el caso. No inventes datos que no estén en el contexto: si el caso trae datos externos verificados, apóyate en ellos y distínguelos de lo que es supuesto tuyo.`,
          messages: [{ role: "user", content: contenidoCaso }],
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

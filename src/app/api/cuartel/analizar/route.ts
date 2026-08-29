import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { analisisResponseSchema } from "@/lib/cuartel/schema";
import { CUARTEL_ANALISIS_SYSTEM_PROMPT, buildAnalisisPrompt } from "@/lib/cuartel/prompt";
// Infraestructura de despliegue compartida, no datos: solo responde si hay
// llave de IA y dónde se configura. Ningún contenido del Cuartel la cruza.
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

// Análisis completo: las rutas del escenario × los 6 sombreros, más el
// semáforo y la capa legal. Lo que devuelve entra al store como propuesta —
// el candado y El Instructor siguen corriendo del lado del sistema.
export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  if (!body?.escenario || !Array.isArray(body?.rutas) || body.rutas.length === 0) {
    return NextResponse.json({ error: "Falta el escenario o las rutas a analizar" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      // Las tres rutas por los seis sombreros es el análisis más pesado del
      // Cuartel: es donde conviene gastar el máximo esfuerzo del modelo.
      output_config: { effort: "max", format: zodOutputFormat(analisisResponseSchema) },
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: CUARTEL_ANALISIS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildAnalisisPrompt(body.escenario, body.rutas) }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el análisis" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

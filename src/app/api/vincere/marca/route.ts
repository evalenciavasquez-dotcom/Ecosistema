import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { marcaResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_MARCA_SYSTEM_PROMPT, buildMarcaUserPrompt } from "@/lib/vincere/prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const { artista, nota } = body ?? {};
  if (!artista) {
    return NextResponse.json({ error: "No llegó el contexto del artista" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // Contrastar marca contra catálogo, audiencia y canales exige cruzar varias
    // fuentes a la vez, no leer una sección: por eso pensamiento adaptativo.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(marcaResponseSchema) },
      system: VINCERE_MARCA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildMarcaUserPrompt({ artista, nota }) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo analizar esta marca." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el diagnóstico de marca" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { arResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_AR_SYSTEM_PROMPT, buildARUserPrompt } from "@/lib/vincere/prompt";

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
    // Cada candidato exige cruzar marca, audiencia y tamaño relativo, y además
    // compararlos entre sí para elegir uno. No es lectura de un panel.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(arResponseSchema) },
      system: VINCERE_AR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildARUserPrompt({ artista, nota }) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo evaluar estos candidatos." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar la evaluación de A&R" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

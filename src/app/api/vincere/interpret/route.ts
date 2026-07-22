import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { interpretResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_SYSTEM_PROMPT, buildInterpretUserPrompt } from "@/lib/vincere/prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.titulo || body?.contexto === undefined) {
    return NextResponse.json({ error: "Falta el título o el contexto de la sección" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 1400,
      output_config: { format: zodOutputFormat(interpretResponseSchema) },
      system: VINCERE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildInterpretUserPrompt(body.titulo, body.contexto, body.instruccion) }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar la interpretación" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

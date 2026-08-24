import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { askResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_SYSTEM_PROMPT, buildAskUserPrompt } from "@/lib/vincere/prompt";
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  if (!body?.titulo || body?.contexto === undefined || !body?.pregunta) {
    return NextResponse.json({ error: "Falta el título, contexto o la pregunta" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 900,
      output_config: { format: zodOutputFormat(askResponseSchema) },
      system: VINCERE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildAskUserPrompt(body.titulo, body.contexto, body.pregunta) }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar una respuesta" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

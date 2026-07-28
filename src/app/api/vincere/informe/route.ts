import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { informeResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_INFORME_SYSTEM_PROMPT, buildInformeUserPrompt } from "@/lib/vincere/prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.contexto) {
    return NextResponse.json({ error: "Falta el contexto del proyecto" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // El informe es el análisis profundo del sistema: cruza todos los motores,
    // así que va con presupuesto amplio y razonamiento adaptativo.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(informeResponseSchema) },
      system: VINCERE_INFORME_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildInformeUserPrompt(body.contexto, body.fecha ?? new Date().toISOString().slice(0, 10)),
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo emitir el informe para este caso." }, { status: 502 });
    }

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el informe" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

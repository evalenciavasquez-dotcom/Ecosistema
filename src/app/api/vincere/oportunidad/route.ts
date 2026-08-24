import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { oportunidadResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_OPORTUNIDAD_SYSTEM_PROMPT, buildOportunidadUserPrompt } from "@/lib/vincere/prompt";
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  const { artista, nota } = body ?? {};
  if (!artista) {
    return NextResponse.json({ error: "No llegó el contexto del artista" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // El análisis más caro del sistema: puntúa, estructura varias formas de
    // trato con su economía y proyecta escenarios. Presupuesto amplio.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(oportunidadResponseSchema) },
      system: VINCERE_OPORTUNIDAD_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildOportunidadUserPrompt({ artista, nota }) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo evaluar esta oportunidad." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el análisis de oportunidad" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

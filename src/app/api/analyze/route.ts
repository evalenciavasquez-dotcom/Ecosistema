import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { strategicCaseGeneratedSchema } from "@/lib/strategic-case-schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/analysis-prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada en el servidor. Agrégala en las variables de entorno." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.decision?.pregunta) {
    return NextResponse.json({ error: "Falta la pregunta de la decisión." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 10000,
      thinking: { type: "adaptive" },
      output_config: {
        format: zodOutputFormat(strategicCaseGeneratedSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(body) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "El sistema no pudo generar el análisis para este caso." },
        { status: 502 }
      );
    }

    if (response.parsed_output == null) {
      return NextResponse.json(
        { error: "El modelo no devolvió un análisis con el formato esperado. Intenta de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido llamando a Claude.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

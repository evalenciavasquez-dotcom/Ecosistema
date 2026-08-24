import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { monetizacionResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_MONETIZACION_SYSTEM_PROMPT, buildMonetizacionUserPrompt } from "@/lib/vincere/prompt";
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
    // Cruzar reparto de ingresos, esfuerzo y vías posibles exige comparar
    // varias cosas entre sí, no leer una tabla.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(monetizacionResponseSchema) },
      system: VINCERE_MONETIZACION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildMonetizacionUserPrompt({ artista, nota }) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo analizar esta monetización." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el análisis de monetización" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

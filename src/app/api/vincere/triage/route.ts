import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { triageResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_TRIAGE_SYSTEM_PROMPT, buildTriageUserPrompt } from "@/lib/vincere/prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.nombre || !body?.descripcion) {
    return NextResponse.json({ error: "Falta el nombre o la descripción del caso" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 700,
      output_config: { format: zodOutputFormat(triageResponseSchema) },
      system: VINCERE_TRIAGE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildTriageUserPrompt({
            nombre: body.nombre,
            genero: body.genero ?? "",
            fase: body.fase ?? "",
            descripcion: body.descripcion,
          }),
        },
      ],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el veredicto" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

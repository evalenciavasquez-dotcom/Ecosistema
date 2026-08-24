import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { triageResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_TRIAGE_SYSTEM_PROMPT, buildTriageUserPrompt } from "@/lib/vincere/prompt";
import { VincereCantidadData } from "@/lib/vincere/types";
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

// Si el cliente no la declara, se asume la peor: es la que menos deja afirmar.
const CANTIDADES: VincereCantidadData[] = ["baja", "media", "alta"];

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

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
            dataDisponible: CANTIDADES.includes(body.dataDisponible) ? body.dataDisponible : "baja",
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

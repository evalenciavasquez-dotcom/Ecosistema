import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { pitchResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_PITCH_SYSTEM_PROMPT, buildPitchUserPrompt } from "@/lib/vincere/prompt";

const DESTINOS = ["dsp", "disquera", "marca", "promotor"] as const;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const { artista, destino, objetivo, plaza } = body ?? {};
  if (!artista) {
    return NextResponse.json({ error: "No llegó el contexto del artista" }, { status: 400 });
  }
  if (!(DESTINOS as readonly string[]).includes(destino)) {
    return NextResponse.json({ error: "Destino de pitch no válido" }, { status: 400 });
  }
  // Un pitch a un promotor sin plaza sería el pitch genérico que este destino
  // existe para no escribir.
  if (destino === "promotor" && typeof plaza !== "string") {
    return NextResponse.json({ error: "Un pitch a promotor necesita la ciudad de la fecha" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // Redacta un documento que se manda a un tercero: se le da presupuesto
    // amplio porque el texto sale final, no en borrador.
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(pitchResponseSchema) },
      system: VINCERE_PITCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPitchUserPrompt({ artista, destino, objetivo, plaza }) }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo escribir este pitch." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el pitch" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

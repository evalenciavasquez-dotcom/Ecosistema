import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { songAnalysisResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_SONG_SYSTEM_PROMPT, buildSongAnalysisUserPrompt } from "@/lib/vincere/prompt";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.cancion?.nombre || !body?.letra?.trim()) {
    return NextResponse.json({ error: "Falta la canción o la letra a analizar" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      // Con medidas de audio y de métrica la lectura tiene que cruzar tres
      // fuentes distintas, no solo leer una letra: se le da margen y se le
      // deja razonar.
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(songAnalysisResponseSchema) },
      system: VINCERE_SONG_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildSongAnalysisUserPrompt({
            cancion: body.cancion,
            letra: body.letra,
            artista: body.artista ?? {},
            audio: body.audio ?? undefined,
            metrica: body.metrica ?? undefined,
            notasProduccion: typeof body.notasProduccion === "string" ? body.notasProduccion : undefined,
          }),
        },
      ],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el análisis de la canción" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

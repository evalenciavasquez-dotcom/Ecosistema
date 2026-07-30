import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ingestResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_INGEST_SYSTEM_PROMPT, buildIngestUserPrompt } from "@/lib/vincere/prompt";

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const { data, mediaType, texto, nota, artista } = body ?? {};

  const tieneArchivo = typeof data === "string" && data.length > 0 && typeof mediaType === "string";
  const tieneTexto = typeof texto === "string" && texto.trim().length > 0;
  if (!tieneArchivo && !tieneTexto) {
    return NextResponse.json({ error: "No llegó ningún material para leer" }, { status: 400 });
  }

  const isImage = tieneArchivo && (IMAGE_TYPES as readonly string[]).includes(mediaType);
  const isPdf = tieneArchivo && mediaType === "application/pdf";

  if (tieneArchivo) {
    if (data.length * 0.75 > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 8 MB" }, { status: 413 });
    }
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: `Tipo no soportado: ${mediaType}. Acepto imágenes (JPG, PNG, WebP, GIF) y PDF. Para CSV o Excel, pega el contenido como texto.` },
        { status: 415 }
      );
    }
  }

  const contenido: Anthropic.ContentBlockParam[] = [];
  if (isImage) {
    contenido.push({
      type: "image",
      source: { type: "base64", media_type: mediaType as ImageMediaType, data },
    });
  } else if (isPdf) {
    contenido.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    });
  }
  contenido.push({ type: "text", text: buildIngestUserPrompt({ artista: artista ?? {}, nota, texto }) });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      output_config: { format: zodOutputFormat(ingestResponseSchema) },
      system: VINCERE_INGEST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: contenido }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo leer este material." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo extraer data de este material" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

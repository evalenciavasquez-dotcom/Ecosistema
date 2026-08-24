import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ingestResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_INGEST_SYSTEM_PROMPT, buildIngestUserPrompt } from "@/lib/vincere/prompt";
import { exigirLlaveDeIA, hayLlaveDeIA, dondeCorre, DONDE_SE_ARREGLA } from "@/lib/vincere/llave";
import { normalizarIngesta } from "@/lib/vincere/ingesta";

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

// Si la IA está configurada o no. Se consulta ANTES de que alguien suba un
// archivo, no después: descubrir que falta la llave recién al apretar el botón
// —con el material ya cargado y la expectativa puesta— hace parecer roto lo
// que solo está sin configurar. Devuelve un booleano y nada más: la llave
// nunca sale del servidor.
//
// Vive en esta ruta y no en una propia porque cualquier pantalla que use IA
// puede preguntarle: la respuesta es la misma para todas.
export async function GET() {
  const donde = dondeCorre();
  return NextResponse.json({
    iaConfigurada: hayLlaveDeIA(),
    // Dónde corre y dónde se arregla. Sin esto, "falta la llave" en local y
    // "falta la llave" en producción se ven igual y se arreglan en lugares
    // distintos — que es exactamente la tarde que costó descubrirlo.
    donde,
    comoSeArregla: DONDE_SE_ARREGLA[donde],
  });
}

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

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

    // Del formato plano del cable al que espera la app: vacío vuelve a ser
    // null y la lista de mediciones vuelve a ser el resumen.
    return NextResponse.json({ result: normalizarIngesta(response.parsed_output) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

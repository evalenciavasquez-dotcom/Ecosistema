import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MAX_BYTES = 8 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

const SYSTEM = `Eres el lector de documentos de C.C.O. E.V., el sistema privado de control estratégico de Eduardo. Recibes una imagen (usualmente un pantallazo de WhatsApp, una foto de un documento o un comprobante) o un PDF (contrato, cotización, extracto).

Tu trabajo: extraer la información relevante en un resumen corto y accionable en español, como si Eduardo se lo dictara a su asistente. Incluye SIEMPRE que existan: quién habla o firma, montos con moneda, fechas, compromisos, y qué se pide o se acuerda. Si es una conversación, resume qué se dijo y qué queda pendiente. No inventes nada que no esté en el documento. Máximo 5 frases.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const { data, mediaType, nota } = body ?? {};
  if (!data || typeof data !== "string" || !mediaType) {
    return NextResponse.json({ error: "Faltan 'data' (base64) o 'mediaType'" }, { status: 400 });
  }
  if (data.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 8 MB" }, { status: 413 });
  }

  const isImage = (IMAGE_TYPES as readonly string[]).includes(mediaType);
  const isPdf = mediaType === "application/pdf";
  if (!isImage && !isPdf) {
    return NextResponse.json(
      { error: `Tipo no soportado: ${mediaType}. Acepto imágenes (JPG, PNG, WebP, GIF) y PDF.` },
      { status: 415 }
    );
  }

  const client = new Anthropic({ apiKey });

  const fileBlock = isImage
    ? {
        type: "image" as const,
        source: { type: "base64" as const, media_type: mediaType as ImageMediaType, data },
      }
    : {
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data },
      };

  const instruccion = nota
    ? `Nota de Eduardo sobre este archivo: "${nota}". Extrae la información relevante.`
    : "Extrae la información relevante de este archivo.";

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: instruccion }],
        },
      ],
    });

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) {
      return NextResponse.json({ error: "No se pudo extraer contenido del archivo" }, { status: 502 });
    }

    return NextResponse.json({ result: texto });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

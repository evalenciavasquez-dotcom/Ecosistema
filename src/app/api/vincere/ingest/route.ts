import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ingestResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_INGEST_SYSTEM_PROMPT, buildIngestUserPrompt } from "@/lib/vincere/prompt";
import { exigirLlaveDeIA, hayLlaveDeIA, dondeCorre, DONDE_SE_ARREGLA } from "@/lib/vincere/llave";
import { normalizarIngesta } from "@/lib/vincere/ingesta";

// Por qué no se pudo interpretar la respuesta.
//
// "No se pudo extraer data de este material" era el único mensaje para tres
// causas distintas, y encima suena a que el material no servía — cuando la más
// común es que la respuesta no cupo. Quien lo lee se pone a buscar otro
// archivo en vez de dividir el que tiene.
function porQueNoSePudo(response: { stop_reason?: string | null; content?: unknown }): string {
  if (response.stop_reason === "max_tokens") {
    return (
      "La lectura se cortó por longitud: el material trae más data de la que cabe en una sola respuesta, así que el " +
      "resultado llegó incompleto y no se pudo interpretar. No es que el archivo esté mal — es que es muy grande de " +
      "una vez. Divídelo (por ejemplo, las páginas de audiencia por un lado y las de catálogo por otro) y súbelo en dos tandas."
    );
  }

  // Cuánto texto llegó a devolver. Un cero indica que ni siquiera empezó, que
  // es un problema distinto de haber devuelto algo que no se pudo leer.
  const bloques = Array.isArray(response.content) ? response.content : [];
  const texto = bloques
    .map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text) : ""))
    .join("");

  if (!texto.trim()) {
    return (
      "La lectura volvió vacía: el modelo no devolvió nada que interpretar. Suele pasar cuando el PDF es solo imágenes " +
      "sin texto legible, o cuando está protegido. Prueba con una captura de pantalla de la página que interesa."
    );
  }

  return `La respuesta llegó pero no se pudo interpretar (motivo: ${response.stop_reason ?? "desconocido"}). Empezaba así: «${texto.slice(0, 160)}…»`;
}

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
      // Un PDF de panel trae catálogo, ciudades, audiencia y KPIs a la vez, y
      // todo eso sale como JSON. Con 4.000 la respuesta se cortaba a media
      // frase: el JSON quedaba roto, el parseo devolvía null y el sistema solo
      // sabía decir "no se pudo extraer data" — que suena a que el material no
      // servía, cuando lo que pasó fue que no cupo la respuesta.
      max_tokens: 16000,
      output_config: { format: zodOutputFormat(ingestResponseSchema) },
      system: VINCERE_INGEST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: contenido }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo leer este material." }, { status: 502 });
    }

    // Cuando no se pudo parsear, la razón importa: cada una se arregla
    // distinto y antes las tres caían en el mismo mensaje mudo.
    if (response.parsed_output == null) {
      return NextResponse.json({ error: porQueNoSePudo(response) }, { status: 502 });
    }

    // Del formato plano del cable al que espera la app: vacío vuelve a ser
    // null y la lista de mediciones vuelve a ser el resumen.
    return NextResponse.json({ result: normalizarIngesta(response.parsed_output) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

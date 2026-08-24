import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { triageResponseSchema } from "@/lib/vincere/schema";
import { VINCERE_TRIAGE_SYSTEM_PROMPT, buildTriageUserPrompt } from "@/lib/vincere/prompt";
import { exigirLlaveDeIA } from "@/lib/vincere/llave";
import { evidenciaDeEntrada, aplicarTecho } from "@/lib/vincere/entrada";

// El motor de entrada: decidir si se entra a un caso.
//
// Antes era un formulario que solo leía lo que se escribiera a mano, y el
// alcance del veredicto salía de tres botones que el propio usuario marcaba.
// Ahora lee el material —el mismo PDF o captura que lee la ingesta—, puede
// mirar la data del proyecto si el artista ya está en el sistema, y el techo
// de evidencia lo calcula el sistema con lo que de verdad hay.

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  if (!body?.nombre) {
    return NextResponse.json({ error: "Falta el nombre del caso" }, { status: 400 });
  }

  const { data, mediaType } = body;
  const tieneArchivo = typeof data === "string" && data.length > 0 && typeof mediaType === "string";
  const isImage = tieneArchivo && (IMAGE_TYPES as readonly string[]).includes(mediaType);
  const isPdf = tieneArchivo && mediaType === "application/pdf";

  if (tieneArchivo) {
    if (data.length * 0.75 > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo supera el límite de 8 MB" }, { status: 413 });
    }
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: `Tipo no soportado: ${mediaType}. Acepto imágenes (JPG, PNG, WebP, GIF) y PDF.` },
        { status: 415 }
      );
    }
  }

  const descripcion = typeof body.descripcion === "string" ? body.descripcion : "";

  // El techo se calcula acá con los hechos que llegaron, no con lo que nadie
  // declare. El navegador calcula el mismo número con la misma función para
  // poder mostrarlo antes de pedir nada — pero el que manda es este.
  const evidencia = evidenciaDeEntrada({
    descripcion,
    tieneArchivo,
    investigoWeb: !!body.investigoWeb,
    proyectoConMedicion: !!body.proyectoConMedicion,
    proyectoConHistorico: !!body.proyectoConHistorico,
  });

  if (!evidencia.suficienteParaVeredicto) {
    return NextResponse.json(
      {
        error:
          "No hay nada sobre lo que decidir todavía: hace falta una descripción del caso o material adjunto. " +
          "Un veredicto sobre nada sería una opinión con formato de análisis.",
      },
      { status: 400 }
    );
  }

  const contenido: Anthropic.ContentBlockParam[] = [];
  if (isImage) {
    contenido.push({ type: "image", source: { type: "base64", media_type: mediaType as ImageMediaType, data } });
  } else if (isPdf) {
    contenido.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
  }
  contenido.push({
    type: "text",
    text: buildTriageUserPrompt({
      nombre: body.nombre,
      genero: body.genero ?? "",
      fase: body.fase ?? "",
      descripcion,
      techo: evidencia.techo,
      porQueEseTecho: evidencia.porQue,
      fuentes: evidencia.fuentes,
      // Lo que el sistema ya sabe del artista, cuando ya está cargado. Es la
      // diferencia entre pedirle a Eduardo que describa de memoria a un
      // artista que el sistema tiene medido, y leerlo.
      datosDelProyecto: body.datosDelProyecto ?? null,
      investigacion: body.investigacion ?? null,
    }),
  });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      // Sube de 700 porque ahora puede venir con un PDF adelante: el veredicto
      // sigue siendo corto, pero cortarlo a media frase da un null mudo.
      max_tokens: 2000,
      output_config: { format: zodOutputFormat(triageResponseSchema) },
      system: VINCERE_TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: contenido }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo leer este caso." }, { status: 502 });
    }
    if (response.parsed_output == null) {
      return NextResponse.json(
        {
          error:
            response.stop_reason === "max_tokens"
              ? "El veredicto se cortó por longitud. Si adjuntaste un PDF muy grande, prueba con las páginas que importan."
              : `No se pudo generar el veredicto (motivo: ${response.stop_reason ?? "desconocido"}).`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      result: {
        ...response.parsed_output,
        // El recorte final. Pedirle al modelo que se autolimite y confiar en
        // que lo hizo deja la regla más importante del motor a merced de una
        // corrida: si un día devuelve 4 sobre un párrafo, entra al marcador
        // de predicciones como evidencia sólida y nadie se entera.
        nivel: aplicarTecho(response.parsed_output.nivel, evidencia.techo),
      },
      evidencia,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

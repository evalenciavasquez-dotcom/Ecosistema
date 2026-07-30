import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { researchResponseSchema } from "@/lib/vincere/schema";
import {
  VINCERE_RESEARCH_SEARCH_PROMPT,
  VINCERE_RESEARCH_SYSTEM_PROMPT,
  buildResearchSearchPrompt,
  buildResearchStructurePrompt,
} from "@/lib/vincere/prompt";

const TIPOS = ["artista", "cancion", "mercado", "libre"] as const;

// La búsqueda del lado del servidor corre un bucle propio de hasta diez pasos.
// Si se queda corto devuelve pause_turn en vez de un error, y hay que
// reenviarlo para que siga desde donde estaba. Sin esto la investigación se
// corta a la mitad en silencio, que es peor que fallar.
const MAX_REANUDACIONES = 3;

const HERRAMIENTAS = [
  { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4, max_content_tokens: 30000 },
] as const;

interface FuenteRecogida {
  titulo: string;
  url: string;
  fecha: string | null;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const { tipo, consulta, artista } = body ?? {};

  if (typeof consulta !== "string" || consulta.trim().length < 3) {
    return NextResponse.json({ error: "Escribe qué quieres investigar" }, { status: 400 });
  }
  const tipoValido = (TIPOS as readonly string[]).includes(tipo) ? (tipo as string) : "libre";

  const client = new Anthropic({ apiKey });

  try {
    // --- Fase 1: salir a buscar ---
    // Se razona con las páginas en contexto y se responde en prosa. Aquí no se
    // pide formato tipado a propósito: las citas de búsqueda y la salida
    // estructurada no conviven en la misma llamada.
    const mensajes: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: buildResearchSearchPrompt({ tipo: tipoValido, consulta: consulta.trim(), artista: artista ?? {} }),
      },
    ];

    const bloques: Anthropic.ContentBlock[] = [];
    let respuesta = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      tools: [...HERRAMIENTAS],
      system: VINCERE_RESEARCH_SEARCH_PROMPT,
      messages: mensajes,
    });
    bloques.push(...respuesta.content);

    let reanudaciones = 0;
    while (respuesta.stop_reason === "pause_turn" && reanudaciones < MAX_REANUDACIONES) {
      // Se reenvía el turno pausado tal cual; el servidor reconoce dónde
      // quedó. No se añade un mensaje de usuario pidiendo que continúe.
      mensajes.push({ role: "assistant", content: respuesta.content as unknown as Anthropic.ContentBlockParam[] });
      respuesta = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        tools: [...HERRAMIENTAS],
        system: VINCERE_RESEARCH_SEARCH_PROMPT,
        messages: mensajes,
      });
      bloques.push(...respuesta.content);
      reanudaciones += 1;
    }

    if (respuesta.stop_reason === "refusal") {
      return NextResponse.json({ error: "El sistema no pudo investigar esta consulta." }, { status: 502 });
    }

    const fuentes: FuenteRecogida[] = [];
    const vistas = new Set<string>();
    let busquedas = 0;
    let erroresDeBusqueda = 0;

    for (const bloque of bloques) {
      if (bloque.type !== "web_search_tool_result") continue;
      busquedas += 1;
      // Un fallo de la herramienta llega como objeto en vez de lista, con
      // código 200 en la respuesta: si se indexa a ciegas, revienta aquí.
      if (!Array.isArray(bloque.content)) {
        erroresDeBusqueda += 1;
        continue;
      }
      for (const resultado of bloque.content) {
        if (resultado.type !== "web_search_result") continue;
        if (vistas.has(resultado.url)) continue;
        vistas.add(resultado.url);
        fuentes.push({ titulo: resultado.title, url: resultado.url, fecha: resultado.page_age ?? null });
      }
    }

    const reporte = bloques
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join("\n\n");

    if (!reporte) {
      return NextResponse.json(
        {
          error:
            erroresDeBusqueda > 0
              ? "La búsqueda web falló y no se pudo reunir material. Vuelve a intentarlo en un momento."
              : "La investigación no devolvió material utilizable.",
        },
        { status: 502 }
      );
    }

    // --- Fase 2: estructurar lo encontrado ---
    // Sin herramientas y sin citas: solo ordenar el reporte en el modelo del
    // sistema, atando cada hallazgo al número de fuente que lo respalda.
    const estructurada = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(researchResponseSchema) },
      system: VINCERE_RESEARCH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildResearchStructurePrompt({
            consulta: consulta.trim(),
            artista: artista ?? {},
            reporte,
            fuentes,
          }),
        },
      ],
    });

    if (estructurada.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo ordenar el resultado de la investigación" }, { status: 502 });
    }

    return NextResponse.json({
      result: estructurada.parsed_output,
      fuentes,
      busquedas,
      // Sin fuentes la lectura sigue sirviendo, pero es criterio y no
      // evidencia: la interfaz tiene que poder decirlo.
      sinFuentes: fuentes.length === 0,
      truncada: respuesta.stop_reason === "pause_turn",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

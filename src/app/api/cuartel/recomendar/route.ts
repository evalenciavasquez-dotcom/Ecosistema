import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { recomendacionResponseSchema } from "@/lib/cuartel/schema";
import { CUARTEL_RECOMENDACION_SYSTEM_PROMPT, buildRecomendacionPrompt } from "@/lib/cuartel/prompt";
// Infraestructura de despliegue compartida, no datos: solo responde si hay
// llave de IA y dónde se configura. Ningún contenido del Cuartel la cruza.
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

interface RutaValida {
  id: string;
  etiqueta: string;
  sombreros: Record<string, string>;
  semaforo: Record<string, string | null>;
  rojos: number;
}

// Recomendación sobre las rutas válidas. Las descartadas por el candado
// llegan solo como contexto de "esto ya no compite": el modelo no puede
// devolverlas, y si lo intenta la respuesta se rechaza más abajo.
export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  const validas: RutaValida[] = Array.isArray(body?.rutas) ? body.rutas : [];
  if (!body?.escenario || validas.length === 0) {
    return NextResponse.json({ error: "Falta el escenario o las rutas válidas" }, { status: 400 });
  }
  if (validas.length < 2) {
    return NextResponse.json(
      { error: "Con una sola ruta válida no hay comparación que hacer. Completá el análisis de las demás." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2500,
      output_config: { effort: "high", format: zodOutputFormat(recomendacionResponseSchema) },
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: CUARTEL_RECOMENDACION_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user", content: buildRecomendacionPrompt(body.escenario, validas, body.descartadas ?? []) },
      ],
    });

    const parsed = response.parsed_output;
    if (parsed == null) {
      return NextResponse.json({ error: "No se pudo generar la recomendación" }, { status: 502 });
    }

    if (!validas.some((r) => r.id === parsed.rutaId)) {
      return NextResponse.json(
        { error: "La recomendación no apunta a ninguna de las rutas válidas. Se descarta." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

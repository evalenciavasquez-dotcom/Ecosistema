import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { bulkSplitSchema } from "@/lib/bulk-split-schema";

const SYSTEM = `Eres el divisor de resúmenes largos de la Bandeja de entrada de C.C.O. E.V., el sistema privado de Eduardo. Recibes un texto largo que puede mezclar varias novedades distintas de golpe (pagos, decisiones, riesgos, eventos, notas, de uno o varios proyectos) y tu trabajo es separarlo en fragmentos atómicos — cada fragmento debe contener UNA sola novedad, lista para que el sistema la clasifique y procese por separado después.

Reglas obligatorias:
1. No mezcles dos hechos distintos en un mismo fragmento, aunque estén en la misma frase del texto original.
2. No inventes información que no esté en el texto. No completes detalles que faltan.
3. Mantén las palabras y cifras originales de Eduardo tal cual — no las reinterpretes ni las resumas de más.
4. Si el texto ya es una sola novedad (no mezcla varias cosas), devuelve un solo fragmento con el texto, limpio de relleno innecesario.
5. Ignora saludos, relleno conversacional o texto que no aporte ninguna novedad real.
6. Máximo 20 fragmentos.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.texto || typeof body.texto !== "string") {
    return NextResponse.json({ error: "Falta 'texto'" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      output_config: { format: zodOutputFormat(bulkSplitSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Divide este texto en novedades atómicas:\n\n${body.texto}` }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo dividir el texto" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

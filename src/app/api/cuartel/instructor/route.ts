import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { instructorResponseSchema } from "@/lib/cuartel/schema";
import { CUARTEL_INSTRUCTOR_SYSTEM_PROMPT, buildInstructorPrompt } from "@/lib/cuartel/prompt";

interface Turno {
  tipo: string;
  pregunta: string;
  respuesta: string | null;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.escenario || !body?.ruta) {
    return NextResponse.json({ error: "Falta el escenario o la ruta en examen" }, { status: 400 });
  }

  const turnos: Turno[] = Array.isArray(body.turnos) ? body.turnos : [];
  const respondidas = turnos.filter((t) => t.respuesta && String(t.respuesta).trim()).length;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 700,
      output_config: { format: zodOutputFormat(instructorResponseSchema) },
      system: CUARTEL_INSTRUCTOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildInstructorPrompt(body.escenario, body.ruta, turnos) }],
    });

    const parsed = response.parsed_output;
    if (parsed == null) {
      return NextResponse.json({ error: "El Instructor no devolvió una pregunta" }, { status: 502 });
    }

    // La regla de secuencia se verifica acá y no solo en el prompt: la primera
    // vez, la pregunta tiene que poner la ruta a prueba de verdad. Si el modelo
    // devuelve una de consuelo o de cierre anticipado, se rechaza en vez de
    // dejar que desbloquee la validez sin haber confrontado nada.
    if (respondidas === 0 && parsed.tipo !== "contraste" && parsed.tipo !== "confrontativa") {
      return NextResponse.json(
        {
          error:
            "El Instructor devolvió una pregunta que no pone la ruta a prueba. Volvé a pedirla: la primera tiene que ser de contraste o confrontación.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

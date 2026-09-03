import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { instructorResponseSchema } from "@/lib/cuartel/schema";
import { CUARTEL_INSTRUCTOR_SYSTEM_PROMPT, buildInstructorPrompt } from "@/lib/cuartel/prompt";
// Infraestructura de despliegue compartida, no datos: solo responde si hay
// llave de IA y dónde se configura. Ningún contenido del Cuartel la cruza.
import { exigirLlaveDeIA } from "@/lib/vincere/llave";

interface Turno {
  tipo: string;
  pregunta: string;
  respuesta: string | null;
}

export async function POST(request: Request) {
  const apiKey = exigirLlaveDeIA();
  if (typeof apiKey !== "string") return apiKey;

  const body = await request.json().catch(() => null);
  if (!body?.escenario || !body?.ruta) {
    return NextResponse.json({ error: "Falta el escenario o la ruta en examen" }, { status: 400 });
  }

  const turnos: Turno[] = Array.isArray(body.turnos) ? body.turnos : [];
  const respondidas = turnos.filter((t) => t.respuesta && String(t.respuesta).trim()).length;

  const client = new Anthropic({ apiKey });

  async function preguntar(correccion?: string) {
    const contenido = buildInstructorPrompt(body.escenario, body.ruta, turnos);
    return client.messages.parse({
      // El Instructor decide si una ruta llega a tener validez: es la llamada
      // donde más pesa el criterio y menos sirve una pregunta de manual. Va en
      // Opus como el interrogatorio socrático del C.C.O., no en el modelo
      // liviano con el que nació.
      model: "claude-opus-5",
      max_tokens: 1200,
      output_config: { effort: "high", format: zodOutputFormat(instructorResponseSchema) },
      thinking: { type: "adaptive" },
      // El sistema no cambia entre corridas: se cachea.
      system: [
        { type: "text" as const, text: CUARTEL_INSTRUCTOR_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
      ],
      messages: [{ role: "user" as const, content: correccion ? `${contenido}\n\n${correccion}` : contenido }],
    });
  }

  // La regla de secuencia se verifica acá y no solo en el prompt: la primera
  // vez, la pregunta tiene que poner la ruta a prueba de verdad — si una de
  // consuelo pasara, desbloquearía la validez sin haber confrontado nada.
  const habilita = (tipo: string) => tipo === "contraste" || tipo === "confrontativa";

  try {
    let parsed = (await preguntar()).parsed_output;

    // Antes, una respuesta del tipo equivocado terminaba en un error que le
    // pedía a Eduardo volver a intentar. El que se equivocó fue el modelo: se
    // le dice y se le pide de nuevo, una sola vez.
    if (parsed && respondidas === 0 && !habilita(parsed.tipo)) {
      parsed =
        (
          await preguntar(
            "La pregunta anterior no ponía la ruta a prueba. Es la primera vuelta sobre esta ruta: devolvé una de tipo contraste o confrontativa, y ninguna otra."
          )
        ).parsed_output ?? parsed;
    }

    if (parsed == null) {
      return NextResponse.json({ error: "El Instructor no devolvió una pregunta" }, { status: 502 });
    }

    if (respondidas === 0 && !habilita(parsed.tipo)) {
      return NextResponse.json(
        {
          error:
            "El Instructor insistió con una pregunta que no pone la ruta a prueba. No se acepta: la primera tiene que ser de contraste o confrontación. Volvé a pedirla.",
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

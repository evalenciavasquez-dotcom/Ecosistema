import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generarTurnoInterrogatorio, MAX_PREGUNTAS, type ContextoInterrogatorio } from "@/lib/interrogatorioIA";
import type { TurnoInterrogatorio } from "@/lib/types";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada en el servidor." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const ctx = body?.ctx as ContextoInterrogatorio | undefined;
  const turnos = (body?.turnos ?? []) as TurnoInterrogatorio[];
  if (!ctx?.decision?.pregunta) {
    return NextResponse.json({ error: "Falta el contexto de la decisión." }, { status: 400 });
  }
  const preguntasHechas = turnos.filter((t) => t.rol === "sistema").length;
  if (preguntasHechas >= MAX_PREGUNTAS) {
    return NextResponse.json({ error: "Ya se llegó al máximo de preguntas de esta sesión." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const turno = await generarTurnoInterrogatorio(client, ctx, turnos);
    return NextResponse.json({ turno });
  } catch (err) {
    console.error("Error generando el turno del interrogatorio", err);
    return NextResponse.json({ error: "No se pudo generar la siguiente pregunta." }, { status: 500 });
  }
}

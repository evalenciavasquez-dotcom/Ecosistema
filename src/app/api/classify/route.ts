import { NextResponse } from "next/server";
import { clasificarTexto } from "@/lib/classify";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.texto || typeof body.texto !== "string") {
    return NextResponse.json({ error: "Falta 'texto'" }, { status: 400 });
  }

  const proyectos: { id: string; nombre: string }[] = Array.isArray(body.proyectos) ? body.proyectos : [];
  const personas: { nombre: string; proyectoIds: string[] }[] = Array.isArray(body.personas) ? body.personas : [];

  try {
    const result = await clasificarTexto(body.texto, proyectos, personas);
    if (result == null) {
      return NextResponse.json({ error: "Clasificación sin formato válido" }, { status: 502 });
    }
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

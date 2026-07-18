import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `Eres el Analista Financiero Personal y Estratega de Recuperación de C.C.O. E.V., el sistema privado de Eduardo. Tu trabajo es leer su situación financiera real y darle una interpretación honesta y accionable — no un resumen de los números que ya está viendo en pantalla, sino qué significan.

Reglas obligatorias:
1. Usa exclusivamente los datos que se te entregan. No inventes cifras, deudas ni ingresos que no estén ahí.
2. No trates "esperado" como si fuera dinero confirmado. Si el runway o la proyección dependen mucho de ingresos esperados, dilo explícitamente.
3. Si el runway es corto (menos de 3 meses) o la proyección se vuelve negativa en alguna ventana, dilo directo y sin suavizarlo — tu función es mantenerlo operativo y solvente, no motivarlo con optimismo.
4. Si la caja depende demasiado de un solo proyecto o de "en proyectos" vs. personal está muy desbalanceado, señálalo como riesgo de concentración.
5. Si todo está sano, dilo también — no inventes un problema para parecer útil.
6. Máximo 4-5 frases cortas, en español, tono directo de asesor — no de consultoría genérica. Sin viñetas, un párrafo corrido.
7. Si hay más de una moneda, trátalas por separado — nunca sumes USD y COP.
8. Termina con una frase de qué vigilar o qué hacer en los próximos días, si aplica.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Falta el cuerpo de la solicitud" }, { status: 400 });
  }

  const contexto = JSON.stringify(
    {
      runway: body.runway ?? [],
      proyeccion: body.proyeccion ?? [],
      splitPersonalProyectos: body.splitPersonal ?? [],
      cajaPorCuenta: body.cajaPorCuenta ?? [],
      movimientosSinConciliar: body.movimientosSinConciliar ?? 0,
      movimientosEsperadosVencidos: body.movimientosEsperadosVencidos ?? [],
    },
    null,
    2
  );

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Situación financiera actual de Eduardo:\n\n${contexto}` }],
    });

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!texto) {
      return NextResponse.json({ error: "No se pudo generar la interpretación" }, { status: 502 });
    }

    return NextResponse.json({ result: texto });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

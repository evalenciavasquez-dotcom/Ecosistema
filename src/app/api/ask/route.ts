import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const askResponseSchema = z.object({
  respuesta: z.string().describe("La respuesta directa a la pregunta, en español, tono ejecutivo — 2-6 frases, sin relleno"),
  evidenceLevel: z
    .enum(["verificado", "documentado", "reportado", "interpretacion"])
    .describe("Qué tan sólida es la evidencia real detrás de la respuesta"),
  etiqueta: z.string().describe("Proyecto, moneda o tema al que se refiere la respuesta — corto, para mostrar como badge"),
});

const SYSTEM = `Eres el motor de análisis de C.C.O. E.V., el sistema privado de control estratégico de Eduardo. Respondes preguntas libres sobre su operación completa: proyectos, economía, decisiones y pendientes — usando exclusivamente los datos reales que se te entregan.

Esto NO es solo llevar un registro de movimientos de dinero. Tu trabajo es conectar todo:
- Los proyectos tienen situación económica, riesgos y oportunidades — de ahí sale si un proyecto puede generar más ingresos, qué tan sólido es, y qué lo amenaza.
- La economía personal (caja, runway, proyección) se ve afectada por lo que pasa en los proyectos — y por las decisiones abiertas: si una decisión implica un gasto o compromiso, su impactoEconomico debe conectarse con la caja real.
- Los pendientes (decisiones sin resolver, personas esperando respuesta, movimientos "esperado" vencidos, movimientos sin conciliar) son parte de los riesgos actuales, no datos sueltos.

Cuando te pregunten por riesgos, saldo, pendientes, qué viene por pagar, o alertas: responde de forma directa y causal — no solo cites el número, explica qué significa y qué lo está causando, usando SOLO lo que está en el contexto.

Reglas obligatorias:
1. No inventes cifras, proyectos, personas ni decisiones que no estén en el contexto.
2. Nunca mezcles monedas distintas en una sola cifra — trata USD y COP por separado.
3. No trates movimientos "esperado" como si fueran dinero confirmado — dilo si la respuesta depende de algo que todavía no ha llegado.
4. Si la pregunta requiere algo que el sistema todavía no analiza (ej. potencial de monetización futura de un proyecto, proyecciones de ingresos que no están registradas), dilo explícitamente en vez de inventarlo — no finjas tener un análisis que no existe.
5. Si la respuesta depende de una decisión abierta, menciona su impacto económico y su recomendación si son relevantes a la pregunta.
6. evidenceLevel debe reflejar honestamente la calidad de la evidencia real: "verificado" o "documentado" solo si los datos son sólidos, "reportado" si vienen de texto libre sin verificar, "interpretacion" si es tu lectura de la situación más que un hecho.
7. Sé directo — si hay un riesgo real, dilo sin suavizarlo. Si todo está bien, dilo también.
8. Español, tono ejecutivo, sin relleno de consultoría genérica.`;

interface AskContext {
  pregunta: string;
  proyectos: Record<string, unknown>[];
  decisionesAbiertas: Record<string, unknown>[];
  runway: Record<string, unknown>[];
  proyeccion: Record<string, unknown>[];
  cajaPorCuenta: Record<string, unknown>[];
  splitPersonalProyectos: Record<string, unknown>[];
  movimientosSinConciliar: number;
  movimientosEsperadosVencidos: Record<string, unknown>[];
  personasEsperando: Record<string, unknown>[];
  accionesAbiertas: Record<string, unknown>[];
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Partial<AskContext> | null;
  if (!body?.pregunta) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  }

  const contexto = JSON.stringify(
    {
      proyectos: body.proyectos ?? [],
      decisionesAbiertas: body.decisionesAbiertas ?? [],
      runway: body.runway ?? [],
      proyeccion: body.proyeccion ?? [],
      cajaPorCuenta: body.cajaPorCuenta ?? [],
      splitPersonalProyectos: body.splitPersonalProyectos ?? [],
      movimientosSinConciliar: body.movimientosSinConciliar ?? 0,
      movimientosEsperadosVencidos: body.movimientosEsperadosVencidos ?? [],
      personasEsperando: body.personasEsperando ?? [],
      accionesAbiertas: body.accionesAbiertas ?? [],
    },
    null,
    2
  );

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 800,
      output_config: { format: zodOutputFormat(askResponseSchema) },
      system: SYSTEM,
      messages: [
        { role: "user", content: `Contexto real de la operación de Eduardo:\n\n${contexto}\n\nPregunta: ${body.pregunta}` },
      ],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar una respuesta" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

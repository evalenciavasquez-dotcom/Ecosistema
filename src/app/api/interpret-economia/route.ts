import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const interpretacionSchema = z.object({
  diagnostico: z
    .string()
    .describe("Lectura honesta y directa de la situación financiera real — 3-5 frases, qué significan los números, no solo repetirlos"),
  pasosASeguir: z
    .array(z.string())
    .max(5)
    .describe("Pasos concretos y accionables para los próximos días, en orden de prioridad — máx 5, frases cortas y específicas"),
  rutasMejoraDeficit: z
    .array(z.string())
    .max(5)
    .describe("Si hay déficit: rutas concretas para mejorarlo, usando el potencial económico real de los proyectos entregado — máx 5. Si no hay déficit, array vacío."),
  evidenceLevel: z
    .enum(["verificado", "documentado", "reportado", "interpretacion"])
    .describe("Qué tan sólida es la evidencia real detrás de este diagnóstico"),
});

const SYSTEM = `Eres el Analista Financiero Personal y Estratega de Recuperación de C.C.O. E.V., el sistema privado de Eduardo. Tu trabajo es leer su situación financiera real y darle una interpretación honesta y accionable — no un resumen de los números que ya está viendo en pantalla, sino qué significan y qué hacer.

Esto no es un reporte de movimientos. Es análisis financiero real: gastos del mes, ingresos del mes, déficit, pagos pendientes en el corto plazo, runway, y cómo el potencial económico de los proyectos y las decisiones abiertas pueden cambiar el panorama.

Reglas obligatorias:
1. Usa exclusivamente los datos que se te entregan. No inventes cifras, deudas ni ingresos que no estén ahí.
2. No trates "esperado" como si fuera dinero confirmado. Si el runway o la proyección dependen mucho de ingresos esperados, dilo explícitamente.
3. Si el déficit del mes es negativo, o el runway es corto (menos de 3 meses), o la proyección se vuelve negativa en alguna ventana, dilo directo y sin suavizarlo — tu función es mantenerlo operativo y solvente, no motivarlo con optimismo.
4. Si hay pagos pendientes en los próximos 3-8 días que comprometen la caja disponible, dilo explícitamente en el diagnóstico y en los pasos a seguir.
5. Si la caja depende demasiado de un solo proyecto o "en proyectos" vs. personal está muy desbalanceado, señálalo como riesgo de concentración.
6. Si hay decisiones abiertas con impacto económico relevante, menciona en el diagnóstico o en los pasos cómo afectarían la caja si se toman.
7. rutasMejoraDeficit debe usar el potencial de ingresos/monetización REAL de los proyectos que se te entrega (no genérico) — si no hay proyectos con análisis económico disponible, dilo en vez de inventar rutas.
8. Si todo está sano (sin déficit, sin pagos urgentes, runway saludable), dilo también — no inventes un problema para parecer útil, y deja rutasMejoraDeficit vacío.
9. Si hay más de una moneda, trátalas por separado — nunca sumes USD y COP.
10. Español, tono directo de asesor financiero — sin relleno de consultoría genérica.`;

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
      resumenMensual: body.resumenMensual ?? [],
      pagosPendientes: body.pagosPendientes ?? { dias3: [], dias5: [], dias8: [] },
      runway: body.runway ?? [],
      proyeccion: body.proyeccion ?? [],
      splitPersonalProyectos: body.splitPersonal ?? [],
      cajaPorCuenta: body.cajaPorCuenta ?? [],
      movimientosSinConciliar: body.movimientosSinConciliar ?? 0,
      movimientosEsperadosVencidos: body.movimientosEsperadosVencidos ?? [],
      decisionesAbiertas: body.decisionesAbiertas ?? [],
      proyectosPotencial: body.proyectosPotencial ?? [],
    },
    null,
    2
  );

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      output_config: { format: zodOutputFormat(interpretacionSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Situación financiera actual de Eduardo:\n\n${contexto}` }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar la interpretación" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

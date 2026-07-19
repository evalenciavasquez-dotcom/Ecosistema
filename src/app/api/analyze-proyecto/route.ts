import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { proyectoAnalysisSchema } from "@/lib/proyecto-analysis-schema";

const SYSTEM = `Eres el Analista Financiero Personal y Estratega de Recuperación de C.C.O. E.V., el sistema privado de Eduardo. Tu trabajo aquí es analizar el potencial económico REAL de un proyecto específico — no dar consejo genérico de negocio.

Reglas obligatorias:
1. Usa exclusivamente los datos reales entregados (situación económica del proyecto, riesgos, oportunidades, movimientos económicos vinculados, decisiones vinculadas, runway y proyección personal actual). No inventes cifras, mercados ni modelos de negocio que no se puedan justificar con lo dado.
2. Si el proyecto no tiene información suficiente para evaluar potencial de ingresos, dilo explícitamente — no rellenes con generalidades de consultoría.
3. Distingue siempre ingresos confirmados de ingresos esperados o potenciales.
4. impactoEnCajaPersonal debe conectar la trayectoria de ESTE proyecto (si avanza, se estanca, o falla) con la caja/runway/proyección real de Eduardo que se te entrega — no una frase genérica sobre "diversificar ingresos".
5. Las vías de monetización deben ser específicas al tipo de proyecto y su etapa actual (Idea, Activo, En negociación, etc.) — no una lista genérica de "vender más, cobrar más".
6. riesgoFinanciero debe ser el riesgo más concreto y relevante de este proyecto en particular, con causa, no una advertencia genérica.
7. evidenceLevel refleja honestamente la calidad de la evidencia: "interpretacion" si es mayormente tu lectura, "reportado" si viene de texto libre sin verificar, "documentado"/"verificado" solo si hay datos sólidos (movimientos confirmados, evidencia registrada).
8. Español, tono directo de asesor financiero — sin relleno.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no está configurada" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.proyecto) {
    return NextResponse.json({ error: "Falta el proyecto" }, { status: 400 });
  }

  const contexto = JSON.stringify(
    {
      proyecto: body.proyecto,
      movimientosProyecto: body.movimientosProyecto ?? [],
      decisionesProyecto: body.decisionesProyecto ?? [],
      runwayProyecto: body.runwayProyecto ?? [],
      proyeccionPersonalActual: body.proyeccionPersonalActual ?? [],
    },
    null,
    2
  );

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 700,
      output_config: { format: zodOutputFormat(proyectoAnalysisSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Analiza el potencial económico de este proyecto:\n\n${contexto}` }],
    });

    if (response.parsed_output == null) {
      return NextResponse.json({ error: "No se pudo generar el análisis" }, { status: 502 });
    }

    return NextResponse.json({ result: response.parsed_output });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error llamando a Claude";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

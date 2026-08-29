import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { strategicCaseGeneratedSchema } from "@/lib/strategic-case-schema";
import { diagnosticarSalida, mensajeSinSalidaEstructurada } from "@/lib/ai/motivo-sin-salida";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/analysis-prompt";
import {
  AJENO,
  CONTRADICTOR,
  correrRondaDos,
  correrRondaUno,
  elegirEspecialistas,
  investigarCaso,
  type InvestigacionCaso,
} from "@/lib/debate/engine";

// El análisis estratégico completo (router → investigación → dos rondas de
// debate → síntesis en Opus 5) tarda bastante más que el límite por defecto
// de una función serverless.
export const maxDuration = 300;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada en el servidor. Agrégala en las variables de entorno." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.decision?.pregunta) {
    return NextResponse.json({ error: "Falta la pregunta de la decisión." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // Router (3-5 especialistas relevantes) + Contradictor y Ajeno, que
    // entran siempre. Con eso corre el debate real en dos rondas antes de
    // que el modelo de síntesis vea el caso.
    const resumenCaso = buildUserPrompt(body);
    const router = await elegirEspecialistas(client, resumenCaso);
    const especialistas = [...router.especialistas, CONTRADICTOR, AJENO];

    // El caso solo sale a buscar afuera cuando depende de hechos del mundo
    // real que no trae: tarifas de mercado, condiciones de una industria, qué
    // cobra la competencia. Para una decisión interna de Eduardo, buscar no
    // aporta nada y solo agrega demora.
    let investigacion: InvestigacionCaso | null = null;
    if (router.necesitaDatosExternos && router.consultaExterna.trim()) {
      investigacion = await investigarCaso(client, router.consultaExterna, resumenCaso);
    }

    const rondaUno = await correrRondaUno(client, especialistas, resumenCaso, investigacion);
    const rondaDos = await correrRondaDos(client, especialistas, rondaUno);

    const contextoConDebate = {
      ...body,
      datosExternos: investigacion
        ? { consulta: router.consultaExterna, hallazgos: investigacion.hallazgos, fuentes: investigacion.fuentes }
        : null,
      debate: {
        rondaUno: rondaUno.map((r) => ({ nombre: r.nombre, texto: r.texto })),
        rondaDos: rondaDos.map((r) => ({
          nombre: r.nombre,
          respuestaMasFuerte: r.respuestaMasFuerte,
          razonMasFuerte: r.razonMasFuerte,
          puntoCiegoMasGrande: r.puntoCiegoMasGrande,
          cualEsElPuntoCiego: r.cualEsElPuntoCiego,
          queSeEscapoATodas: r.queSeEscapoATodas,
        })),
      },
    };

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      // La síntesis es donde se resuelve la tensión real del panel y sale la
      // recomendación que Eduardo va a ejecutar, así que va con esfuerzo alto.
      // Se usa xhigh y no max a propósito: antes de esta llamada ya corrieron
      // el router, la investigación y las dos rondas de debate, y todo eso
      // vive dentro del mismo límite de tiempo de la función. Con max el
      // análisis completo se arriesga a cortarse por timeout, y quedarse sin
      // respuesta es peor que una respuesta un punto menos profunda.
      output_config: {
        effort: "xhigh",
        format: zodOutputFormat(strategicCaseGeneratedSchema),
      },
      // El razonamiento se devuelve resumido para que Eduardo pueda ver cómo
      // se llegó a la recomendación, no solo cuál fue.
      thinking: { type: "adaptive", display: "summarized" },
      // El prompt del sistema no cambia entre análisis: se cachea para que
      // reanalizar una decisión sea más rápido y más barato.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserPrompt(contextoConDebate) }],
    });

    const diagnostico = diagnosticarSalida(response.stop_reason, "el análisis");
    if (diagnostico) {
      return NextResponse.json({ error: diagnostico.mensaje }, { status: 502 });
    }

    if (response.parsed_output == null) {
      return NextResponse.json(
        { error: mensajeSinSalidaEstructurada(response.stop_reason, "el análisis") },
        { status: 502 }
      );
    }

    const razonamiento = response.content
      .filter((b): b is Anthropic.ThinkingBlock => b.type === "thinking")
      .map((b) => b.thinking.trim())
      .filter(Boolean)
      .join("\n\n");

    return NextResponse.json({
      result: response.parsed_output,
      razonamiento: razonamiento || null,
      fuentesExternas: investigacion?.fuentes ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido llamando a Claude.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

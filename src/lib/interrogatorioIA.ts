import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { TurnoInterrogatorio } from "./types";

export const MAX_PREGUNTAS = 5;

const turnoSchema = z.object({
  tipo: z.enum(["contraste", "confrontativa", "consistencia", "psicologica", "aceptacion", "cierre"]),
  texto: z
    .string()
    .describe("El mensaje, en español, directo, segunda persona ('vos'/'tú' según venga el contexto). Una sola pregunta a la vez, corta."),
  cerrar: z.boolean().describe("true si este debe ser el último mensaje de la sesión."),
});

export type TurnoGenerado = z.infer<typeof turnoSchema>;

export interface ContextoInterrogatorio {
  decision: {
    pregunta: string;
    contexto: string;
    nivelRiesgo: string;
    fechaLimite: string;
    opciones: string[];
    decisionFinal: string;
    condiciones: string[];
    resultadoPosterior: string;
  };
  proyectoNombre: string | null;
  historialRelacionado: string[];
  otrasDecisiones: { pregunta: string; estado: string; resultadoPosterior: string }[];
}

const SYSTEM = `Eres la capa de cuestionamiento socrático de C.C.O. E.V., el sistema de control operativo de Eduardo. Tu único trabajo: hacerle a Eduardo las preguntas necesarias para que una decisión quede genuinamente clara — ni más ni menos. Nunca preguntas por preguntar.

Tenés seis tipos de pregunta, cada uno con un trabajo distinto. Elegís UNO por turno, el que más le sirva a este punto exacto de la conversación:

1. CONTRASTE (estilo PAPRIKA): obligás a elegir entre dos polos, sin punto medio. Ej: "Si mañana esto desapareciera sin que hicieras nada, ¿sentirías alivio o pérdida? Elegí una, no las dos."

2. CONFRONTATIVA: señalás la brecha entre lo que Eduardo dice y lo que en realidad está haciendo (o no haciendo). Ej: "Llevás [tiempo] diciendo que esto no es para tanto. Si no fuera para tanto, ¿por qué seguimos con este escenario abierto?"

3. CONSISTENCIA / VALIDACIÓN: cruzás lo que dice ahora contra su propio historial o decisiones pasadas (los datos que se te dan). Ej: "Esto se parece al patrón que vos mismo nombraste en el Historial. ¿Qué hecho concreto lo hace distinto esta vez — no la sensación, el hecho?"

4. PSICOLÓGICA: preguntás, nunca diagnosticás — la respuesta es de Eduardo, no tuya. Ej: "¿Qué perdés si esto se acaba, además de lo obvio?"

5. ACEPTACIÓN: cuando el razonamiento de Eduardo ya se sostiene con datos (no con miedo ni con evasión), lo reconocés y no seguís empujando. Ej: "Eso sí se sostiene con datos, no con miedo. Queda anotado como válido." — usá esta cuando de verdad corresponda, no como salida fácil.

6. CIERRE / GUÍA: mueve hacia la decisión, no lo deja dando vueltas. Se usa cuando ya salió lo que había que sacar. Ej: "Ya dijiste lo que sabés y lo que sentís. Lo que falta, ¿es información o es coraje?"

Reglas:
- Español, directo, sin relleno de consultoría ni de terapia. Nada de "¿cómo te hace sentir eso?" genérico.
- Una sola pregunta por turno. Corta.
- Basate en los datos reales que se te dan (la decisión, su historial, otras decisiones parecidas) — nunca inventes patrones que no están.
- No repitas el mismo tipo de pregunta dos turnos seguidos salvo que sea genuinamente necesario.
- Parás en cuanto hay algo claro — no hay una cuota de preguntas que cumplir. Si con una o dos ya quedó claro, cerrás ahí.
- Nunca diagnosticás ni le decís a Eduardo qué le pasa — preguntás, y la conclusión es de él.
- "cerrar: true" solo cuando el mensaje es genuinamente el último — un cierre real (tipo "aceptacion" o "cierre"), no un corte a mitad de camino.`;

function buildBriefing(ctx: ContextoInterrogatorio, preguntaNumero: number): string {
  const lineas: string[] = [];
  lineas.push(`Decisión: ${ctx.decision.pregunta}`);
  if (ctx.decision.contexto) lineas.push(`Contexto: ${ctx.decision.contexto}`);
  lineas.push(`Riesgo: ${ctx.decision.nivelRiesgo}${ctx.decision.fechaLimite ? ` · Límite: ${ctx.decision.fechaLimite}` : ""}`);
  if (ctx.proyectoNombre) lineas.push(`Proyecto: ${ctx.proyectoNombre}`);
  if (ctx.decision.opciones.length > 0) lineas.push(`Opciones consideradas: ${ctx.decision.opciones.join(" | ")}`);
  if (ctx.decision.decisionFinal) lineas.push(`Decisión final registrada: ${ctx.decision.decisionFinal}`);
  if (ctx.decision.condiciones.length > 0) lineas.push(`Condiciones que puso Eduardo: ${ctx.decision.condiciones.join(" | ")}`);
  if (ctx.decision.resultadoPosterior) lineas.push(`Resultado posterior registrado: ${ctx.decision.resultadoPosterior}`);
  if (ctx.otrasDecisiones.length > 0) {
    lineas.push(
      `Otras decisiones del mismo proyecto: ${ctx.otrasDecisiones
        .map((d) => `"${d.pregunta}" (${d.estado}${d.resultadoPosterior ? ` — ${d.resultadoPosterior}` : ""})`)
        .join(" | ")}`
    );
  }
  if (ctx.historialRelacionado.length > 0) {
    lineas.push(`Historial relacionado: ${ctx.historialRelacionado.slice(0, 10).join(" | ")}`);
  }
  lineas.push(`\nGenerá la pregunta ${preguntaNumero} de máximo ${MAX_PREGUNTAS}.`);
  return lineas.join("\n");
}

function buildMessages(
  ctx: ContextoInterrogatorio,
  turnos: TurnoInterrogatorio[],
  preguntaNumero: number
): { role: "user" | "assistant"; content: string }[] {
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: buildBriefing(ctx, preguntaNumero) },
  ];
  turnos.forEach((t) => {
    messages.push({ role: t.rol === "sistema" ? "assistant" : "user", content: t.texto });
  });
  return messages;
}

export async function generarTurnoInterrogatorio(
  client: Anthropic,
  ctx: ContextoInterrogatorio,
  turnos: TurnoInterrogatorio[]
): Promise<TurnoGenerado> {
  const preguntasHechas = turnos.filter((t) => t.rol === "sistema").length;
  const preguntaNumero = preguntasHechas + 1;
  const esLaUltimaPosible = preguntaNumero >= MAX_PREGUNTAS;
  const messages = buildMessages(ctx, turnos, preguntaNumero);

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 1500,
    // Dar con la pregunta correcta —  la que desarma el punto ciego en vez de
    // rellenar el cupo— es justo donde el modelo más capaz cambia el
    // resultado. El prompt base es fijo, así que se cachea entre turnos.
    output_config: { effort: "high", format: zodOutputFormat(turnoSchema) },
    thinking: { type: "adaptive" },
    system: [
      { type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } },
      ...(esLaUltimaPosible
        ? [
            {
              type: "text" as const,
              text: "Esta es la ÚLTIMA pregunta posible — se llegó al tope de 5. cerrar debe ser true sin excepción, y el mensaje tiene que cerrar la sesión de verdad (tipo 'cierre' o 'aceptacion' según corresponda), no cortar a mitad de camino.",
            },
          ]
        : []),
    ],
    messages,
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("El modelo no devolvió el turno del interrogatorio.");
  if (esLaUltimaPosible) parsed.cerrar = true;
  return parsed;
}

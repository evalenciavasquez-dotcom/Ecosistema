import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const criterioSchema = z
  .union([
    z.object({ tipo: z.literal("runway_minimo"), moneda: z.string(), mesesMinimos: z.number() }),
    z.object({ tipo: z.literal("cero_pagos_vencidos") }),
    z.object({ tipo: z.literal("cero_acciones_vencidas") }),
  ])
  .nullable()
  .describe(
    "Si el reto es genuinamente verificable contra los datos que se te dan (runway, pagos o acciones vencidas), propone el criterio exacto. Si no es medible así (ej. 'cerrar un cliente', 'lanzar algo'), usa null — Eduardo lo marcará a mano."
  );

const retoSchema = z.object({
  titulo: z.string().describe("Corto, directo, en español, tipo reto (ej. 'Baja tus acciones vencidas a cero')"),
  descripcion: z.string().describe("1-2 frases: por qué este reto importa ahora mismo, basado en el punto débil real detectado."),
  proyectoNombre: z
    .string()
    .nullable()
    .describe("Nombre exacto de uno de los proyectos activos dados, si el reto es específico de ese proyecto. null si es general."),
  criterioAuto: criterioSchema,
});

export type RetoGenerado = z.infer<typeof retoSchema>;

const SYSTEM = `Eres el "coach" de retos de C.C.O. E.V., el sistema de control operativo y estratégico de Eduardo.

Tu trabajo: proponer UN reto nuevo, corto y accionable (algo que se pueda lograr en 1-3 semanas), basado en un punto débil REAL detectado en los datos que se te dan — nunca inventado ni genérico.

Reglas:
- Directo y ejecutivo, sin relleno de consultoría. Nada de "considera evaluar la posibilidad de...".
- Basado en UNA señal concreta de las que se te dan (no mezcles varias en un solo reto).
- No repitas temas de los retos ya activos/recientes que se te listan — varía el ángulo (a veces financiero, a veces de un proyecto, a veces de seguimiento a personas o decisiones).
- Si el reto se puede verificar automáticamente contra los datos (runway de una moneda específica, pagos vencidos, acciones vencidas), propone el criterioAuto exacto con los valores reales. Si no, usa null sin forzarlo.
- Si el reto es específico de un proyecto, usa el nombre EXACTO de la lista de proyectos activos dada. Si no aplica a ninguno, usa null.`;

interface DatosParaReto {
  proyectosActivos: string[];
  proyectosEnRiesgo: string[];
  runwayPorMoneda: { moneda: string; mesesRunway: number | null }[];
  pagosVencidos: number;
  accionesVencidas: number;
  decisionesSinCerrar: number;
  personasEsperando: number;
  retosExistentes: string[];
}

function buildPrompt(datos: DatosParaReto): string {
  const lineas: string[] = [];
  lineas.push(`Proyectos activos: ${datos.proyectosActivos.length > 0 ? datos.proyectosActivos.join(", ") : "ninguno"}`);
  if (datos.proyectosEnRiesgo.length > 0) lineas.push(`Proyectos en riesgo o en cierre: ${datos.proyectosEnRiesgo.join(", ")}`);
  datos.runwayPorMoneda.forEach((r) => {
    lineas.push(
      `Runway en ${r.moneda}: ${r.mesesRunway === null ? "sin datos suficientes" : r.mesesRunway < 0 ? "en déficit" : `${r.mesesRunway.toFixed(1)} meses`}`
    );
  });
  lineas.push(`Pagos esperados vencidos: ${datos.pagosVencidos}`);
  lineas.push(`Acciones vencidas: ${datos.accionesVencidas}`);
  lineas.push(`Decisiones sin cerrar el ciclo: ${datos.decisionesSinCerrar}`);
  lineas.push(`Personas esperando respuesta hace mucho: ${datos.personasEsperando}`);
  if (datos.retosExistentes.length > 0) lineas.push(`Retos ya activos o recientes (no repetir el tema): ${datos.retosExistentes.join(" | ")}`);
  return lineas.join("\n");
}

export async function generarRetoIA(client: Anthropic, datos: DatosParaReto): Promise<RetoGenerado> {
  const response = await client.messages.parse({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    output_config: { format: zodOutputFormat(retoSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(datos) }],
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("El modelo no devolvió un reto.");
  return parsed;
}

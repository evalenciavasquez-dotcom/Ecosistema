import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ClasificacionSugerida } from "./types";

const classificationSchema = z.object({
  destino: z.enum(["accion", "decision", "economia", "evidencia", "evento", "registro"]),
  proyectoId: z
    .string()
    .nullable()
    .describe("El id exacto de un proyecto de la lista dada, o null si no aplica a ninguno"),
  confianza: z.number().min(0).max(1),
  razon: z.string().describe("Una frase corta en español explicando por qué se clasificó así"),
  monto: z.number().nullable().describe("Si destino es 'economia': el monto detectado en el texto, o null si no hay un número claro"),
  moneda: z.string().nullable().describe("Si destino es 'economia': 'USD' o 'COP' según lo detectado, o null si no está claro"),
  cuenta: z.string().nullable().describe("Si destino es 'economia': la cuenta o medio mencionado (ej. 'Cuenta bancaria', 'Efectivo'), o null"),
  tipoMovimiento: z.enum(["ingreso", "gasto"]).nullable().describe("Si destino es 'economia': si el dinero entró (ingreso) o salió (gasto), o null si no está claro"),
  fechaEvento: z.string().nullable().describe("Si destino es 'evento': fecha en formato YYYY-MM-DD si se puede inferir, o null"),
  horaEvento: z.string().nullable().describe("Si destino es 'evento': hora en formato HH:MM si se menciona, o null"),
});

const SYSTEM = `Eres el clasificador de la bandeja de entrada de C.C.O. E.V., el sistema privado de control estratégico de Eduardo. Recibes una novedad en texto libre (algo que pasó: un mensaje, un pago, una idea, un compromiso) y decides:

- destino: qué es realmente.
  - "accion": una tarea concreta que alguien debe hacer.
  - "decision": una pregunta abierta que Eduardo debe decidir.
  - "economia": un movimiento de dinero (pago, ingreso, gasto, deuda).
  - "evidencia": un documento, contrato, comprobante o afirmación que respalda un hecho.
  - "evento": una reunión o compromiso con fecha/hora.
  - "registro": una nota informativa que no requiere acción.
- proyectoId: si la novedad menciona (aunque sea informalmente) uno de los proyectos o a una persona asociada a un proyecto de la lista, usa el id EXACTO de ese proyecto. Si no hay relación clara, null.
- confianza: 0 a 1. Usa menos de 0.6 cuando el texto sea ambiguo.
- razon: una frase corta, en español, que Eduardo pueda leer de un vistazo.
- Si destino es "economia": extrae monto (el número real mencionado, sin símbolos), moneda ("USD" o "COP" según lo que diga el texto — si no es claro, null), cuenta (dónde entró o salió la plata, ej. "Cuenta bancaria", "Efectivo" — si no se menciona, null), y tipoMovimiento ("ingreso" si el dinero entró, "gasto" si salió — si no está claro, null). Nunca inventes un monto que no esté en el texto.
- Si destino es "evento": extrae fechaEvento (YYYY-MM-DD, resuelve "hoy"/"mañana" usando la fecha de hoy dada abajo) y horaEvento (HH:MM) si se mencionan. Si no hay fecha u hora clara, null.
- Para cualquier otro destino, deja monto, moneda, cuenta, fechaEvento y horaEvento en null.

No inventes proyectos que no estén en la lista. Responde solo con la clasificación.`;

export interface ProyectoRef {
  id: string;
  nombre: string;
}

export interface PersonaRef {
  nombre: string;
  proyectoIds: string[];
}

// Compartido entre /api/classify (llamado desde el navegador) y el barrido
// de Gmail (llamado desde el cron, sin sesión de navegador) para no
// duplicar el prompt de clasificación en dos lugares.
export async function clasificarTexto(
  texto: string,
  proyectos: ProyectoRef[],
  personas: PersonaRef[]
): Promise<ClasificacionSugerida | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const contexto = [
    `Fecha de hoy: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Proyectos actuales de Eduardo:",
    ...proyectos.map((p) => `- id: ${p.id} · nombre: ${p.nombre}`),
    "",
    "Personas conocidas y a qué proyectos están asociadas:",
    ...personas.map((p) => `- ${p.nombre} → proyectos: ${p.proyectoIds.join(", ") || "ninguno"}`),
    "",
    "Novedad a clasificar:",
    texto,
  ].join("\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.parse({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    output_config: { format: zodOutputFormat(classificationSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: contexto }],
  });

  if (response.parsed_output == null) return null;

  const parsed = response.parsed_output;
  const proyectoValido = proyectos.some((p) => p.id === parsed.proyectoId);
  return { ...parsed, proyectoId: proyectoValido ? parsed.proyectoId : null };
}

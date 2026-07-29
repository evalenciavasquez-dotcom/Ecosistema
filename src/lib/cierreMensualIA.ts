import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CierreMensual } from "./types";

const lecturaSchema = z.object({
  lecturaEstrategica: z
    .string()
    .describe(
      "Párrafo corto (3-6 frases) en español, directo y ejecutivo, con el veredicto del mes o del proyecto: qué destaca, qué revisar, qué priorizar. Sin relleno genérico de consultoría."
    ),
  semaforo: z
    .enum(["verde", "amarillo", "rojo"])
    .describe(
      "verde: mes sano, sin alertas. amarillo: hay algo que revisar pero no es urgente. rojo: hay un riesgo real que requiere atención pronto."
    ),
});

type DatosCierre = Omit<CierreMensual, "id" | "lecturaEstrategica" | "semaforo" | "creadoEn">;

function buildPrompt(datos: DatosCierre): string {
  const esProyecto = datos.proyectoId !== null;
  const lineas: string[] = [];
  lineas.push(
    `Cierre de ${esProyecto ? `el proyecto "${datos.proyectoNombre}"` : "TODO el sistema (vista general, incluye lo personal)"} — mes ${datos.mes}.`
  );

  lineas.push("", "RESUMEN POR MONEDA:");
  datos.resumenPorMoneda.forEach((r) => {
    lineas.push(
      `- ${r.moneda}: ingresos ${r.ingresosMes} (mes anterior ${r.ingresosMesAnterior}), gastos ${r.gastosMes} (mes anterior ${r.gastosMesAnterior}), déficit del mes ${r.deficitMes}, caja actual ${r.cajaActual}, runway ${
        r.mesesRunway !== null ? `${r.mesesRunway.toFixed(1)} meses` : "sin datos suficientes"
      }`
    );
  });

  if (datos.categoriasGasto.length > 0) {
    lineas.push("", "GASTOS POR FUENTE REGISTRADA (mayores primero):");
    datos.categoriasGasto.forEach((c) => lineas.push(`- ${c.categoria}: ${c.monto} ${c.moneda}`));
  }

  if (datos.horasInvertidas !== null) {
    lineas.push("", `HORAS INVERTIDAS EN EL PROYECTO ESTE MES: ${datos.horasInvertidas}`);
  }

  if (datos.pagosVencidos.length > 0) {
    lineas.push("", "PAGOS ESPERADOS Y VENCIDOS (siguen sin pagarse):");
    datos.pagosVencidos.forEach((p) =>
      lineas.push(`- ${p.descripcion}: ${p.monto} ${p.moneda}, vencido hace ${p.diasVencido} día(s) (fecha ${p.fecha})`)
    );
  }

  if (datos.metasFinancieras.length > 0) {
    lineas.push("", "METAS FINANCIERAS PERSONALES:");
    datos.metasFinancieras.forEach((m) =>
      lineas.push(`- ${m.descripcion} (${m.moneda}): ${Math.round(m.progreso * 100)}% de avance${m.cumplida ? " — CUMPLIDA" : ""}`)
    );
  }

  if (datos.proyectosEnRiesgo.length > 0) {
    lineas.push("", `PROYECTOS EN RIESGO O EN CIERRE: ${datos.proyectosEnRiesgo.join(", ")}`);
  }

  if (datos.decisionesSinCerrar.length > 0) {
    lineas.push("", `DECISIONES YA TOMADAS SIN RESULTADO REGISTRADO: ${datos.decisionesSinCerrar.join(" · ")}`);
  }

  return lineas.join("\n");
}

const SYSTEM = `Eres el analista financiero de C.C.O. E.V. Escribes el cierre mensual — la lectura que Eduardo revisa una vez al mes para saber cómo le fue de verdad, no solo ver números sueltos.

Reglas:
- Directo y ejecutivo, 3-6 frases, nunca relleno de consultoría genérica.
- Compara siempre contra el mes anterior si los datos lo permiten (mejoró, empeoró, igual).
- Si hay pagos vencidos por muchos días, dilo explícitamente y con la cifra.
- Si es el cierre de un proyecto y las horas invertidas son altas pero el ingreso del mes es bajo o cero, dilo sin rodeos — es exactamente la señal que Eduardo quiere ver, para saber si ese ingreso hay que ajustarlo.
- Si no hay suficiente información para opinar de algo, dilo — nunca inventes.
- El semáforo refleja el estado real, no optimismo forzado.`;

export async function generarLecturaEstrategica(
  client: Anthropic,
  datos: DatosCierre
): Promise<{ lecturaEstrategica: string; semaforo: "verde" | "amarillo" | "rojo" }> {
  const response = await client.messages.parse({
    // Modelo ligero para los cierres por proyecto (pueden ser varios en una
    // misma pasada); el general usa el modelo mayor porque integra todo el
    // sistema.
    model: datos.proyectoId ? "claude-haiku-4-5-20251001" : "claude-sonnet-5",
    max_tokens: 700,
    output_config: { format: zodOutputFormat(lecturaSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(datos) }],
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("El modelo no devolvió la lectura estratégica del cierre.");
  return parsed;
}

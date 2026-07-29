import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db/client";
import { ensureCierresMensualesTable } from "./db/migrations";
import { decisiones, historial, metasFinancieras, movimientos, proyectos, tiempo } from "./db/schema";
import {
  computeCategoriasGasto,
  computeDecisionesSinCerrar,
  computeMetasSnapshot,
  computePagosVencidos,
  computeProyectosEnRiesgo,
  computeResumenPorMoneda,
  horasInvertidasEnMes,
} from "./cierreMensual";
import { generarLecturaEstrategica } from "./cierreMensualIA";
import { genId } from "./id";
import type { CierreMensual, Decision, MetaFinanciera, MovimientoEconomico, Proyecto, RegistroTiempo } from "./types";

export interface ResultadoCierreMensual {
  generado: boolean;
  mes: string;
  proyectosGenerados: number;
  error?: string;
}

// Inserta un cierre — usa ON CONFLICT sobre (mes, proyecto) para no duplicar
// si el cron corre dos veces el mismo día o se reintenta.
async function insertarCierre(cierre: CierreMensual): Promise<void> {
  const db = getDb();
  await db.execute(
    sql`INSERT INTO cierres_mensuales (
      id, mes, proyecto_id, proyecto_nombre, resumen_por_moneda, categorias_gasto,
      horas_invertidas, metas_financieras, pagos_vencidos, proyectos_en_riesgo,
      decisiones_sin_cerrar, lectura_estrategica, semaforo, creado_en
    ) VALUES (
      ${cierre.id}, ${cierre.mes}, ${cierre.proyectoId}, ${cierre.proyectoNombre},
      ${JSON.stringify(cierre.resumenPorMoneda)}::jsonb, ${JSON.stringify(cierre.categoriasGasto)}::jsonb,
      ${cierre.horasInvertidas}, ${JSON.stringify(cierre.metasFinancieras)}::jsonb,
      ${JSON.stringify(cierre.pagosVencidos)}::jsonb, ${JSON.stringify(cierre.proyectosEnRiesgo)}::jsonb,
      ${JSON.stringify(cierre.decisionesSinCerrar)}::jsonb, ${cierre.lecturaEstrategica}, ${cierre.semaforo},
      ${cierre.creadoEn}
    )
    ON CONFLICT (mes, (COALESCE(proyecto_id, ''))) DO NOTHING`
  );
}

// Genera (si no existe ya) el cierre económico mensual del mes indicado:
// uno general y uno por cada proyecto activo. Se llama desde el cron diario
// (el día 1 de cada mes, cerrando el mes recién terminado) y desde el botón
// manual de Configuración/Economía.
export async function generarCierreMensual(mes: string): Promise<ResultadoCierreMensual> {
  if (!isDbConfigured()) return { generado: false, mes, proyectosGenerados: 0, error: "Base de datos no configurada" };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { generado: false, mes, proyectosGenerados: 0, error: "ANTHROPIC_API_KEY no configurada" };

  await ensureCierresMensualesTable();
  const db = getDb();
  const client = new Anthropic({ apiKey });
  const hoy = new Date().toISOString();

  const [movimientosRows, metasRows, proyectosRows, decisionesRows, tiempoRows] = (await Promise.all([
    db.select().from(movimientos),
    db.select().from(metasFinancieras),
    db.select().from(proyectos),
    db.select().from(decisiones),
    db.select().from(tiempo).catch(() => []),
  ])) as [MovimientoEconomico[], MetaFinanciera[], Proyecto[], Decision[], RegistroTiempo[]];

  let proyectosGenerados = 0;

  try {
    const datosGeneral = {
      mes,
      proyectoId: null,
      proyectoNombre: null,
      resumenPorMoneda: computeResumenPorMoneda(movimientosRows, mes),
      categoriasGasto: computeCategoriasGasto(movimientosRows, mes),
      horasInvertidas: null,
      metasFinancieras: computeMetasSnapshot(metasRows, movimientosRows, mes),
      pagosVencidos: computePagosVencidos(movimientosRows, mes),
      proyectosEnRiesgo: computeProyectosEnRiesgo(proyectosRows),
      decisionesSinCerrar: computeDecisionesSinCerrar(decisionesRows),
    };
    const lecturaGeneral = await generarLecturaEstrategica(client, datosGeneral);
    await insertarCierre({ id: genId("cierre"), ...datosGeneral, ...lecturaGeneral, creadoEn: hoy });
  } catch (err) {
    console.error("Error generando el cierre mensual general", err);
  }

  const proyectosActivos = proyectosRows.filter((p) => p.estado !== "Cerrado" && p.estado !== "Descartado");
  for (const proyecto of proyectosActivos) {
    try {
      const movProyecto = movimientosRows.filter((m) => m.proyectoId === proyecto.id);
      if (movProyecto.length === 0) continue; // sin movimientos, no hay nada que cerrar
      const datosProyecto = {
        mes,
        proyectoId: proyecto.id,
        proyectoNombre: proyecto.nombre,
        resumenPorMoneda: computeResumenPorMoneda(movProyecto, mes),
        categoriasGasto: computeCategoriasGasto(movProyecto, mes),
        horasInvertidas: horasInvertidasEnMes(tiempoRows, proyecto.id, mes),
        metasFinancieras: [],
        pagosVencidos: computePagosVencidos(movProyecto, mes),
        proyectosEnRiesgo: [],
        decisionesSinCerrar: [],
      };
      const lecturaProyecto = await generarLecturaEstrategica(client, datosProyecto);
      await insertarCierre({ id: genId("cierre"), ...datosProyecto, ...lecturaProyecto, creadoEn: hoy });
      proyectosGenerados++;
    } catch (err) {
      console.error(`Error generando el cierre mensual del proyecto ${proyecto.nombre}`, err);
    }
  }

  await db.insert(historial).values({
    id: genId("hist"),
    timestamp: hoy,
    entidadTipo: "cierreMensual",
    entidadId: mes,
    cambio: `Cierre económico de ${mes} generado — ${proyectosGenerados} proyecto(s)`,
    autor: "ia",
  });

  return { generado: true, mes, proyectosGenerados };
}

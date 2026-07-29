import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db/client";
import { ensureGoalColumns, ensureGoalsTable } from "./db/migrations";
import { acciones, decisiones, goals, movimientos, personas, proyectos } from "./db/schema";
import { computeRunway } from "./finanzas";
import { generarRetoIA } from "./goalsIA";
import { genId } from "./id";
import { hoyISO } from "./tiempo";
import type { Goal, MovimientoEconomico } from "./types";

const POOL_SIZE = 3;

export interface ResultadoRetos {
  generados: number;
  verificados: number;
}

// Revisa los retos activos con criterioAuto y marca cumplidos los que ya se
// lograron según los datos reales — sin esperar a que Eduardo lo marque a
// mano (aunque él siempre puede hacerlo antes, eso no se toca).
async function verificarRetosAuto(): Promise<number> {
  const db = getDb();
  const hoy = hoyISO();
  const activos = (await db.select().from(goals).where(eq(goals.estado, "en_progreso"))) as Goal[];
  const conCriterio = activos.filter((g) => g.criterioAuto);
  if (conCriterio.length === 0) return 0;

  const movimientosRows = (await db.select().from(movimientos)) as MovimientoEconomico[];
  const accionesRows = await db.select().from(acciones);
  const runway = computeRunway(movimientosRows, hoy);
  const pagosVencidos = movimientosRows.filter((m) => m.tipo === "gasto" && m.estado === "esperado" && m.fecha < hoy).length;
  const accionesVencidas = accionesRows.filter(
    (a) => (a.estado === "Pendiente" || a.estado === "En curso") && a.fecha && a.fecha < hoy
  ).length;

  let verificados = 0;
  for (const goal of conCriterio) {
    const c = goal.criterioAuto!;
    let cumplido = false;
    if (c.tipo === "runway_minimo") {
      const r = runway.find((x) => x.moneda === c.moneda);
      cumplido = !!r && r.mesesRunway !== null && r.mesesRunway >= c.mesesMinimos;
    } else if (c.tipo === "cero_pagos_vencidos") {
      cumplido = pagosVencidos === 0;
    } else if (c.tipo === "cero_acciones_vencidas") {
      cumplido = accionesVencidas === 0;
    }
    if (cumplido) {
      await db
        .update(goals)
        .set({ estado: "cumplida", progreso: 100, completadoEn: new Date().toISOString() })
        .where(eq(goals.id, goal.id));
      verificados++;
    }
  }
  return verificados;
}

// Repone el pool de retos de la IA hasta POOL_SIZE, basándose en puntos
// débiles reales del sistema. Se llama desde el cron diario — si nada
// cambió desde ayer, simplemente no genera nada de más.
async function reponerPool(): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 0;

  const db = getDb();
  const hoy = hoyISO();
  const todos = (await db.select().from(goals)) as Goal[];
  const activosIA = todos.filter((g) => g.origen === "ia" && g.estado === "en_progreso");
  const faltantes = POOL_SIZE - activosIA.length;
  if (faltantes <= 0) return 0;

  const [proyectosRows, movimientosRows, decisionesRows, personasRows, accionesRows] = await Promise.all([
    db.select().from(proyectos),
    db.select().from(movimientos) as Promise<MovimientoEconomico[]>,
    db.select().from(decisiones),
    db.select().from(personas),
    db.select().from(acciones),
  ]);

  const proyectosActivos = proyectosRows.filter((p) => p.estado !== "Cerrado" && p.estado !== "Descartado");
  const runway = computeRunway(movimientosRows, hoy);
  const retosExistentes = todos
    .filter((g) => g.origen === "ia" && (g.estado === "en_progreso" || g.completadoEn?.slice(0, 7) === hoy.slice(0, 7)))
    .map((g) => g.titulo);

  const datos = {
    proyectosActivos: proyectosActivos.map((p) => p.nombre),
    proyectosEnRiesgo: proyectosRows.filter((p) => p.estado === "En riesgo" || p.estado === "En cierre").map((p) => p.nombre),
    runwayPorMoneda: runway.map((r) => ({ moneda: r.moneda, mesesRunway: r.mesesRunway })),
    pagosVencidos: movimientosRows.filter((m) => m.tipo === "gasto" && m.estado === "esperado" && m.fecha < hoy).length,
    accionesVencidas: accionesRows.filter((a) => (a.estado === "Pendiente" || a.estado === "En curso") && a.fecha && a.fecha < hoy)
      .length,
    decisionesSinCerrar: decisionesRows.filter((d) => d.estado === "Decidida" && !d.resultadoPosterior.trim()).length,
    personasEsperando: personasRows.filter((p) => (p.diasSinResponder ?? 0) >= 5).length,
    retosExistentes,
  };

  const client = new Anthropic({ apiKey });
  let generados = 0;
  for (let i = 0; i < faltantes; i++) {
    try {
      const reto = await generarRetoIA(client, { ...datos, retosExistentes: [...datos.retosExistentes] });
      const proyecto = reto.proyectoNombre ? proyectosActivos.find((p) => p.nombre === reto.proyectoNombre) : undefined;
      const nuevo: Goal = {
        id: genId("goal"),
        titulo: reto.titulo,
        descripcion: reto.descripcion,
        proyectoId: proyecto?.id ?? null,
        progreso: 0,
        estado: "en_progreso",
        fechaObjetivo: null,
        creadoEn: new Date().toISOString(),
        origen: "ia",
        completadoEn: null,
        criterioAuto: reto.criterioAuto,
      };
      await db.insert(goals).values(nuevo);
      datos.retosExistentes.push(nuevo.titulo);
      generados++;
    } catch (err) {
      console.error("Error generando un reto de la IA", err);
    }
  }
  return generados;
}

export async function actualizarRetosIA(): Promise<ResultadoRetos> {
  if (!isDbConfigured()) return { generados: 0, verificados: 0 };
  await ensureGoalsTable();
  await ensureGoalColumns();

  const verificados = await verificarRetosAuto();
  const generados = await reponerPool();
  return { generados, verificados };
}

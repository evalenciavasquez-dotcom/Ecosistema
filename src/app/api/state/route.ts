import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import {
  acciones,
  agenda,
  bandeja,
  decisiones,
  evidencias,
  historial,
  movimientos,
  personas,
  proyectos,
  strategicCases,
  tiempo,
} from "@/lib/db/schema";
import {
  ensureEvidenciaArchivoColumns,
  ensureGoogleSchema,
  ensureProyectoAnalisisColumn,
  ensureStrategicCaseColumns,
} from "@/lib/db/migrations";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    const db = getDb();
    // Si la tabla existe pero es de antes del panel de expertos, añade las
    // columnas nuevas primero — así el SELECT de abajo no falla por columnas
    // faltantes. Si la tabla ni siquiera existe todavía (esquema sin
    // inicializar), esto lanza y cae en el catch de más abajo, igual que antes.
    await ensureStrategicCaseColumns();
    await ensureEvidenciaArchivoColumns();
    await ensureProyectoAnalisisColumn();
    await ensureGoogleSchema();
    const [
      proyectosRows,
      personasRows,
      accionesRows,
      decisionesRows,
      movimientosRows,
      evidenciasRows,
      bandejaRows,
      agendaRows,
      historialRows,
      strategicCasesRows,
    ] = await Promise.all([
      db.select().from(proyectos).orderBy(desc(proyectos.creadoEn)),
      db.select().from(personas),
      db.select().from(acciones).orderBy(desc(acciones.creadoEn)),
      db.select().from(decisiones).orderBy(desc(decisiones.creadoEn)),
      db.select().from(movimientos).orderBy(desc(movimientos.fecha)),
      db.select().from(evidencias).orderBy(desc(evidencias.fecha)),
      db.select().from(bandeja).orderBy(desc(bandeja.fecha)),
      db.select().from(agenda),
      db.select().from(historial).orderBy(desc(historial.timestamp)).limit(500),
      db.select().from(strategicCases).orderBy(desc(strategicCases.creadoEn)),
    ]);

    // La tabla de tiempo llegó después del esquema inicial: si aún no existe
    // en esta base, no debe tumbar todo el estado.
    const tiempoRows = await db
      .select()
      .from(tiempo)
      .orderBy(desc(tiempo.fecha))
      .catch(() => []);

    return NextResponse.json({
      configured: true,
      proyectos: proyectosRows,
      personas: personasRows,
      acciones: accionesRows,
      decisiones: decisionesRows,
      movimientos: movimientosRows,
      evidencias: evidenciasRows,
      bandeja: bandejaRows,
      agenda: agendaRows,
      historial: historialRows,
      strategicCases: strategicCasesRows,
      tiempo: tiempoRows,
    });
  } catch (err) {
    console.error("Error leyendo estado desde la base de datos", err);
    return NextResponse.json(
      { configured: true, error: "No se pudo leer la base de datos" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { TABLES, cuartelEscenarios } from "@/lib/db/schema";

// Vacía todas las tablas de dominio (proyectos, personas, acciones, etc.) —
// para cuando la base de datos ya es la fuente activa y hay que quitar los
// datos de ejemplo antes de meter información real. Deliberadamente NO toca
// google_connection ni las tablas de push: esas son infraestructura de la
// cuenta, no "información" que Eduardo haya capturado.
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirm !== "BORRAR") {
    return NextResponse.json({ error: "Falta la confirmación" }, { status: 400 });
  }

  try {
    const db = getDb();
    for (const table of Object.values(TABLES)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.delete(table as any).catch(() => {});
    }
    // El Cuartel guarda aparte, en su propia tabla y por su propia ruta, así
    // que no está en TABLES y no se vaciaba con el resto: quien pedía
    // "empezar de cero" se quedaba con sus escenarios de prueba dentro sin
    // enterarse. Se borra explícitamente en vez de meter la tabla en TABLES,
    // porque eso la expondría además a /api/mutate y /api/state, que no son
    // por donde el Cuartel persiste.
    await db.delete(cuartelEscenarios).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error vaciando la base de datos", err);
    return NextResponse.json({ error: "No se pudo vaciar la base de datos" }, { status: 500 });
  }
}

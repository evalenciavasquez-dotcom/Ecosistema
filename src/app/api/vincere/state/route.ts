import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { vincereEstado, vincereProyectos } from "@/lib/db/schema";
import { ensureVincereSchema } from "@/lib/db/migrations";

// Estado completo de VINCERE desde la base. Si DATABASE_URL no está
// configurada responde configured:false y el cliente sigue trabajando contra
// el navegador, exactamente como antes de que existiera la sincronización.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    await ensureVincereSchema();
    const db = getDb();

    const [proyectosRows, estadoRows] = await Promise.all([
      db.select().from(vincereProyectos).orderBy(desc(vincereProyectos.actualizadoEn)),
      db.select().from(vincereEstado),
    ]);

    const estado = estadoRows.find((e) => e.id === "default");

    return NextResponse.json({
      configured: true,
      proyectos: proyectosRows.map((r) => r.doc),
      triageCasos: estado?.triageCasos ?? [],
      comparaciones: estado?.comparaciones ?? {},
    });
  } catch (err) {
    console.error("Error leyendo el estado de VINCERE", err);
    return NextResponse.json({ configured: true, error: "No se pudo leer la base de datos" }, { status: 500 });
  }
}

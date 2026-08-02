import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { cuartelEscenarios } from "@/lib/db/schema";
import { ensureCuartelSchema } from "@/lib/db/migrations";

// Estado completo del Cuartel. Sin DATABASE_URL responde configured:false y el
// cliente sigue trabajando contra el navegador — y lo dice en pantalla, en vez
// de aparentar que quedó guardado en algún lado.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    await ensureCuartelSchema();
    const rows = await getDb()
      .select()
      .from(cuartelEscenarios)
      .orderBy(desc(cuartelEscenarios.actualizadoEn));

    return NextResponse.json({ configured: true, escenarios: rows.map((r) => r.doc) });
  } catch (err) {
    console.error("Error leyendo el estado del Cuartel", err);
    return NextResponse.json({ configured: true, error: "No se pudo leer la base de datos" }, { status: 500 });
  }
}

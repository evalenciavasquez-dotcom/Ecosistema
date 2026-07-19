import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { TABLES } from "@/lib/db/schema";

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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error vaciando la base de datos", err);
    return NextResponse.json({ error: "No se pudo vaciar la base de datos" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { cuartelEscenarios } from "@/lib/db/schema";
import { ensureCuartelSchema } from "@/lib/db/migrations";

interface SyncBody {
  escenarios?: { id: string; nombre?: string; categoria?: string; estado?: string; [k: string]: unknown }[];
  eliminados?: string[];
}

// Escribe los cambios del Cuartel. Solo llegan los escenarios que cambiaron.
// Si algo falla, se responde ok:false con el error real: el cliente muestra
// "sin guardar" y conserva la copia del navegador, nunca al revés.
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const body = (await request.json().catch(() => null)) as SyncBody | null;
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    await ensureCuartelSchema();
    const db = getDb();
    const ahora = new Date().toISOString();

    for (const e of body.escenarios ?? []) {
      if (!e?.id) continue;
      const fila = {
        id: e.id,
        nombre: String(e.nombre ?? ""),
        categoria: String(e.categoria ?? "otro"),
        estado: String(e.estado ?? "activo"),
        actualizadoEn: ahora,
        doc: e as Record<string, unknown>,
      };
      await db
        .insert(cuartelEscenarios)
        .values(fila)
        .onConflictDoUpdate({
          target: cuartelEscenarios.id,
          set: {
            nombre: fila.nombre,
            categoria: fila.categoria,
            estado: fila.estado,
            actualizadoEn: ahora,
            doc: fila.doc,
          },
        });
    }

    const eliminados = (body.eliminados ?? []).filter((id) => typeof id === "string" && id.length > 0);
    if (eliminados.length) {
      await db.delete(cuartelEscenarios).where(inArray(cuartelEscenarios.id, eliminados));
    }

    return NextResponse.json({ configured: true, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error escribiendo en la base de datos";
    console.error("Error sincronizando el Cuartel", err);
    return NextResponse.json({ configured: true, ok: false, error: message }, { status: 500 });
  }
}

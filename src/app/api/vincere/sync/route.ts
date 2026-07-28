import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { vincereEstado, vincereProyectos } from "@/lib/db/schema";
import { ensureVincereSchema } from "@/lib/db/migrations";

interface SyncBody {
  proyectos?: { id: string; nombre: string; tipo: string; [k: string]: unknown }[];
  eliminados?: string[];
  estado?: { triageCasos?: unknown[]; comparaciones?: Record<string, unknown> };
}

// Escribe los cambios de VINCERE. El cliente manda solo los proyectos que
// cambiaron, así que cada llamada es pequeña aunque el documento sea grande.
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const body = (await request.json().catch(() => null)) as SyncBody | null;
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    await ensureVincereSchema();
    const db = getDb();
    const ahora = new Date().toISOString();

    if (body.proyectos?.length) {
      for (const p of body.proyectos) {
        if (!p?.id) continue;
        await db
          .insert(vincereProyectos)
          .values({
            id: p.id,
            nombre: String(p.nombre ?? ""),
            tipo: String(p.tipo ?? "propio"),
            actualizadoEn: ahora,
            doc: p as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: vincereProyectos.id,
            set: {
              nombre: String(p.nombre ?? ""),
              tipo: String(p.tipo ?? "propio"),
              actualizadoEn: ahora,
              doc: p as Record<string, unknown>,
            },
          });
      }
    }

    const eliminados = (body.eliminados ?? []).filter((id) => typeof id === "string" && id.length > 0);
    if (eliminados.length) {
      await db.delete(vincereProyectos).where(inArray(vincereProyectos.id, eliminados));
    }

    if (body.estado) {
      await db
        .insert(vincereEstado)
        .values({
          id: "default",
          triageCasos: body.estado.triageCasos ?? [],
          comparaciones: body.estado.comparaciones ?? {},
          actualizadoEn: ahora,
        })
        .onConflictDoUpdate({
          target: vincereEstado.id,
          set: {
            triageCasos: body.estado.triageCasos ?? [],
            comparaciones: body.estado.comparaciones ?? {},
            actualizadoEn: ahora,
          },
        });
    }

    return NextResponse.json({ configured: true, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error escribiendo en la base de datos";
    console.error("Error sincronizando VINCERE", err);
    return NextResponse.json({ configured: true, ok: false, error: message }, { status: 500 });
  }
}

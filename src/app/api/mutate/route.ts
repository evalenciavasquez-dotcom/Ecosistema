import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { agenda, TABLES, type TableName } from "@/lib/db/schema";
import {
  ensureEvidenciaArchivoColumns,
  ensureGoogleSchema,
  ensureProyectoAnalisisColumn,
  ensureStrategicCaseColumns,
  ensureTiempoTable,
} from "@/lib/db/migrations";
import { isGoogleConfigured } from "@/lib/google";
import { pushAgendaEventoCreado, pushAgendaEventoEliminado } from "@/lib/googleSync";

type MutateBody = {
  table: TableName;
  op: "insert" | "update" | "delete";
  id?: string;
  values?: Record<string, unknown>;
};

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  let body: MutateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { table, op, id, values } = body;
  const target = TABLES[table];
  if (!target) {
    return NextResponse.json({ error: `Tabla desconocida: ${table}` }, { status: 400 });
  }

  try {
    const db = getDb();
    if (table === "tiempo") await ensureTiempoTable();
    if (table === "strategicCases") await ensureStrategicCaseColumns();
    if (table === "evidencias") await ensureEvidenciaArchivoColumns();
    if (table === "proyectos") await ensureProyectoAnalisisColumn();
    if (table === "agenda") await ensureGoogleSchema();
    switch (op) {
      case "insert": {
        if (!values) return NextResponse.json({ error: "Faltan 'values'" }, { status: 400 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(target as any).values(values as any);
        if (table === "agenda" && isGoogleConfigured()) {
          const v = values as { id?: string; titulo?: string; fecha?: string; hora?: string; descripcion?: string };
          if (v.id && v.titulo && v.fecha) {
            pushAgendaEventoCreado(v.id, {
              titulo: v.titulo,
              fecha: v.fecha,
              hora: v.hora ?? "",
              descripcion: v.descripcion,
            }).catch((err) => {
              console.error("No se pudo crear el evento en Google Calendar (no crítico)", err);
            });
          }
        }
        break;
      }
      case "update": {
        if (!id) return NextResponse.json({ error: "Falta 'id'" }, { status: 400 });
        if (!values) return NextResponse.json({ error: "Faltan 'values'" }, { status: 400 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.update(target as any).set(values as any).where(eq((target as any).id, id));
        break;
      }
      case "delete": {
        if (!id) return NextResponse.json({ error: "Falta 'id'" }, { status: 400 });
        if (table === "agenda" && isGoogleConfigured()) {
          const existingRows = await db.select().from(agenda).where(eq(agenda.id, id));
          const existing = existingRows[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.delete(target as any).where(eq((target as any).id, id));
          if (existing?.googleEventId) {
            pushAgendaEventoEliminado(existing.googleEventId).catch((err) => {
              console.error("No se pudo eliminar el evento en Google Calendar (no crítico)", err);
            });
          }
          break;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.delete(target as any).where(eq((target as any).id, id));
        break;
      }
      default:
        return NextResponse.json({ error: `Operación desconocida: ${op}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error escribiendo en la base de datos", err);
    return NextResponse.json({ error: "No se pudo escribir en la base de datos" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { TABLES, type TableName } from "@/lib/db/schema";

// La tabla de tiempo llegó después del esquema inicial: se asegura bajo
// demanda para que las bases ya inicializadas no requieran pasos manuales.
let tiempoAsegurada = false;
async function ensureTiempoTable() {
  if (tiempoAsegurada) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS tiempo (
      id text PRIMARY KEY,
      proyecto_id text NOT NULL,
      fecha text NOT NULL,
      minutos integer NOT NULL,
      descripcion text NOT NULL,
      creado_en text NOT NULL
    )`)
  );
  tiempoAsegurada = true;
}

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
    switch (op) {
      case "insert": {
        if (!values) return NextResponse.json({ error: "Faltan 'values'" }, { status: 400 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(target as any).values(values as any);
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

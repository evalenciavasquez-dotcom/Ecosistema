import { sql } from "drizzle-orm";
import { getDb } from "./client";

// Tabla genérica clave/valor para ajustes sueltos del sistema (ej. el umbral
// de días de runway de la capa de cuestionamiento). Coexiste con la misma
// tabla que crea src/lib/db/push.ts para las claves VAPID — ambas usan
// CREATE TABLE IF NOT EXISTS, así que no hay conflicto.
let configTableEnsured = false;
async function ensureConfigTable() {
  if (configTableEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS app_config (
      key text PRIMARY KEY,
      value text NOT NULL
    )`)
  );
  configTableEnsured = true;
}

function resultRows(res: unknown): Record<string, unknown>[] {
  const rows = (res as { rows?: Record<string, unknown>[] }).rows;
  return Array.isArray(rows) ? rows : [];
}

export async function getConfigValue(key: string): Promise<string | null> {
  await ensureConfigTable();
  const res = await getDb().execute(sql`SELECT value FROM app_config WHERE key = ${key}`);
  const row = resultRows(res)[0];
  return typeof row?.value === "string" ? row.value : null;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  await ensureConfigTable();
  await getDb().execute(
    sql`INSERT INTO app_config (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = ${value}`
  );
}

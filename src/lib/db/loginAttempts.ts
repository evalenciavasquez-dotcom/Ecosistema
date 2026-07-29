import { sql } from "drizzle-orm";
import { getDb } from "./client";

// Freno a fuerza bruta sobre la contraseña única del sistema. Guardado en
// Postgres (no en memoria) porque en Vercel cada invocación puede caer en
// una instancia distinta — un contador en memoria no serviría de nada.
const MAX_INTENTOS = 8;
const VENTANA_MINUTOS = 15;

let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS login_attempts (
      id text PRIMARY KEY,
      ip text NOT NULL,
      intentado_en timestamptz NOT NULL DEFAULT now()
    )`)
  );
  await getDb().execute(sql.raw(`CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, intentado_en)`));
  tableEnsured = true;
}

function resultRows(res: unknown): Record<string, unknown>[] {
  const rows = (res as { rows?: Record<string, unknown>[] }).rows;
  return Array.isArray(rows) ? rows : [];
}

export async function estaBloqueado(ip: string): Promise<boolean> {
  await ensureTable();
  const res = await getDb().execute(
    sql`SELECT count(*)::int AS n FROM login_attempts
        WHERE ip = ${ip} AND intentado_en > now() - interval '${sql.raw(String(VENTANA_MINUTOS))} minutes'`
  );
  const n = Number(resultRows(res)[0]?.n ?? 0);
  return n >= MAX_INTENTOS;
}

export async function registrarIntentoFallido(ip: string): Promise<void> {
  await ensureTable();
  await getDb().execute(
    sql`INSERT INTO login_attempts (id, ip) VALUES (${crypto.randomUUID()}, ${ip})`
  );
}

export async function limpiarIntentos(ip: string): Promise<void> {
  await ensureTable();
  await getDb().execute(sql`DELETE FROM login_attempts WHERE ip = ${ip}`);
}

import { sql } from "drizzle-orm";
import { getDb } from "./client";

// Ajustes de esquema que llegaron después de la inicialización original.
// Se aplican bajo demanda (ADD COLUMN / CREATE TABLE IF NOT EXISTS) para que
// una base ya inicializada en producción no requiera pasos manuales.
// Memoizados por instancia serverless para no repetir el ALTER en cada request.

let tiempoEnsured = false;
export async function ensureTiempoTable() {
  if (tiempoEnsured) return;
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
  tiempoEnsured = true;
}

let strategicCaseColumnsEnsured = false;
export async function ensureStrategicCaseColumns() {
  if (strategicCaseColumnsEnsured) return;
  await getDb().execute(
    sql.raw(`ALTER TABLE strategic_cases
      ADD COLUMN IF NOT EXISTS tipo_de_caso text,
      ADD COLUMN IF NOT EXISTS lentes_activos jsonb,
      ADD COLUMN IF NOT EXISTS panel_expertos jsonb`)
  );
  strategicCaseColumnsEnsured = true;
}

let evidenciaArchivoColumnsEnsured = false;
export async function ensureEvidenciaArchivoColumns() {
  if (evidenciaArchivoColumnsEnsured) return;
  await getDb().execute(
    sql.raw(`ALTER TABLE evidencias
      ADD COLUMN IF NOT EXISTS archivo_datos text,
      ADD COLUMN IF NOT EXISTS archivo_tipo text,
      ADD COLUMN IF NOT EXISTS archivo_nombre text`)
  );
  evidenciaArchivoColumnsEnsured = true;
}

let proyectoColumnsEnsured = false;
export async function ensureProyectoColumns() {
  if (proyectoColumnsEnsured) return;
  await getDb().execute(
    sql.raw(`ALTER TABLE proyectos
      ADD COLUMN IF NOT EXISTS analisis_economico jsonb,
      ADD COLUMN IF NOT EXISTS ambito text NOT NULL DEFAULT 'negocio'`)
  );
  proyectoColumnsEnsured = true;
}

let metasFinancierasEnsured = false;
export async function ensureMetasFinancierasTable() {
  if (metasFinancierasEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS metas_financieras (
      id text PRIMARY KEY,
      descripcion text NOT NULL,
      moneda text NOT NULL,
      monto_inicial double precision NOT NULL,
      monto_objetivo double precision NOT NULL,
      fecha_objetivo text,
      creado_en text NOT NULL
    )`)
  );
  metasFinancierasEnsured = true;
}

let googleSchemaEnsured = false;
export async function ensureGoogleSchema() {
  if (googleSchemaEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS google_connection (
      id text PRIMARY KEY,
      access_token text NOT NULL,
      refresh_token text NOT NULL,
      expiry_date text NOT NULL,
      scope text NOT NULL,
      gmail_label_id text,
      last_gmail_sync text,
      connected_at text NOT NULL
    )`)
  );
  await getDb().execute(sql.raw(`ALTER TABLE agenda ADD COLUMN IF NOT EXISTS google_event_id text`));
  await getDb().execute(
    sql.raw(`ALTER TABLE google_connection
      ADD COLUMN IF NOT EXISTS gmail_processed_label_id text,
      ADD COLUMN IF NOT EXISTS calendar_sync_token text`)
  );
  googleSchemaEnsured = true;
}

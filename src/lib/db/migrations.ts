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

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
      ADD COLUMN IF NOT EXISTS panel_expertos jsonb,
      ADD COLUMN IF NOT EXISTS recomendacion_sistema text,
      ADD COLUMN IF NOT EXISTS hipotesis_critica text,
      ADD COLUMN IF NOT EXISTS hipotesis_se_cumplio boolean,
      ADD COLUMN IF NOT EXISTS costo_dias_runway double precision,
      ADD COLUMN IF NOT EXISTS checklist_proceso jsonb,
      ADD COLUMN IF NOT EXISTS metricas_financieras jsonb,
      ADD COLUMN IF NOT EXISTS argumento_en_contra text,
      ADD COLUMN IF NOT EXISTS costo_de_esperar_30_dias text`)
  );
  await getDb().execute(sql.raw(`ALTER TABLE decisiones ADD COLUMN IF NOT EXISTS fecha_decision text`));
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

let cierresMensualesEnsured = false;
export async function ensureCierresMensualesTable() {
  if (cierresMensualesEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS cierres_mensuales (
      id text PRIMARY KEY,
      mes text NOT NULL,
      proyecto_id text,
      proyecto_nombre text,
      resumen_por_moneda jsonb NOT NULL,
      categorias_gasto jsonb NOT NULL,
      horas_invertidas double precision,
      metas_financieras jsonb NOT NULL,
      pagos_vencidos jsonb NOT NULL,
      proyectos_en_riesgo jsonb NOT NULL,
      decisiones_sin_cerrar jsonb NOT NULL,
      lectura_estrategica text NOT NULL,
      semaforo text NOT NULL,
      creado_en text NOT NULL
    )`)
  );
  await getDb().execute(
    sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS cierres_mensuales_mes_proyecto_idx
      ON cierres_mensuales (mes, COALESCE(proyecto_id, ''))`)
  );
  cierresMensualesEnsured = true;
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
  await getDb().execute(sql.raw(`ALTER TABLE acciones ADD COLUMN IF NOT EXISTS google_task_id text`));
  await getDb().execute(
    sql.raw(`ALTER TABLE google_connection
      ADD COLUMN IF NOT EXISTS gmail_processed_label_id text,
      ADD COLUMN IF NOT EXISTS calendar_sync_token text,
      ADD COLUMN IF NOT EXISTS last_tasks_sync text`)
  );
  googleSchemaEnsured = true;
}

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
      ADD COLUMN IF NOT EXISTS costo_de_esperar_30_dias text,
      ADD COLUMN IF NOT EXISTS razonamiento text,
      ADD COLUMN IF NOT EXISTS fuentes_externas jsonb`)
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

// Tablas de VINCERE. Llegaron después del esquema original, así que se crean
// bajo demanda: una base ya desplegada no necesita ningún paso manual.
let vincereSchemaEnsured = false;
export async function ensureVincereSchema() {
  if (vincereSchemaEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS vincere_proyectos (
      id text PRIMARY KEY,
      nombre text NOT NULL,
      tipo text NOT NULL,
      actualizado_en text NOT NULL,
      doc jsonb NOT NULL
    )`)
  );
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS vincere_estado (
      id text PRIMARY KEY,
      triage_casos jsonb NOT NULL,
      comparaciones jsonb NOT NULL,
      actualizado_en text NOT NULL
    )`)
  );
  vincereSchemaEnsured = true;
}

// Tabla del Cuartel. Se crea bajo demanda, como las de VINCERE: una base ya
// desplegada no necesita ningún paso manual para empezar a guardar escenarios.
let cuartelSchemaEnsured = false;
export async function ensureCuartelSchema() {
  if (cuartelSchemaEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS cuartel_escenarios (
      id text PRIMARY KEY,
      nombre text NOT NULL,
      categoria text NOT NULL,
      estado text NOT NULL,
      actualizado_en text NOT NULL,
      doc jsonb NOT NULL
    )`)
  );
  cuartelSchemaEnsured = true;
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

let goalsEnsured = false;
export async function ensureGoalsTable() {
  if (goalsEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS goals (
      id text PRIMARY KEY,
      titulo text NOT NULL,
      descripcion text NOT NULL,
      proyecto_id text,
      progreso integer NOT NULL DEFAULT 0,
      estado text NOT NULL,
      fecha_objetivo text,
      creado_en text NOT NULL
    )`)
  );
  goalsEnsured = true;
}

let goalColumnsEnsured = false;
// Columnas del pool de retos de la IA — llegaron después de la tabla goals
// original, así que las tablas ya creadas necesitan el ALTER.
export async function ensureGoalColumns() {
  if (goalColumnsEnsured) return;
  await getDb().execute(
    sql.raw(`ALTER TABLE goals
      ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS completado_en text,
      ADD COLUMN IF NOT EXISTS criterio_auto jsonb`)
  );
  goalColumnsEnsured = true;
}

let interrogatoriosEnsured = false;
export async function ensureInterrogatoriosTable() {
  if (interrogatoriosEnsured) return;
  await getDb().execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS interrogatorios (
      id text PRIMARY KEY,
      decision_id text NOT NULL,
      turnos jsonb NOT NULL,
      estado text NOT NULL,
      creado_en text NOT NULL
    )`)
  );
  interrogatoriosEnsured = true;
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

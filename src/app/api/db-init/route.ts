import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS proyectos (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    objetivo text NOT NULL,
    estado text NOT NULL,
    prioridad text NOT NULL,
    persona_ids jsonb NOT NULL,
    rol_usuario text NOT NULL,
    situacion_economica text NOT NULL,
    proximo_hito text NOT NULL,
    riesgos jsonb NOT NULL,
    oportunidades jsonb NOT NULL,
    proxima_accion_recomendada text NOT NULL,
    evidence_level text NOT NULL,
    creado_en text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS personas (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    empresa_proyecto text NOT NULL,
    rol text NOT NULL,
    relacion text NOT NULL,
    nivel_influencia text NOT NULL,
    intereses jsonb NOT NULL,
    compromisos jsonb NOT NULL,
    conversaciones_pendientes text NOT NULL,
    pagos_relacionados text NOT NULL,
    riesgos jsonb NOT NULL,
    ultimo_contacto text NOT NULL,
    proyecto_ids jsonb NOT NULL,
    dias_sin_responder integer
  )`,
  `CREATE TABLE IF NOT EXISTS acciones (
    id text PRIMARY KEY,
    titulo text NOT NULL,
    resultado_esperado text NOT NULL,
    proyecto_id text,
    responsable text NOT NULL,
    prioridad text NOT NULL,
    estado text NOT NULL,
    fecha text NOT NULL,
    duracion_estimada text NOT NULL,
    dependencias text NOT NULL,
    impacto_financiero text NOT NULL,
    evidencia_cierre text NOT NULL,
    creado_en text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS decisiones (
    id text PRIMARY KEY,
    pregunta text NOT NULL,
    contexto text NOT NULL,
    proyecto_id text,
    fecha_limite text NOT NULL,
    nivel_riesgo text NOT NULL,
    evidence_level text NOT NULL,
    opciones jsonb NOT NULL,
    escenarios jsonb NOT NULL,
    impacto_economico text NOT NULL,
    recomendacion_sistema text NOT NULL,
    decision_final text NOT NULL,
    condiciones jsonb NOT NULL,
    resultado_posterior text NOT NULL,
    estado text NOT NULL,
    creado_en text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS movimientos (
    id text PRIMARY KEY,
    tipo text NOT NULL,
    monto double precision NOT NULL,
    moneda text NOT NULL,
    fecha text NOT NULL,
    proyecto_id text,
    descripcion text NOT NULL,
    estado text NOT NULL,
    fuente text NOT NULL,
    cuenta text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS evidencias (
    id text PRIMARY KEY,
    tipo text NOT NULL,
    fuente text NOT NULL,
    fecha text NOT NULL,
    proyecto_id text,
    nivel_confiabilidad text NOT NULL,
    afirmacion_respaldada text NOT NULL,
    estado_verificacion text NOT NULL,
    archivo_datos text,
    archivo_tipo text,
    archivo_nombre text
  )`,
  `CREATE TABLE IF NOT EXISTS bandeja (
    id text PRIMARY KEY,
    texto text NOT NULL,
    fecha text NOT NULL,
    estado text NOT NULL,
    clasificacion jsonb NOT NULL,
    resultado_label text
  )`,
  `CREATE TABLE IF NOT EXISTS agenda (
    id text PRIMARY KEY,
    titulo text NOT NULL,
    fecha text NOT NULL,
    hora text NOT NULL,
    proyecto_id text,
    descripcion text NOT NULL,
    tipo text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS historial (
    id text PRIMARY KEY,
    timestamp text NOT NULL,
    entidad_tipo text NOT NULL,
    entidad_id text NOT NULL,
    cambio text NOT NULL,
    autor text NOT NULL,
    antes jsonb,
    despues jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS tiempo (
    id text PRIMARY KEY,
    proyecto_id text NOT NULL,
    fecha text NOT NULL,
    minutos integer NOT NULL,
    descripcion text NOT NULL,
    creado_en text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS strategic_cases (
    id text PRIMARY KEY,
    decision_id text NOT NULL,
    pregunta_estrategica text NOT NULL,
    tipo_de_caso text,
    lentes_activos jsonb,
    panel_expertos jsonb,
    resumen_ejecutivo text NOT NULL,
    hechos jsonb NOT NULL,
    hipotesis jsonb NOT NULL,
    vacios jsonb NOT NULL,
    contradicciones jsonb NOT NULL,
    punto_de_vista text NOT NULL,
    dofa jsonb NOT NULL,
    ganancias_perdidas jsonb NOT NULL,
    rentabilidad jsonb NOT NULL,
    costo_oportunidad jsonb NOT NULL,
    stakeholders jsonb NOT NULL,
    viabilidad jsonb NOT NULL,
    escenarios jsonb NOT NULL,
    recomendacion jsonb NOT NULL,
    nivel_analisis text NOT NULL,
    modelo_usado text NOT NULL,
    creado_en text NOT NULL
  )`,
];

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    const db = getDb();
    for (const statement of STATEMENTS) {
      await db.execute(sql.raw(statement));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error inicializando el esquema de la base de datos", err);
    return NextResponse.json(
      { error: "No se pudo inicializar el esquema de la base de datos" },
      { status: 500 }
    );
  }
}

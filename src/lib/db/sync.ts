export type MutateOp = "insert" | "update" | "delete";

export function dbMutate(
  table: string,
  op: MutateOp,
  id?: string,
  values?: object
): void {
  if (typeof window === "undefined") return;
  fetch("/api/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, op, id, values }),
  }).catch((err) => {
    console.warn(`No se pudo sincronizar con la base de datos (${table}.${op})`, err);
  });
}

export interface ServerState {
  configured: boolean;
  error?: string;
  proyectos?: unknown[];
  personas?: unknown[];
  acciones?: unknown[];
  decisiones?: unknown[];
  movimientos?: unknown[];
  evidencias?: unknown[];
  bandeja?: unknown[];
  agenda?: unknown[];
  historial?: unknown[];
  strategicCases?: unknown[];
}

export interface MigrationResult {
  ok: boolean;
  inserted: number;
  errors: string[];
}

export async function migrateAllToServer(state: {
  proyectos: unknown[];
  personas: unknown[];
  acciones: unknown[];
  decisiones: unknown[];
  movimientos: unknown[];
  evidencias: unknown[];
  bandeja: unknown[];
  agenda: unknown[];
  historial: unknown[];
  strategicCases: unknown[];
}): Promise<MigrationResult> {
  const tables: [string, unknown[]][] = [
    ["proyectos", state.proyectos],
    ["personas", state.personas],
    ["acciones", state.acciones],
    ["decisiones", state.decisiones],
    ["movimientos", state.movimientos],
    ["evidencias", state.evidencias],
    ["bandeja", state.bandeja],
    ["agenda", state.agenda],
    ["historial", state.historial],
    ["strategicCases", state.strategicCases],
  ];

  let inserted = 0;
  const errors: string[] = [];

  for (const [table, rows] of tables) {
    for (const values of rows) {
      try {
        const res = await fetch("/api/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, op: "insert", values }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          errors.push(`${table}: ${body.error ?? res.status}`);
        } else {
          inserted++;
        }
      } catch (err) {
        errors.push(`${table}: ${(err as Error).message}`);
      }
    }
  }

  return { ok: errors.length === 0, inserted, errors };
}

export async function fetchServerState(): Promise<ServerState | null> {
  try {
    const res = await fetch("/api/state");
    if (!res.ok) return null;
    return (await res.json()) as ServerState;
  } catch (err) {
    console.warn("No se pudo leer el estado del servidor", err);
    return null;
  }
}

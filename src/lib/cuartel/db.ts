import { useCuartelStore } from "./store";
import { CuartelEscenario } from "./types";

// Sincronización del Cuartel con la base. Mismo mecanismo que VINCERE —
// observa el store y manda solo lo que cambió— pero contra tablas propias:
// este contenido nunca se mezcla con proyectos ni con nada de negocio.

export type CuartelSyncEstado = "desconocido" | "local" | "sincronizado" | "error";

export interface CuartelServerState {
  configured: boolean;
  error?: string;
  escenarios?: CuartelEscenario[];
}

export async function fetchCuartelState(): Promise<CuartelServerState | null> {
  try {
    const res = await fetch("/api/cuartel/state");
    return (await res.json()) as CuartelServerState;
  } catch {
    return null;
  }
}

const DEBOUNCE_MS = 900;

export function startCuartelSync(onEstado: (e: CuartelSyncEstado) => void): () => void {
  const pendientes = new Set<string>();
  const eliminados = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let enVuelo = false;

  async function enviar() {
    if (enVuelo) {
      programar();
      return;
    }
    const s = useCuartelStore.getState();
    const escenarios = s.escenarios.filter((e) => pendientes.has(e.id));
    const borrar = [...eliminados];
    if (escenarios.length === 0 && borrar.length === 0) return;

    pendientes.clear();
    eliminados.clear();
    enVuelo = true;

    try {
      const res = await fetch("/api/cuartel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escenarios, eliminados: borrar }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.configured === false) onEstado("local");
      else if (!res.ok || body?.ok === false) onEstado("error");
      else onEstado("sincronizado");
    } catch {
      // Se reintenta con el próximo cambio. La copia del navegador queda
      // intacta y el indicador dice "sin guardar" — nunca al revés.
      escenarios.forEach((e) => pendientes.add(e.id));
      borrar.forEach((id) => eliminados.add(id));
      onEstado("error");
    } finally {
      enVuelo = false;
    }
  }

  function programar() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(enviar, DEBOUNCE_MS);
  }

  const unsub = useCuartelStore.subscribe((next, prev) => {
    if (next.escenarios === prev.escenarios) return;
    const previosPorId = new Map(prev.escenarios.map((e) => [e.id, e]));
    for (const e of next.escenarios) {
      if (previosPorId.get(e.id) !== e) pendientes.add(e.id);
    }
    const actuales = new Set(next.escenarios.map((e) => e.id));
    for (const e of prev.escenarios) {
      if (!actuales.has(e.id)) {
        eliminados.add(e.id);
        pendientes.delete(e.id);
      }
    }
    if (pendientes.size || eliminados.size) programar();
  });

  const alSalir = () => {
    if (timer) clearTimeout(timer);
    void enviar();
  };
  if (typeof window !== "undefined") window.addEventListener("beforeunload", alSalir);

  return () => {
    unsub();
    if (timer) clearTimeout(timer);
    if (typeof window !== "undefined") window.removeEventListener("beforeunload", alSalir);
  };
}

// Primera vez que se conecta la base: sube lo que ya había en el navegador.
export async function migrarTodoCuartel(): Promise<{ ok: boolean; error?: string }> {
  const s = useCuartelStore.getState();
  if (!s.escenarios.length) return { ok: true };
  try {
    const res = await fetch("/api/cuartel/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escenarios: s.escenarios }),
    });
    const body = await res.json().catch(() => ({}));
    if (body?.configured === false) return { ok: false, error: "La base de datos no está configurada" };
    if (!res.ok || body?.ok === false) return { ok: false, error: body?.error ?? `Error ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

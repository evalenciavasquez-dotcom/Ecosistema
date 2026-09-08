import { useVincereStore } from "./store";
import { VincereProyecto, VincereTriageCaso, VincereComparacion } from "./types";

export type VincereSyncEstado = "desconocido" | "local" | "sincronizado" | "error";

export interface VincereServerState {
  configured: boolean;
  error?: string;
  proyectos?: VincereProyecto[];
  triageCasos?: VincereTriageCaso[];
  comparaciones?: Record<string, VincereComparacion>;
}

export async function fetchVincereState(): Promise<VincereServerState | null> {
  try {
    const res = await fetch("/api/vincere/state");
    return (await res.json()) as VincereServerState;
  } catch {
    return null;
  }
}

const DEBOUNCE_MS = 900;

// Sincroniza el store con la base sin que las acciones tengan que acordarse de
// llamar a nada: observa el store, calcula qué proyectos cambiaron por
// identidad de referencia (el estado es inmutable) y envía solo eso.
export function startVincereSync(onEstado: (e: VincereSyncEstado) => void): () => void {
  const proyectosPendientes = new Set<string>();
  const eliminados = new Set<string>();
  let estadoPendiente = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let enVuelo = false;

  async function enviar() {
    if (enVuelo) {
      programar();
      return;
    }
    const s = useVincereStore.getState();
    const proyectos = s.proyectos.filter((p) => proyectosPendientes.has(p.id));
    const borrar = [...eliminados];
    const mandarEstado = estadoPendiente;

    if (proyectos.length === 0 && borrar.length === 0 && !mandarEstado) return;

    proyectosPendientes.clear();
    eliminados.clear();
    estadoPendiente = false;
    enVuelo = true;

    try {
      const res = await fetch("/api/vincere/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectos,
          eliminados: borrar,
          estado: mandarEstado ? { triageCasos: s.triageCasos, comparaciones: s.comparaciones } : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.configured === false) onEstado("local");
      else if (!res.ok || body?.ok === false) onEstado("error");
      else onEstado("sincronizado");
    } catch {
      // Se reintenta en el siguiente cambio; el navegador conserva la copia.
      proyectos.forEach((p) => proyectosPendientes.add(p.id));
      borrar.forEach((id) => eliminados.add(id));
      if (mandarEstado) estadoPendiente = true;
      onEstado("error");
    } finally {
      enVuelo = false;
    }
  }

  function programar() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(enviar, DEBOUNCE_MS);
  }

  const unsub = useVincereStore.subscribe((next, prev) => {
    if (next.proyectos !== prev.proyectos) {
      const previosPorId = new Map(prev.proyectos.map((p) => [p.id, p]));
      for (const p of next.proyectos) {
        if (previosPorId.get(p.id) !== p) proyectosPendientes.add(p.id);
      }
      const idsActuales = new Set(next.proyectos.map((p) => p.id));
      for (const p of prev.proyectos) {
        if (!idsActuales.has(p.id)) {
          eliminados.add(p.id);
          proyectosPendientes.delete(p.id);
        }
      }
    }
    if (next.triageCasos !== prev.triageCasos || next.comparaciones !== prev.comparaciones) {
      estadoPendiente = true;
    }
    if (proyectosPendientes.size || eliminados.size || estadoPendiente) programar();
  });

  // Si el usuario cierra la pestaña con cambios recién hechos, se intenta un
  // último envío en lugar de perderlos.
  const alSalir = () => {
    if (timer) clearTimeout(timer);
    void enviar();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", alSalir);
  }

  return () => {
    unsub();
    if (timer) clearTimeout(timer);
    if (typeof window !== "undefined") window.removeEventListener("beforeunload", alSalir);
  };
}

// Borrar todo, esperando a que la base lo confirme.
//
// «Empezar de cero» vaciaba el store y dejaba que la suscripción de arriba
// propagara los borrados 900 ms después, en segundo plano. Con base conectada
// eso tiene un agujero que se ve enseguida: si la petición falla, o si la
// pestaña se recarga dentro de esa ventana, el navegador queda vacío pero la
// base sigue teniendo todo — y a la siguiente carga la hidratación lo devuelve
// entero. Desde fuera se lee como «le di borrar y no pasó nada», que es
// exactamente lo que pasó.
//
// El `beforeunload` que había como red de seguridad no alcanza: los
// navegadores matan las peticiones en vuelo al descargar la página, así que
// justo en el caso que importa es cuando menos sirve.
//
// Un gesto irreversible no puede depender de un temporizador. Acá se manda el
// borrado y se espera la respuesta; quien llama decide qué hacer con el
// resultado en vez de suponer que salió bien.
export async function borrarTodoEnServidor(
  ids: string[]
): Promise<{ ok: boolean; configurada: boolean; error?: string }> {
  try {
    const res = await fetch("/api/vincere/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eliminados: ids,
        // El estado va vacío en la misma llamada: los casos de triage y las
        // comparaciones también se borran, y mandarlos aparte dejaría media
        // limpieza hecha si la segunda petición fallara.
        estado: { triageCasos: [], comparaciones: {} },
      }),
    });
    const body = await res.json().catch(() => ({}));
    // Sin base configurada no hay nada que borrar allá: el borrado local es
    // todo el borrado que existe, y eso no es un fallo.
    if (body?.configured === false) return { ok: true, configurada: false };
    if (!res.ok || body?.ok === false) {
      return { ok: false, configurada: true, error: body?.error ?? `Error ${res.status}` };
    }
    return { ok: true, configurada: true };
  } catch (err) {
    return { ok: false, configurada: true, error: err instanceof Error ? err.message : "Error de red" };
  }
}

// Sube todo el estado local a la base de una sola vez. Se usa la primera vez
// que se configura la base: lo que ya estaba en el navegador no se pierde.
export async function migrarTodoVincere(): Promise<{ ok: boolean; error?: string }> {
  const s = useVincereStore.getState();
  try {
    const res = await fetch("/api/vincere/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectos: s.proyectos,
        estado: { triageCasos: s.triageCasos, comparaciones: s.comparaciones },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (body?.configured === false) return { ok: false, error: "La base de datos no está configurada" };
    if (!res.ok || body?.ok === false) return { ok: false, error: body?.error ?? `Error ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

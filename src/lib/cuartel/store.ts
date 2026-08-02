import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { genId } from "../id";
import {
  CUARTEL_METRICAS,
  CUARTEL_RUTAS_BASE,
  CuartelCerteza,
  CuartelCierre,
  CuartelEscenario,
  CuartelEstado,
  CuartelLegal,
  CuartelLuz,
  CuartelMetrica,
  CuartelPreguntaTipo,
  CuartelRuta,
  CuartelRutaTipo,
  CuartelSeccion,
  CuartelSombrero,
  cierreVacio,
  legalVacio,
  semaforoVacio,
  sombrerosVacios,
} from "./types";

function getPersistStorage(): Storage {
  if (typeof window !== "undefined") return window.localStorage;
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
}

function hoyISO(): string {
  return new Date().toISOString();
}

export function nuevaRuta(tipo: CuartelRutaTipo, origen: "eduardo" | "sistema" = "sistema"): CuartelRuta {
  return {
    id: genId("cru"),
    tipo,
    nombre: "",
    sombreros: sombrerosVacios(),
    semaforo: semaforoVacio(),
    legal: legalVacio(),
    certezaRiesgos: "interpretacion",
    turnos: [],
    origen,
    creadoEn: hoyISO(),
  };
}

export interface NuevoEscenarioInput {
  nombre: string;
  categoria: CuartelEscenario["categoria"];
  contextoActual: string;
  patronRepetido: string;
  tensionReal: string;
  fechaLimite: string;
}

interface CuartelState {
  escenarios: CuartelEscenario[];
  seccion: CuartelSeccion;
  escenarioAbiertoId: string | null;
  toast: string | null;

  setSeccion: (s: CuartelSeccion) => void;
  abrirEscenario: (id: string | null) => void;
  showToast: (t: string | null) => void;

  crearEscenario: (input: NuevoEscenarioInput) => string;
  actualizarEscenario: (id: string, campos: Partial<Omit<CuartelEscenario, "id" | "rutas" | "cierre">>) => void;
  eliminarEscenario: (id: string) => void;

  agregarRuta: (escenarioId: string, tipo: CuartelRutaTipo, nombre?: string) => string;
  eliminarRuta: (escenarioId: string, rutaId: string) => void;
  setSombrero: (escenarioId: string, rutaId: string, sombrero: CuartelSombrero, texto: string) => void;
  setMetrica: (escenarioId: string, rutaId: string, metrica: CuartelMetrica, luz: CuartelLuz | null) => void;
  setLegal: (escenarioId: string, rutaId: string, legal: CuartelLegal) => void;
  setCertezaRiesgos: (escenarioId: string, rutaId: string, certeza: CuartelCerteza) => void;
  aplicarAnalisis: (escenarioId: string, rutaId: string, analisis: Partial<Pick<CuartelRuta, "sombreros" | "semaforo" | "legal" | "certezaRiesgos">>) => void;

  agregarPregunta: (escenarioId: string, rutaId: string, tipo: CuartelPreguntaTipo, pregunta: string) => string;
  responderPregunta: (escenarioId: string, rutaId: string, turnoId: string, respuesta: string) => void;

  setCierre: (escenarioId: string, campos: Partial<CuartelCierre>) => void;
  setEstado: (escenarioId: string, estado: CuartelEstado) => void;

  hidratarDesdeServidor: (escenarios: CuartelEscenario[]) => void;
}

function mapEscenario(
  escenarios: CuartelEscenario[],
  id: string,
  fn: (e: CuartelEscenario) => CuartelEscenario
): CuartelEscenario[] {
  return escenarios.map((e) => (e.id === id ? { ...fn(e), actualizadoEn: hoyISO() } : e));
}

function mapRuta(
  escenario: CuartelEscenario,
  rutaId: string,
  fn: (r: CuartelRuta) => CuartelRuta
): CuartelEscenario {
  return { ...escenario, rutas: escenario.rutas.map((r) => (r.id === rutaId ? fn(r) : r)) };
}

export const useCuartelStore = create<CuartelState>()(
  persist(
    (set, get) => ({
      escenarios: [],
      seccion: "inicio",
      escenarioAbiertoId: null,
      toast: null,

      setSeccion: (s) => set({ seccion: s, escenarioAbiertoId: s === "escenarios" ? get().escenarioAbiertoId : null }),
      abrirEscenario: (id) => set({ escenarioAbiertoId: id, seccion: id ? "escenarios" : get().seccion }),
      showToast: (t) => {
        set({ toast: t });
        if (t && typeof window !== "undefined") {
          setTimeout(() => {
            if (useCuartelStore.getState().toast === t) set({ toast: null });
          }, 4000);
        }
      },

      // Al crear un escenario nacen las 3 rutas base. No es una comodidad de
      // interfaz: es la regla de "mínimo 3 rutas, siempre" hecha estructura —
      // el escenario no puede existir en una versión binaria.
      crearEscenario: (input) => {
        const id = genId("esc");
        const ahora = hoyISO();
        const escenario: CuartelEscenario = {
          id,
          nombre: input.nombre.trim() || "Escenario sin nombre",
          categoria: input.categoria,
          estado: "activo",
          contextoActual: input.contextoActual,
          patronRepetido: input.patronRepetido,
          certezaPatron: "reportado",
          tensionReal: input.tensionReal,
          fechaLimite: input.fechaLimite,
          rutas: CUARTEL_RUTAS_BASE.map((t) => nuevaRuta(t)),
          cierre: cierreVacio(),
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        set((s) => ({ escenarios: [escenario, ...s.escenarios], escenarioAbiertoId: id, seccion: "escenarios" }));
        return id;
      },

      actualizarEscenario: (id, campos) =>
        set((s) => ({ escenarios: mapEscenario(s.escenarios, id, (e) => ({ ...e, ...campos })) })),

      eliminarEscenario: (id) =>
        set((s) => ({
          escenarios: s.escenarios.filter((e) => e.id !== id),
          escenarioAbiertoId: s.escenarioAbiertoId === id ? null : s.escenarioAbiertoId,
        })),

      agregarRuta: (escenarioId, tipo, nombre = "") => {
        const ruta = { ...nuevaRuta(tipo, "eduardo"), nombre };
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) => ({ ...e, rutas: [...e.rutas, ruta] })),
        }));
        return ruta.id;
      },

      // No hay techo de rutas, pero sí piso: nunca se baja de 3. Borrar la
      // cuarta ruta es limpieza; borrar hasta quedar en dos es volver a la
      // decisión binaria que este sistema existe para impedir.
      eliminarRuta: (escenarioId, rutaId) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            e.rutas.length <= 3 ? e : { ...e, rutas: e.rutas.filter((r) => r.id !== rutaId) }
          ),
        })),

      setSombrero: (escenarioId, rutaId, sombrero, texto) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({
              ...r,
              sombreros: { ...r.sombreros, [sombrero]: texto },
              origen: "eduardo",
            }))
          ),
        })),

      setMetrica: (escenarioId, rutaId, metrica, luz) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({ ...r, semaforo: { ...r.semaforo, [metrica]: luz } }))
          ),
        })),

      setLegal: (escenarioId, rutaId, legal) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) => mapRuta(e, rutaId, (r) => ({ ...r, legal }))),
        })),

      setCertezaRiesgos: (escenarioId, rutaId, certeza) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({ ...r, certezaRiesgos: certeza }))
          ),
        })),

      // El análisis de la IA rellena la ruta pero no toca los turnos de El
      // Instructor ni la validez: ninguna de las dos cosas se puede generar
      // sola. Lo escrito por Eduardo tampoco se pisa — solo se llenan huecos.
      aplicarAnalisis: (escenarioId, rutaId, analisis) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({
              ...r,
              sombreros: analisis.sombreros
                ? Object.fromEntries(
                    Object.entries(r.sombreros).map(([k, v]) => [
                      k,
                      v.trim() ? v : (analisis.sombreros![k as CuartelSombrero] ?? ""),
                    ])
                  ) as CuartelRuta["sombreros"]
                : r.sombreros,
              // Se recorre la lista de métricas en vez de nombrarlas una a una:
              // así, si cambian las cuatro, esto no se queda pisando claves
              // que ya no existen.
              semaforo: analisis.semaforo
                ? (Object.fromEntries(
                    CUARTEL_METRICAS.map((m) => [m, r.semaforo[m] ?? analisis.semaforo![m] ?? null])
                  ) as CuartelRuta["semaforo"])
                : r.semaforo,
              legal: analisis.legal && r.legal.nivel === "no-aplica" && !r.legal.nota ? analisis.legal : r.legal,
              certezaRiesgos: analisis.certezaRiesgos ?? r.certezaRiesgos,
            }))
          ),
        })),

      agregarPregunta: (escenarioId, rutaId, tipo, pregunta) => {
        const turnoId = genId("tur");
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({
              ...r,
              turnos: [...r.turnos, { id: turnoId, tipo, pregunta, respuesta: null, creadoEn: hoyISO() }],
            }))
          ),
        }));
        return turnoId;
      },

      responderPregunta: (escenarioId, rutaId, turnoId, respuesta) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) =>
            mapRuta(e, rutaId, (r) => ({
              ...r,
              turnos: r.turnos.map((t) => (t.id === turnoId ? { ...t, respuesta } : t)),
            }))
          ),
        })),

      setCierre: (escenarioId, campos) =>
        set((s) => ({
          escenarios: mapEscenario(s.escenarios, escenarioId, (e) => ({ ...e, cierre: { ...e.cierre, ...campos } })),
        })),

      setEstado: (escenarioId, estado) =>
        set((s) => ({ escenarios: mapEscenario(s.escenarios, escenarioId, (e) => ({ ...e, estado })) })),

      hidratarDesdeServidor: (escenarios) =>
        set((s) => ({
          escenarios,
          escenarioAbiertoId: escenarios.some((e) => e.id === s.escenarioAbiertoId) ? s.escenarioAbiertoId : null,
        })),
    }),
    {
      name: "cuartel-storage",
      storage: createJSONStorage(() => getPersistStorage()),
      skipHydration: true,
    }
  )
);

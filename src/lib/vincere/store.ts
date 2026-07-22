import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { genId } from "../id";
import { SEED_VINCERE_PROYECTOS, SEED_VINCERE_TRIAGE } from "./seed-data";
import {
  VincereAudienciaSegmento,
  VincereCancion,
  VincereComparacion,
  VincereDecisionEstado,
  VincereDiagnostico,
  VincereFase,
  VincereInsight,
  VincereKpi,
  VincereProyecto,
  VincereProyectoTipo,
  VincereQAEntry,
  VincereResumen,
  VincereSeccion,
  VincereTriageCaso,
  VincereZonaCalor,
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

function comparacionKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

interface VincereState {
  proyectos: VincereProyecto[];
  triageCasos: VincereTriageCaso[];
  comparaciones: Record<string, VincereComparacion>;

  selectedProyectoId: string;
  compareProyectoId: string | null;
  compareOn: boolean;
  seccion: VincereSeccion;
  toast: string | null;

  setSeccion: (s: VincereSeccion) => void;
  selectProyecto: (id: string) => void;
  toggleCompare: () => void;
  setCompareProyectoId: (id: string | null) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;

  addProyecto: (input: { nombre: string; genero: string; fase: VincereFase; tipo: VincereProyectoTipo }) => string;
  updateProyectoMeta: (
    id: string,
    patch: Partial<Pick<VincereProyecto, "nombre" | "genero" | "fase" | "tipo">>
  ) => void;
  deleteProyecto: (id: string) => void;

  updateResumen: (proyectoId: string, patch: Partial<VincereResumen>) => void;
  updateDiagnostico: (proyectoId: string, patch: Partial<VincereDiagnostico>) => void;

  addCancion: (proyectoId: string, cancion: Omit<VincereCancion, "id">) => void;
  updateCancion: (proyectoId: string, cancionId: string, patch: Partial<VincereCancion>) => void;
  deleteCancion: (proyectoId: string, cancionId: string) => void;

  setAudienciaSegmentos: (
    proyectoId: string,
    campo: "edad" | "plataformas" | "paises",
    segmentos: VincereAudienciaSegmento[]
  ) => void;

  addZonaCalor: (proyectoId: string, zona: Omit<VincereZonaCalor, "id">) => void;
  updateZonaCalor: (proyectoId: string, zonaId: string, patch: Partial<VincereZonaCalor>) => void;
  deleteZonaCalor: (proyectoId: string, zonaId: string) => void;

  addDecision: (proyectoId: string, texto: string) => void;
  setDecisionEstado: (proyectoId: string, decisionId: string, estado: VincereDecisionEstado) => void;
  deleteDecision: (proyectoId: string, decisionId: string) => void;

  addKpi: (proyectoId: string, kpi: Omit<VincereKpi, "id">) => void;
  updateKpi: (proyectoId: string, kpiId: string, patch: Partial<VincereKpi>) => void;
  deleteKpi: (proyectoId: string, kpiId: string) => void;

  setInsights: (proyectoId: string, seccion: VincereSeccion, insights: VincereInsight[]) => void;
  addQA: (proyectoId: string, seccion: VincereSeccion, entry: VincereQAEntry) => void;

  setComparacionInsights: (idA: string, idB: string, insights: VincereInsight[]) => void;
  addComparacionQA: (idA: string, idB: string, entry: VincereQAEntry) => void;

  addTriageCaso: (input: { nombre: string; genero: string; fase: string; descripcion: string }) => string;
  updateTriageCasoVeredicto: (
    id: string,
    veredicto: { veredicto: string; prioridad: "Alta" | "Media" | "Baja"; motorRecomendado: string; nivel: 1 | 2 | 3 | 4 }
  ) => void;
  deleteTriageCaso: (id: string) => void;

  resetToSeed: () => void;
}

function mapProyecto(
  proyectos: VincereProyecto[],
  id: string,
  fn: (p: VincereProyecto) => VincereProyecto
): VincereProyecto[] {
  return proyectos.map((p) => (p.id === id ? fn(p) : p));
}

export const useVincereStore = create<VincereState>()(
  persist(
    (set, get) => ({
      proyectos: SEED_VINCERE_PROYECTOS,
      triageCasos: SEED_VINCERE_TRIAGE,
      comparaciones: {},

      selectedProyectoId: "vin-sette",
      compareProyectoId: "vin-luna-rebel",
      compareOn: false,
      seccion: "resumen",
      toast: null,

      setSeccion: (seccion) => set({ seccion, compareOn: false }),
      selectProyecto: (id) => set({ selectedProyectoId: id, compareOn: false }),
      toggleCompare: () => set((s) => ({ compareOn: !s.compareOn })),
      setCompareProyectoId: (id) => set({ compareProyectoId: id }),

      showToast: (msg) => {
        set({ toast: msg });
        setTimeout(() => {
          if (get().toast === msg) set({ toast: null });
        }, 2600);
      },
      clearToast: () => set({ toast: null }),

      addProyecto: (input) => {
        const id = genId("vin");
        const nuevo: VincereProyecto = {
          id,
          nombre: input.nombre,
          genero: input.genero,
          fase: input.fase,
          tipo: input.tipo,
          creadoEn: new Date().toISOString().slice(0, 10),
          resumen: {
            streamsMes: 0,
            streamsCambioPct: 0,
            seguidores: 0,
            seguidoresCambioPct: 0,
            momentumIndex: 0,
            serie: [],
          },
          diagnostico: { faseActual: "", fortalezaNucleo: "", riesgoPrincipal: "", prioridad: "" },
          canciones: [],
          audiencia: { edad: [], plataformas: [], paises: [] },
          zonasCalor: [],
          decisiones: [],
          kpis: [],
          insights: {},
          qaLog: {},
        };
        set((s) => ({ proyectos: [...s.proyectos, nuevo], selectedProyectoId: id, compareOn: false }));
        return id;
      },

      updateProyectoMeta: (id, patch) =>
        set((s) => ({ proyectos: mapProyecto(s.proyectos, id, (p) => ({ ...p, ...patch })) })),

      deleteProyecto: (id) =>
        set((s) => {
          const proyectos = s.proyectos.filter((p) => p.id !== id);
          const selectedProyectoId = s.selectedProyectoId === id ? (proyectos[0]?.id ?? "") : s.selectedProyectoId;
          const compareProyectoId = s.compareProyectoId === id ? null : s.compareProyectoId;
          return { proyectos, selectedProyectoId, compareProyectoId };
        }),

      updateResumen: (proyectoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, resumen: { ...p.resumen, ...patch } })),
        })),

      updateDiagnostico: (proyectoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            diagnostico: { ...p.diagnostico, ...patch },
          })),
        })),

      addCancion: (proyectoId, cancion) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: [...p.canciones, { ...cancion, id: genId("song") }],
          })),
        })),
      updateCancion: (proyectoId, cancionId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.map((c) => (c.id === cancionId ? { ...c, ...patch } : c)),
          })),
        })),
      deleteCancion: (proyectoId, cancionId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.filter((c) => c.id !== cancionId),
          })),
        })),

      setAudienciaSegmentos: (proyectoId, campo, segmentos) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            audiencia: { ...p.audiencia, [campo]: segmentos },
          })),
        })),

      addZonaCalor: (proyectoId, zona) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            zonasCalor: [...p.zonasCalor, { ...zona, id: genId("city") }],
          })),
        })),
      updateZonaCalor: (proyectoId, zonaId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            zonasCalor: p.zonasCalor.map((z) => (z.id === zonaId ? { ...z, ...patch } : z)),
          })),
        })),
      deleteZonaCalor: (proyectoId, zonaId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            zonasCalor: p.zonasCalor.filter((z) => z.id !== zonaId),
          })),
        })),

      addDecision: (proyectoId, texto) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            decisiones: [
              { id: genId("dec"), texto, estado: "Pendiente", creadoEn: new Date().toISOString().slice(0, 10) },
              ...p.decisiones,
            ],
          })),
        })),
      setDecisionEstado: (proyectoId, decisionId, estado) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            decisiones: p.decisiones.map((d) => (d.id === decisionId ? { ...d, estado } : d)),
          })),
        })),
      deleteDecision: (proyectoId, decisionId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            decisiones: p.decisiones.filter((d) => d.id !== decisionId),
          })),
        })),

      addKpi: (proyectoId, kpi) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            kpis: [...p.kpis, { ...kpi, id: genId("kpi") }],
          })),
        })),
      updateKpi: (proyectoId, kpiId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            kpis: p.kpis.map((k) => (k.id === kpiId ? { ...k, ...patch } : k)),
          })),
        })),
      deleteKpi: (proyectoId, kpiId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            kpis: p.kpis.filter((k) => k.id !== kpiId),
          })),
        })),

      setInsights: (proyectoId, seccion, insights) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            insights: { ...p.insights, [seccion]: insights },
          })),
        })),
      addQA: (proyectoId, seccion, entry) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            qaLog: { ...p.qaLog, [seccion]: [...(p.qaLog[seccion] ?? []), entry] },
          })),
        })),

      setComparacionInsights: (idA, idB, insights) =>
        set((s) => {
          const key = comparacionKey(idA, idB);
          const prev = s.comparaciones[key] ?? { insights: [], qaLog: [] };
          return { comparaciones: { ...s.comparaciones, [key]: { ...prev, insights } } };
        }),
      addComparacionQA: (idA, idB, entry) =>
        set((s) => {
          const key = comparacionKey(idA, idB);
          const prev = s.comparaciones[key] ?? { insights: [], qaLog: [] };
          return { comparaciones: { ...s.comparaciones, [key]: { ...prev, qaLog: [...prev.qaLog, entry] } } };
        }),

      addTriageCaso: (input) => {
        const id = genId("triage");
        const nuevo: VincereTriageCaso = {
          id,
          nombre: input.nombre,
          genero: input.genero,
          fase: input.fase,
          descripcion: input.descripcion,
          veredicto: null,
          prioridad: null,
          motorRecomendado: null,
          nivel: null,
          creadoEn: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ triageCasos: [nuevo, ...s.triageCasos] }));
        return id;
      },
      updateTriageCasoVeredicto: (id, veredicto) =>
        set((s) => ({
          triageCasos: s.triageCasos.map((c) => (c.id === id ? { ...c, ...veredicto } : c)),
        })),
      deleteTriageCaso: (id) => set((s) => ({ triageCasos: s.triageCasos.filter((c) => c.id !== id) })),

      resetToSeed: () =>
        set({
          proyectos: SEED_VINCERE_PROYECTOS,
          triageCasos: SEED_VINCERE_TRIAGE,
          comparaciones: {},
          selectedProyectoId: "vin-sette",
          compareProyectoId: "vin-luna-rebel",
          compareOn: false,
          seccion: "resumen",
          toast: null,
        }),
    }),
    {
      name: "vincere-storage",
      storage: createJSONStorage(() => getPersistStorage()),
      skipHydration: true,
    }
  )
);

export { comparacionKey };

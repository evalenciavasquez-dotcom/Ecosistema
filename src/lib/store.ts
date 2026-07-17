import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
import {
  SEED_ACCIONES,
  SEED_AGENDA,
  SEED_BANDEJA,
  SEED_DECISIONES,
  SEED_EVIDENCIAS,
  SEED_MOVIMIENTOS,
  SEED_PERSONAS,
  SEED_PROYECTOS,
} from "./seed-data";
import {
  Accion,
  AccionEstado,
  AgendaEvento,
  BandejaEstado,
  BandejaItem,
  ClasificacionSugerida,
  Decision,
  Evidencia,
  HistorialEntry,
  MovimientoEconomico,
  Persona,
  Proyecto,
  StrategicCase,
} from "./types";
import { classifyText } from "./classifier";
import { genId } from "./id";

interface AppState {
  modoEnfoque: boolean;
  toggleModoEnfoque: () => void;

  pendingAssistantQuery: string | null;
  askAssistant: (query: string) => void;
  clearAssistantQuery: () => void;

  proyectos: Proyecto[];
  personas: Persona[];
  acciones: Accion[];
  decisiones: Decision[];
  movimientos: MovimientoEconomico[];
  evidencias: Evidencia[];
  bandeja: BandejaItem[];
  agenda: AgendaEvento[];
  historial: HistorialEntry[];
  strategicCases: StrategicCase[];

  addStrategicCase: (strategicCase: StrategicCase) => void;

  logHistorial: (entidadTipo: string, entidadId: string, cambio: string, autor?: "usuario" | "ia") => void;

  addBandejaItem: (texto: string) => void;
  setBandejaEstado: (id: string, estado: BandejaEstado) => void;
  reclassifyBandejaItem: (id: string, patch: Partial<ClasificacionSugerida>) => void;
  approveBandejaItem: (id: string) => void;
  discardBandejaItem: (id: string) => void;

  addProyecto: (proyecto: Omit<Proyecto, "id" | "creadoEn">) => string;
  updateProyecto: (id: string, patch: Partial<Proyecto>) => void;
  deleteProyecto: (id: string) => void;

  addAccion: (accion: Omit<Accion, "id" | "creadoEn">) => string;
  updateAccion: (id: string, patch: Partial<Accion>) => void;
  setAccionEstado: (id: string, estado: AccionEstado) => void;
  deleteAccion: (id: string) => void;

  addDecision: (decision: Omit<Decision, "id" | "creadoEn">) => string;
  updateDecision: (id: string, patch: Partial<Decision>) => void;
  resolverDecision: (id: string, decisionFinal: string) => void;

  addMovimiento: (mov: Omit<MovimientoEconomico, "id">) => string;
  updateMovimiento: (id: string, patch: Partial<MovimientoEconomico>) => void;

  addEvidencia: (ev: Omit<Evidencia, "id">) => string;
  updateEvidencia: (id: string, patch: Partial<Evidencia>) => void;

  addPersona: (persona: Omit<Persona, "id">) => string;
  updatePersona: (id: string, patch: Partial<Persona>) => void;

  resetToSeed: () => void;
}

function seedState() {
  return {
    modoEnfoque: false,
    pendingAssistantQuery: null as string | null,
    proyectos: SEED_PROYECTOS,
    personas: SEED_PERSONAS,
    acciones: SEED_ACCIONES,
    decisiones: SEED_DECISIONES,
    movimientos: SEED_MOVIMIENTOS,
    evidencias: SEED_EVIDENCIAS,
    bandeja: SEED_BANDEJA,
    agenda: SEED_AGENDA,
    historial: [] as HistorialEntry[],
    strategicCases: [] as StrategicCase[],
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      toggleModoEnfoque: () => set((state) => ({ modoEnfoque: !state.modoEnfoque })),

      askAssistant: (query) => set({ pendingAssistantQuery: query }),
      clearAssistantQuery: () => set({ pendingAssistantQuery: null }),

      addStrategicCase: (strategicCase) => {
        set((state) => ({
          strategicCases: [
            strategicCase,
            ...state.strategicCases.filter((c) => c.decisionId !== strategicCase.decisionId),
          ],
        }));
        get().logHistorial("decision", strategicCase.decisionId, "Caso estratégico generado por IA", "ia");
      },

      logHistorial: (entidadTipo, entidadId, cambio, autor = "usuario") =>
        set((state) => ({
          historial: [
            {
              id: genId("hist"),
              timestamp: new Date().toISOString(),
              entidadTipo,
              entidadId,
              cambio,
              autor,
            },
            ...state.historial,
          ].slice(0, 500),
        })),

      addBandejaItem: (texto) => {
        const { proyectos, personas } = get();
        const clasificacion = classifyText(texto, proyectos, personas);
        const item: BandejaItem = {
          id: genId("bnd"),
          texto,
          fecha: new Date().toISOString().slice(0, 10),
          estado: "Nuevo",
          clasificacion,
        };
        set((state) => ({ bandeja: [item, ...state.bandeja] }));
        get().logHistorial("bandeja", item.id, "Entrada recibida y clasificada por IA", "ia");
      },

      setBandejaEstado: (id, estado) =>
        set((state) => ({
          bandeja: state.bandeja.map((b) => (b.id === id ? { ...b, estado } : b)),
        })),

      reclassifyBandejaItem: (id, patch) =>
        set((state) => ({
          bandeja: state.bandeja.map((b) =>
            b.id === id ? { ...b, clasificacion: { ...b.clasificacion, ...patch } } : b
          ),
        })),

      approveBandejaItem: (id) => {
        const item = get().bandeja.find((b) => b.id === id);
        if (!item) return;
        const { destino, proyectoId } = item.clasificacion;
        let resultadoLabel = "Registrado";

        switch (destino) {
          case "accion":
            get().addAccion({
              titulo: item.texto,
              resultadoEsperado: "",
              proyectoId,
              responsable: "Eduardo",
              prioridad: "P2",
              estado: "Pendiente",
              fecha: new Date().toISOString().slice(0, 10),
              duracionEstimada: "",
              dependencias: "",
              impactoFinanciero: "",
              evidenciaCierre: "",
            });
            resultadoLabel = "Convertido en acción";
            break;
          case "decision":
            get().addDecision({
              pregunta: item.texto,
              contexto: "",
              proyectoId,
              fechaLimite: "",
              nivelRiesgo: "Medio",
              evidenceLevel: "reportado",
              opciones: [],
              escenarios: [],
              impactoEconomico: "",
              recomendacionSistema: "",
              decisionFinal: "",
              condiciones: [],
              resultadoPosterior: "",
              estado: "Abierta",
            });
            resultadoLabel = "Convertido en decisión";
            break;
          case "economia":
            get().addMovimiento({
              tipo: "ingreso",
              monto: 0,
              moneda: "USD",
              fecha: new Date().toISOString().slice(0, 10),
              proyectoId,
              descripcion: item.texto,
              estado: "sin_conciliar",
              fuente: "Bandeja de entrada",
              cuenta: "Sin clasificar",
            });
            resultadoLabel = "Registrado como movimiento económico";
            break;
          case "evidencia":
            get().addEvidencia({
              tipo: "correo",
              fuente: "Bandeja de entrada",
              fecha: new Date().toISOString().slice(0, 10),
              proyectoId,
              nivelConfiabilidad: "reportado",
              afirmacionRespaldada: item.texto,
              estadoVerificacion: "pendiente",
            });
            resultadoLabel = "Registrado como evidencia";
            break;
          case "evento":
            resultadoLabel = "Registrado en agenda";
            break;
          default:
            resultadoLabel = "Registrado como nota";
        }

        set((state) => ({
          bandeja: state.bandeja.map((b) =>
            b.id === id ? { ...b, estado: "Procesado", resultadoLabel } : b
          ),
        }));
        get().logHistorial("bandeja", id, `Aprobado por el usuario — ${resultadoLabel}`);
      },

      discardBandejaItem: (id) => {
        set((state) => ({
          bandeja: state.bandeja.map((b) => (b.id === id ? { ...b, estado: "Descartado" } : b)),
        }));
        get().logHistorial("bandeja", id, "Descartado por el usuario");
      },

      addProyecto: (proyecto) => {
        const id = genId("proj");
        const nuevo: Proyecto = { ...proyecto, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ proyectos: [nuevo, ...state.proyectos] }));
        get().logHistorial("proyecto", id, `Proyecto "${proyecto.nombre}" creado`);
        return id;
      },
      updateProyecto: (id, patch) => {
        set((state) => ({
          proyectos: state.proyectos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        get().logHistorial("proyecto", id, "Proyecto actualizado");
      },
      deleteProyecto: (id) =>
        set((state) => ({ proyectos: state.proyectos.filter((p) => p.id !== id) })),

      addAccion: (accion) => {
        const id = genId("acc");
        const nueva: Accion = { ...accion, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ acciones: [nueva, ...state.acciones] }));
        get().logHistorial("accion", id, `Acción "${accion.titulo}" creada`);
        return id;
      },
      updateAccion: (id, patch) => {
        set((state) => ({ acciones: state.acciones.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        get().logHistorial("accion", id, "Acción actualizada");
      },
      setAccionEstado: (id, estado) => {
        set((state) => ({ acciones: state.acciones.map((a) => (a.id === id ? { ...a, estado } : a)) }));
        get().logHistorial("accion", id, `Estado cambiado a "${estado}"`);
      },
      deleteAccion: (id) => set((state) => ({ acciones: state.acciones.filter((a) => a.id !== id) })),

      addDecision: (decision) => {
        const id = genId("dec");
        const nueva: Decision = { ...decision, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ decisiones: [nueva, ...state.decisiones] }));
        get().logHistorial("decision", id, "Decisión registrada");
        return id;
      },
      updateDecision: (id, patch) => {
        set((state) => ({ decisiones: state.decisiones.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
        get().logHistorial("decision", id, "Decisión actualizada");
      },
      resolverDecision: (id, decisionFinal) => {
        set((state) => ({
          decisiones: state.decisiones.map((d) =>
            d.id === id ? { ...d, decisionFinal, estado: "Decidida" } : d
          ),
        }));
        get().logHistorial("decision", id, `Decisión final registrada: "${decisionFinal}"`);
      },

      addMovimiento: (mov) => {
        const id = genId("mov");
        const nuevo: MovimientoEconomico = { ...mov, id };
        set((state) => ({ movimientos: [nuevo, ...state.movimientos] }));
        get().logHistorial("economia", id, "Movimiento económico registrado");
        return id;
      },
      updateMovimiento: (id, patch) =>
        set((state) => ({
          movimientos: state.movimientos.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      addEvidencia: (ev) => {
        const id = genId("ev");
        const nueva: Evidencia = { ...ev, id };
        set((state) => ({ evidencias: [nueva, ...state.evidencias] }));
        get().logHistorial("evidencia", id, "Evidencia registrada");
        return id;
      },
      updateEvidencia: (id, patch) =>
        set((state) => ({
          evidencias: state.evidencias.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      addPersona: (persona) => {
        const id = genId("per");
        const nueva: Persona = { ...persona, id };
        set((state) => ({ personas: [nueva, ...state.personas] }));
        return id;
      },
      updatePersona: (id, patch) =>
        set((state) => ({ personas: state.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      resetToSeed: () => set(seedState()),
    }),
    {
      name: "cco-ev-storage",
      storage: createJSONStorage(() => getPersistStorage()),
      skipHydration: true,
    }
  )
);

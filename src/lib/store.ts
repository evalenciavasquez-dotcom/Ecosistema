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
import { genId, pickKeys } from "./id";
import { dbMutate, fetchServerState } from "./db/sync";

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

  logHistorial: (
    entidadTipo: string,
    entidadId: string,
    cambio: string,
    autor?: "usuario" | "ia",
    antes?: Record<string, unknown>,
    despues?: Record<string, unknown>
  ) => void;

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

  hydrateFromServer: () => Promise<void>;
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
        dbMutate("strategicCases", "insert", undefined, strategicCase);
        get().logHistorial("decision", strategicCase.decisionId, "Caso estratégico generado por IA", "ia");
      },

      logHistorial: (entidadTipo, entidadId, cambio, autor = "usuario", antes, despues) => {
        const entry: HistorialEntry = {
          id: genId("hist"),
          timestamp: new Date().toISOString(),
          entidadTipo,
          entidadId,
          cambio,
          autor,
          ...(antes ? { antes } : {}),
          ...(despues ? { despues } : {}),
        };
        set((state) => ({
          historial: [entry, ...state.historial].slice(0, 500),
        }));
        dbMutate("historial", "insert", undefined, entry);
      },

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
        dbMutate("bandeja", "insert", undefined, item);
        get().logHistorial("bandeja", item.id, "Entrada recibida y clasificada por IA", "ia");
      },

      setBandejaEstado: (id, estado) => {
        set((state) => ({
          bandeja: state.bandeja.map((b) => (b.id === id ? { ...b, estado } : b)),
        }));
        dbMutate("bandeja", "update", id, { estado });
      },

      reclassifyBandejaItem: (id, patch) => {
        let merged: ClasificacionSugerida | undefined;
        set((state) => ({
          bandeja: state.bandeja.map((b) => {
            if (b.id !== id) return b;
            merged = { ...b.clasificacion, ...patch };
            return { ...b, clasificacion: merged };
          }),
        }));
        if (merged) dbMutate("bandeja", "update", id, { clasificacion: merged });
      },

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
        dbMutate("bandeja", "update", id, { estado: "Procesado", resultadoLabel });
        get().logHistorial("bandeja", id, `Aprobado por el usuario — ${resultadoLabel}`);
      },

      discardBandejaItem: (id) => {
        set((state) => ({
          bandeja: state.bandeja.map((b) => (b.id === id ? { ...b, estado: "Descartado" } : b)),
        }));
        dbMutate("bandeja", "update", id, { estado: "Descartado" });
        get().logHistorial("bandeja", id, "Descartado por el usuario");
      },

      addProyecto: (proyecto) => {
        const id = genId("proj");
        const nuevo: Proyecto = { ...proyecto, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ proyectos: [nuevo, ...state.proyectos] }));
        dbMutate("proyectos", "insert", undefined, nuevo);
        get().logHistorial("proyecto", id, `Proyecto "${proyecto.nombre}" creado`);
        return id;
      },
      updateProyecto: (id, patch) => {
        const anterior = get().proyectos.find((p) => p.id === id);
        set((state) => ({
          proyectos: state.proyectos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        dbMutate("proyectos", "update", id, patch);
        const keys = Object.keys(patch) as (keyof Proyecto)[];
        get().logHistorial(
          "proyecto",
          id,
          "Proyecto actualizado",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },
      deleteProyecto: (id) => {
        set((state) => ({ proyectos: state.proyectos.filter((p) => p.id !== id) }));
        dbMutate("proyectos", "delete", id);
      },

      addAccion: (accion) => {
        const id = genId("acc");
        const nueva: Accion = { ...accion, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ acciones: [nueva, ...state.acciones] }));
        dbMutate("acciones", "insert", undefined, nueva);
        get().logHistorial("accion", id, `Acción "${accion.titulo}" creada`);
        return id;
      },
      updateAccion: (id, patch) => {
        const anterior = get().acciones.find((a) => a.id === id);
        set((state) => ({ acciones: state.acciones.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        dbMutate("acciones", "update", id, patch);
        const keys = Object.keys(patch) as (keyof Accion)[];
        get().logHistorial(
          "accion",
          id,
          "Acción actualizada",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },
      setAccionEstado: (id, estado) => {
        const anterior = get().acciones.find((a) => a.id === id);
        set((state) => ({ acciones: state.acciones.map((a) => (a.id === id ? { ...a, estado } : a)) }));
        dbMutate("acciones", "update", id, { estado });
        get().logHistorial(
          "accion",
          id,
          `Estado cambiado a "${estado}"`,
          "usuario",
          anterior ? { estado: anterior.estado } : undefined,
          { estado }
        );
      },
      deleteAccion: (id) => {
        set((state) => ({ acciones: state.acciones.filter((a) => a.id !== id) }));
        dbMutate("acciones", "delete", id);
      },

      addDecision: (decision) => {
        const id = genId("dec");
        const nueva: Decision = { ...decision, id, creadoEn: new Date().toISOString().slice(0, 10) };
        set((state) => ({ decisiones: [nueva, ...state.decisiones] }));
        dbMutate("decisiones", "insert", undefined, nueva);
        get().logHistorial("decision", id, "Decisión registrada");
        return id;
      },
      updateDecision: (id, patch) => {
        const anterior = get().decisiones.find((d) => d.id === id);
        set((state) => ({ decisiones: state.decisiones.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
        dbMutate("decisiones", "update", id, patch);
        const keys = Object.keys(patch) as (keyof Decision)[];
        get().logHistorial(
          "decision",
          id,
          "Decisión actualizada",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },
      resolverDecision: (id, decisionFinal) => {
        const anterior = get().decisiones.find((d) => d.id === id);
        set((state) => ({
          decisiones: state.decisiones.map((d) =>
            d.id === id ? { ...d, decisionFinal, estado: "Decidida" } : d
          ),
        }));
        dbMutate("decisiones", "update", id, { decisionFinal, estado: "Decidida" });
        get().logHistorial(
          "decision",
          id,
          `Decisión final registrada: "${decisionFinal}"`,
          "usuario",
          anterior ? { decisionFinal: anterior.decisionFinal, estado: anterior.estado } : undefined,
          { decisionFinal, estado: "Decidida" }
        );
      },

      addMovimiento: (mov) => {
        const id = genId("mov");
        const nuevo: MovimientoEconomico = { ...mov, id };
        set((state) => ({ movimientos: [nuevo, ...state.movimientos] }));
        dbMutate("movimientos", "insert", undefined, nuevo);
        get().logHistorial("economia", id, "Movimiento económico registrado");
        return id;
      },
      updateMovimiento: (id, patch) => {
        const anterior = get().movimientos.find((m) => m.id === id);
        set((state) => ({
          movimientos: state.movimientos.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
        dbMutate("movimientos", "update", id, patch);
        const keys = Object.keys(patch) as (keyof MovimientoEconomico)[];
        get().logHistorial(
          "economia",
          id,
          "Movimiento económico actualizado",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },

      addEvidencia: (ev) => {
        const id = genId("ev");
        const nueva: Evidencia = { ...ev, id };
        set((state) => ({ evidencias: [nueva, ...state.evidencias] }));
        dbMutate("evidencias", "insert", undefined, nueva);
        get().logHistorial("evidencia", id, "Evidencia registrada");
        return id;
      },
      updateEvidencia: (id, patch) => {
        const anterior = get().evidencias.find((e) => e.id === id);
        set((state) => ({
          evidencias: state.evidencias.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        dbMutate("evidencias", "update", id, patch);
        const keys = Object.keys(patch) as (keyof Evidencia)[];
        get().logHistorial(
          "evidencia",
          id,
          "Evidencia actualizada",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },

      addPersona: (persona) => {
        const id = genId("per");
        const nueva: Persona = { ...persona, id };
        set((state) => ({ personas: [nueva, ...state.personas] }));
        dbMutate("personas", "insert", undefined, nueva);
        return id;
      },
      updatePersona: (id, patch) => {
        const anterior = get().personas.find((p) => p.id === id);
        set((state) => ({ personas: state.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        dbMutate("personas", "update", id, patch);
        const keys = Object.keys(patch) as (keyof Persona)[];
        get().logHistorial(
          "persona",
          id,
          "Persona actualizada",
          "usuario",
          anterior ? pickKeys(anterior, keys) : undefined,
          patch
        );
      },

      resetToSeed: () => set(seedState()),

      hydrateFromServer: async () => {
        const server = await fetchServerState();
        if (!server || !server.configured) return;
        const hasData =
          (server.proyectos?.length ?? 0) > 0 ||
          (server.acciones?.length ?? 0) > 0 ||
          (server.decisiones?.length ?? 0) > 0 ||
          (server.movimientos?.length ?? 0) > 0 ||
          (server.evidencias?.length ?? 0) > 0 ||
          (server.bandeja?.length ?? 0) > 0 ||
          (server.personas?.length ?? 0) > 0;
        if (!hasData) return;

        const strategicCasesRaw = (server.strategicCases ?? []) as StrategicCase[];
        const seenDecisionIds = new Set<string>();
        const strategicCasesDeduped = strategicCasesRaw.filter((c) => {
          if (seenDecisionIds.has(c.decisionId)) return false;
          seenDecisionIds.add(c.decisionId);
          return true;
        });

        set({
          proyectos: (server.proyectos ?? []) as Proyecto[],
          personas: (server.personas ?? []) as Persona[],
          acciones: (server.acciones ?? []) as Accion[],
          decisiones: (server.decisiones ?? []) as Decision[],
          movimientos: (server.movimientos ?? []) as MovimientoEconomico[],
          evidencias: (server.evidencias ?? []) as Evidencia[],
          bandeja: (server.bandeja ?? []) as BandejaItem[],
          agenda: (server.agenda ?? []) as AgendaEvento[],
          historial: (server.historial ?? []) as HistorialEntry[],
          strategicCases: strategicCasesDeduped,
        });
      },
    }),
    {
      name: "cco-ev-storage",
      storage: createJSONStorage(() => getPersistStorage()),
      skipHydration: true,
    }
  )
);

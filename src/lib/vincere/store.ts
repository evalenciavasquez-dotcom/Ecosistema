import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { genId } from "../id";
import { SEED_VINCERE_PROYECTOS, SEED_VINCERE_TRIAGE } from "./seed-data";
import { analizarLetra } from "./metrica";
import {
  VincereAlerta,
  VincereAudienciaSegmento,
  VincereAudioAnalisis,
  VincereCancion,
  VincereCancionAnalisis,
  VincereComparacion,
  VincereIngestaPropuesta,
  VincereDecisionEstado,
  VincereDiagnostico,
  VincereFase,
  VincereInforme,
  VincereInsight,
  VincereInvestigacion,
  VincereARDiagnostico,
  VincereCandidato,
  VincereKpi,
  VincereMarca,
  VincereMarcaDiagnostico,
  VincereIngreso,
  VincereMonetizacionDiagnostico,
  VincereOportunidad,
  VincerePitch,
  VincereVinculo,
  VincereVinculoTipo,
  vinculoVacio,
  VincerePuntoContacto,
  VincereSenalPlaza,
  VincereShow,
  VincereTouringDiagnostico,
  VincereProyecto,
  VincereProyectoTipo,
  VincereQAEntry,
  VincereResumen,
  VincereSeccion,
  VincereSnapshot,
  VincereStressTest,
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
  // La consulta de Investigación vive en el store, no en la sección. Así otra
  // pantalla puede dejarla escrita — es lo que cierra la cadena: un servicio
  // externo dice a qué artistas se parece la canción y desde el panel de la
  // canción se salta a investigarlos sin volver a teclearlos. De paso, lo que
  // estabas escribiendo sobrevive si navegas a otro motor y vuelves.
  investigacionConsulta: string;
  setInvestigacionConsulta: (consulta: string) => void;
  abrirInvestigacion: (consulta: string) => void;
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

  updateMarca: (proyectoId: string, patch: Partial<Omit<VincereMarca, "puntosContacto">>) => void;
  addPuntoContacto: (proyectoId: string, punto: Omit<VincerePuntoContacto, "id">) => void;
  updatePuntoContacto: (proyectoId: string, puntoId: string, patch: Partial<VincerePuntoContacto>) => void;
  deletePuntoContacto: (proyectoId: string, puntoId: string) => void;
  setMarcaDiagnostico: (proyectoId: string, diagnostico: VincereMarcaDiagnostico | null) => void;

  addCancion: (proyectoId: string, cancion: Omit<VincereCancion, "id">) => void;
  updateCancion: (proyectoId: string, cancionId: string, patch: Partial<VincereCancion>) => void;
  deleteCancion: (proyectoId: string, cancionId: string) => void;
  setCancionLetra: (proyectoId: string, cancionId: string, letra: string) => void;
  setCancionAnalisis: (proyectoId: string, cancionId: string, analisis: VincereCancionAnalisis) => void;
  setCancionAudio: (proyectoId: string, cancionId: string, audio: VincereAudioAnalisis | null) => void;
  setCancionNotasProduccion: (proyectoId: string, cancionId: string, notas: string) => void;

  setAudienciaSegmentos: (
    proyectoId: string,
    campo: "edad" | "plataformas" | "paises",
    segmentos: VincereAudienciaSegmento[]
  ) => void;

  addZonaCalor: (proyectoId: string, zona: Omit<VincereZonaCalor, "id">) => void;
  updateZonaCalor: (proyectoId: string, zonaId: string, patch: Partial<VincereZonaCalor>) => void;
  deleteZonaCalor: (proyectoId: string, zonaId: string) => void;

  updateVinculo: (proyectoId: string, patch: Partial<VincereVinculo>) => void;

  addIngreso: (proyectoId: string, ingreso: Omit<VincereIngreso, "id">) => void;
  updateIngreso: (proyectoId: string, ingresoId: string, patch: Partial<VincereIngreso>) => void;
  deleteIngreso: (proyectoId: string, ingresoId: string) => void;
  setMonetizacionDiagnostico: (proyectoId: string, d: VincereMonetizacionDiagnostico | null) => void;

  setOportunidad: (proyectoId: string, oportunidad: VincereOportunidad | null) => void;

  addPitch: (proyectoId: string, pitch: VincerePitch) => void;
  deletePitch: (proyectoId: string, pitchId: string) => void;

  addCandidato: (proyectoId: string, candidato: Omit<VincereCandidato, "id" | "creadoEn">) => void;
  updateCandidato: (proyectoId: string, candidatoId: string, patch: Partial<VincereCandidato>) => void;
  deleteCandidato: (proyectoId: string, candidatoId: string) => void;
  setARDiagnostico: (proyectoId: string, diagnostico: VincereARDiagnostico | null) => void;

  addShow: (proyectoId: string, show: Omit<VincereShow, "id">) => void;
  updateShow: (proyectoId: string, showId: string, patch: Partial<VincereShow>) => void;
  deleteShow: (proyectoId: string, showId: string) => void;
  setTouringDiagnostico: (proyectoId: string, diagnostico: VincereTouringDiagnostico | null) => void;

  addDecision: (proyectoId: string, texto: string) => void;
  setDecisionEstado: (proyectoId: string, decisionId: string, estado: VincereDecisionEstado) => void;
  deleteDecision: (proyectoId: string, decisionId: string) => void;

  addKpi: (proyectoId: string, kpi: Omit<VincereKpi, "id">) => void;
  updateKpi: (proyectoId: string, kpiId: string, patch: Partial<VincereKpi>) => void;
  deleteKpi: (proyectoId: string, kpiId: string) => void;

  setInsights: (proyectoId: string, seccion: VincereSeccion, insights: VincereInsight[]) => void;
  addQA: (proyectoId: string, seccion: VincereSeccion, entry: VincereQAEntry) => void;
  setInforme: (proyectoId: string, informe: VincereInforme) => void;
  updateInforme: (proyectoId: string, patch: Partial<VincereInforme>) => void;

  addStressTest: (proyectoId: string, test: VincereStressTest) => void;
  eliminarStressTest: (proyectoId: string, testId: string) => void;

  addInvestigacion: (proyectoId: string, investigacion: VincereInvestigacion) => void;
  eliminarInvestigacion: (proyectoId: string, investigacionId: string) => void;
  aplicarSenalesPlaza: (proyectoId: string, investigacionId: string, senales: VincereSenalPlaza[]) => void;

  capturarSnapshot: (proyectoId: string, etiqueta: string) => void;
  eliminarSnapshot: (proyectoId: string, snapshotId: string) => void;
  restaurarInformeArchivado: (proyectoId: string, generadoEn: string) => void;
  eliminarInformeArchivado: (proyectoId: string, generadoEn: string) => void;

  aplicarIngesta: (proyectoId: string, propuesta: VincereIngestaPropuesta) => void;
  addAlertas: (proyectoId: string, alertas: Omit<VincereAlerta, "id" | "creadoEn">[]) => void;
  descartarAlerta: (proyectoId: string, alertaId: string) => void;
  descartarTodasLasAlertas: (proyectoId: string) => void;

  setComparacionInsights: (idA: string, idB: string, insights: VincereInsight[]) => void;
  addComparacionQA: (idA: string, idB: string, entry: VincereQAEntry) => void;

  addTriageCaso: (input: { nombre: string; genero: string; fase: string; descripcion: string }) => string;
  updateTriageCasoVeredicto: (
    id: string,
    veredicto: {
      veredicto: string;
      prioridad: "Alta" | "Media" | "Baja";
      motorRecomendado: string;
      vinculoSugerido: VincereVinculoTipo;
      comoCobrarlo: string;
      horasSemanalesEstimadas: number | null;
      nivel: 1 | 2 | 3 | 4;
    }
  ) => void;
  deleteTriageCaso: (id: string) => void;

  resetToSeed: () => void;
  hidratarDesdeServidor: (estado: {
    proyectos: VincereProyecto[];
    triageCasos: VincereTriageCaso[];
    comparaciones: Record<string, VincereComparacion>;
  }) => void;
}

function mapProyecto(
  proyectos: VincereProyecto[],
  id: string,
  fn: (p: VincereProyecto) => VincereProyecto
): VincereProyecto[] {
  return proyectos.map((p) => (p.id === id ? fn(p) : p));
}

function marcaVacia(): VincereMarca {
  return {
    posicionamiento: "",
    promesa: "",
    atributos: [],
    territorio: "",
    antipatron: "",
    puntosContacto: [],
    actualizadoEn: new Date().toISOString(),
  };
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
      investigacionConsulta: "",
      setInvestigacionConsulta: (investigacionConsulta) => set({ investigacionConsulta }),
      // No se lanza la búsqueda sola: se deja escrita para revisarla. La
      // búsqueda cuesta y la decide Eduardo.
      abrirInvestigacion: (consulta) =>
        set({ seccion: "investigacion", compareOn: false, investigacionConsulta: consulta }),
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
          // Al borrar el proyecto abierto se cae en otro propio: el selector
          // del encabezado solo lista propios, así que quedarse en una
          // referencia lo dejaría en blanco.
          const siguiente = proyectos.find((p) => p.tipo === "propio") ?? proyectos[0];
          const selectedProyectoId = s.selectedProyectoId === id ? (siguiente?.id ?? "") : s.selectedProyectoId;
          const compareProyectoId = s.compareProyectoId === id ? null : s.compareProyectoId;
          const compareOn = s.compareProyectoId === id ? false : s.compareOn;
          return { proyectos, selectedProyectoId, compareProyectoId, compareOn };
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

      // La marca puede no existir todavía: se crea vacía al primer trazo en
      // vez de exigir un alta previa.
      updateMarca: (proyectoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            marca: { ...marcaVacia(), ...(p.marca ?? {}), ...patch, actualizadoEn: new Date().toISOString() },
          })),
        })),
      addPuntoContacto: (proyectoId, punto) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            const base = p.marca ?? marcaVacia();
            return {
              ...p,
              marca: {
                ...base,
                puntosContacto: [...base.puntosContacto, { ...punto, id: genId("pc") }],
                actualizadoEn: new Date().toISOString(),
              },
            };
          }),
        })),
      updatePuntoContacto: (proyectoId, puntoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            if (!p.marca) return p;
            return {
              ...p,
              marca: {
                ...p.marca,
                puntosContacto: p.marca.puntosContacto.map((pc) => (pc.id === puntoId ? { ...pc, ...patch } : pc)),
                actualizadoEn: new Date().toISOString(),
              },
            };
          }),
        })),
      deletePuntoContacto: (proyectoId, puntoId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            if (!p.marca) return p;
            return {
              ...p,
              marca: {
                ...p.marca,
                puntosContacto: p.marca.puntosContacto.filter((pc) => pc.id !== puntoId),
                actualizadoEn: new Date().toISOString(),
              },
            };
          }),
        })),
      setMarcaDiagnostico: (proyectoId, diagnostico) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, marcaDiagnostico: diagnostico })),
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
      // Al guardar la letra se mide sola: sílabas, rima y estilo son cálculo,
      // no interpretación, así que no tiene sentido pedirlo con un botón
      // aparte ni gastar una llamada a la IA en contarlo.
      setCancionLetra: (proyectoId, cancionId, letra) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.map((c) =>
              c.id === cancionId ? { ...c, letra, metrica: analizarLetra(letra) } : c
            ),
          })),
        })),
      setCancionAudio: (proyectoId, cancionId, audio) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.map((c) => (c.id === cancionId ? { ...c, audio } : c)),
          })),
        })),
      setCancionNotasProduccion: (proyectoId, cancionId, notas) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.map((c) => (c.id === cancionId ? { ...c, notasProduccion: notas } : c)),
          })),
        })),
      setCancionAnalisis: (proyectoId, cancionId, analisis) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            canciones: p.canciones.map((c) => (c.id === cancionId ? { ...c, analisis } : c)),
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

      // Al cambiar de tipo se limpia el campo que deja de aplicar: un cliente
      // con un porcentaje colgando haría que las proyecciones cuenten dinero
      // que no existe.
      updateVinculo: (proyectoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            const base = { ...vinculoVacio(), ...(p.vinculo ?? {}), ...patch };
            if (patch.tipo === "cliente") base.participacionPct = null;
            if (patch.tipo === "propio" || patch.tipo === "socio") base.tarifa = null;
            if (patch.tipo === "ninguno") {
              base.participacionPct = null;
              base.tarifa = null;
              base.horasSemanales = null;
              base.confirmado = false;
            }
            return { ...p, vinculo: { ...base, actualizadoEn: new Date().toISOString() } };
          }),
        })),

      // Del período más reciente al más antiguo: lo de este mes importa más
      // que lo del año pasado.
      addIngreso: (proyectoId, ingreso) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            ingresos: [{ ...ingreso, id: genId("ing") }, ...(p.ingresos ?? [])].sort((a, b) =>
              b.periodo.localeCompare(a.periodo)
            ),
          })),
        })),
      updateIngreso: (proyectoId, ingresoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            ingresos: (p.ingresos ?? [])
              .map((i) => (i.id === ingresoId ? { ...i, ...patch } : i))
              .sort((a, b) => b.periodo.localeCompare(a.periodo)),
          })),
        })),
      deleteIngreso: (proyectoId, ingresoId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            ingresos: (p.ingresos ?? []).filter((i) => i.id !== ingresoId),
          })),
        })),
      setMonetizacionDiagnostico: (proyectoId, d) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, monetizacionDiagnostico: d })),
        })),

      setOportunidad: (proyectoId, oportunidad) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, oportunidad })),
        })),

      // Los pitches se acumulan: uno para el DSP y otro para el sello son
      // documentos distintos que conviven, no versiones del mismo.
      addPitch: (proyectoId, pitch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            pitches: [pitch, ...(p.pitches ?? [])],
          })),
        })),
      deletePitch: (proyectoId, pitchId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            pitches: (p.pitches ?? []).filter((x) => x.id !== pitchId),
          })),
        })),

      addCandidato: (proyectoId, candidato) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            candidatos: [
              { ...candidato, id: genId("cand"), creadoEn: new Date().toISOString().slice(0, 10) },
              ...(p.candidatos ?? []),
            ],
          })),
        })),
      updateCandidato: (proyectoId, candidatoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            candidatos: (p.candidatos ?? []).map((c) => (c.id === candidatoId ? { ...c, ...patch } : c)),
          })),
        })),
      deleteCandidato: (proyectoId, candidatoId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            candidatos: (p.candidatos ?? []).filter((c) => c.id !== candidatoId),
          })),
        })),
      setARDiagnostico: (proyectoId, diagnostico) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, arDiagnostico: diagnostico })),
        })),

      // Los shows se guardan del más reciente al más antiguo: la conversión de
      // hace tres años dice poco, la del mes pasado lo dice todo.
      addShow: (proyectoId, show) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            shows: [{ ...show, id: genId("show") }, ...(p.shows ?? [])].sort((a, b) =>
              b.fecha.localeCompare(a.fecha)
            ),
          })),
        })),
      updateShow: (proyectoId, showId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            shows: (p.shows ?? [])
              .map((sh) => (sh.id === showId ? { ...sh, ...patch } : sh))
              .sort((a, b) => b.fecha.localeCompare(a.fecha)),
          })),
        })),
      deleteShow: (proyectoId, showId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            shows: (p.shows ?? []).filter((sh) => sh.id !== showId),
          })),
        })),
      setTouringDiagnostico: (proyectoId, diagnostico) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, touringDiagnostico: diagnostico })),
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
      // Los planes evaluados se acumulan: sirven de registro de qué se ofreció
      // y con qué criterio se aceptó o se rechazó.
      addStressTest: (proyectoId, test) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            stressTests: [test, ...(p.stressTests ?? [])].slice(0, 20),
          })),
        })),
      eliminarStressTest: (proyectoId, testId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            stressTests: (p.stressTests ?? []).filter((t) => t.id !== testId),
          })),
        })),

      // Las investigaciones se acumulan: lo que se buscó hace dos meses sigue
      // sirviendo de línea base para saber si el mercado se movió.
      addInvestigacion: (proyectoId, investigacion) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            investigaciones: [investigacion, ...(p.investigaciones ?? [])].slice(0, 20),
          })),
        })),
      eliminarInvestigacion: (proyectoId, investigacionId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            investigaciones: (p.investigaciones ?? []).filter((i) => i.id !== investigacionId),
          })),
        })),

      // Traslada al mapa de calor lo que la investigación encontró afuera. Es
      // un paso deliberado y no automático: una señal de la web no tiene el
      // mismo peso que un dato propio de Spotify, y el mapa es de Eduardo.
      aplicarSenalesPlaza: (proyectoId, investigacionId, senales) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            if (!senales.length) return p;
            const porCiudad = new Map(p.zonasCalor.map((z) => [z.ciudad.toLowerCase().trim(), z]));
            const entrantes = senales.map((sn) => {
              const previa = porCiudad.get(sn.ciudad.toLowerCase().trim());
              const calor = Math.max(0, Math.min(100, Math.round(sn.calorSugerido)));
              return previa ? { ...previa, calor } : { id: genId("city"), ciudad: sn.ciudad, calor };
            });
            const ciudadesEntrantes = new Set(entrantes.map((z) => z.ciudad.toLowerCase().trim()));
            return {
              ...p,
              zonasCalor: [
                ...p.zonasCalor.filter((z) => !ciudadesEntrantes.has(z.ciudad.toLowerCase().trim())),
                ...entrantes,
              ],
              investigaciones: (p.investigaciones ?? []).map((i) =>
                i.id === investigacionId ? { ...i, aplicadaEnCalor: true } : i
              ),
            };
          }),
        })),

      // Guarda una foto de los indicadores. Se descarta la del mismo día para
      // que cargar tres veces en una tarde no llene el histórico de ruido:
      // interesa la evolución, no cada pulsación.
      capturarSnapshot: (proyectoId, etiqueta) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            const fecha = new Date().toISOString().slice(0, 10);
            const snapshot: VincereSnapshot = {
              id: genId("snap"),
              fecha,
              etiqueta,
              streamsMes: p.resumen.streamsMes,
              seguidores: p.resumen.seguidores,
              momentumIndex: p.resumen.momentumIndex,
              cancionesTotal: p.canciones.length,
              creadoEn: new Date().toISOString(),
            };
            const previos = (p.historial ?? []).filter((h) => h.fecha !== fecha);
            return { ...p, historial: [...previos, snapshot].slice(-60) };
          }),
        })),

      eliminarSnapshot: (proyectoId, snapshotId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            historial: (p.historial ?? []).filter((h) => h.id !== snapshotId),
          })),
        })),

      restaurarInformeArchivado: (proyectoId, generadoEn) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            const archivado = (p.informesArchivados ?? []).find((i) => i.generadoEn === generadoEn);
            if (!archivado) return p;
            const resto = (p.informesArchivados ?? []).filter((i) => i.generadoEn !== generadoEn);
            return {
              ...p,
              informe: archivado,
              // El que estaba activo no se pierde: pasa al archivo.
              informesArchivados: p.informe ? [p.informe, ...resto] : resto,
            };
          }),
        })),

      eliminarInformeArchivado: (proyectoId, generadoEn) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            informesArchivados: (p.informesArchivados ?? []).filter((i) => i.generadoEn !== generadoEn),
          })),
        })),

      // Emitir un informe nuevo archiva el anterior en vez de borrarlo: si ya
      // lo habías trabajado a mano, ese trabajo sigue recuperable.
      setInforme: (proyectoId, informe) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            informe,
            informesArchivados: p.informe
              ? [p.informe, ...(p.informesArchivados ?? [])].slice(0, 12)
              : (p.informesArchivados ?? []),
          })),
        })),
      // Edición del informe dentro de la plataforma: se trabaja sobre el
      // documento en vez de tener que regenerarlo entero para corregir algo.
      updateInforme: (proyectoId, patch) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) =>
            p.informe
              ? { ...p, informe: { ...p.informe, ...patch, editadoEn: new Date().toISOString() } }
              : p
          ),
        })),

      // Escribe en los motores lo que Eduardo aprobó de una carga. Los bloques
      // ausentes o vacíos no tocan nada: un pantallazo de streams no debe
      // borrar el catálogo ni la audiencia ya cargados.
      aplicarIngesta: (proyectoId, propuesta) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => {
            const next: VincereProyecto = { ...p };

            if (propuesta.resumen && Object.keys(propuesta.resumen).length > 0) {
              next.resumen = { ...p.resumen, ...propuesta.resumen };
            }
            if (propuesta.diagnostico && Object.keys(propuesta.diagnostico).length > 0) {
              next.diagnostico = { ...p.diagnostico, ...propuesta.diagnostico };
            }
            if (propuesta.canciones?.length) {
              // Una canción que ya existe se actualiza; las nuevas se agregan.
              const porNombre = new Map(p.canciones.map((c) => [c.nombre.toLowerCase().trim(), c]));
              const entrantes = propuesta.canciones.map((c) => {
                const previa = porNombre.get(c.nombre.toLowerCase().trim());
                return previa ? { ...previa, ...c, id: previa.id } : { ...c, id: genId("song") };
              });
              const nombresEntrantes = new Set(entrantes.map((c) => c.nombre.toLowerCase().trim()));
              next.canciones = [
                ...p.canciones.filter((c) => !nombresEntrantes.has(c.nombre.toLowerCase().trim())),
                ...entrantes,
              ];
            }
            if (propuesta.audiencia) {
              const a = propuesta.audiencia;
              next.audiencia = {
                edad: a.edad?.length ? a.edad : p.audiencia.edad,
                plataformas: a.plataformas?.length ? a.plataformas : p.audiencia.plataformas,
                paises: a.paises?.length ? a.paises : p.audiencia.paises,
              };
            }
            if (propuesta.zonasCalor?.length) {
              const porCiudad = new Map(p.zonasCalor.map((z) => [z.ciudad.toLowerCase().trim(), z]));
              const entrantes = propuesta.zonasCalor.map((z) => {
                const previa = porCiudad.get(z.ciudad.toLowerCase().trim());
                return previa ? { ...previa, ...z, id: previa.id } : { ...z, id: genId("city") };
              });
              const ciudadesEntrantes = new Set(entrantes.map((z) => z.ciudad.toLowerCase().trim()));
              next.zonasCalor = [
                ...p.zonasCalor.filter((z) => !ciudadesEntrantes.has(z.ciudad.toLowerCase().trim())),
                ...entrantes,
              ];
            }
            if (propuesta.kpis?.length) {
              const porLabel = new Map(p.kpis.map((k) => [k.label.toLowerCase().trim(), k]));
              const entrantes = propuesta.kpis.map((k) => {
                const previa = porLabel.get(k.label.toLowerCase().trim());
                return previa ? { ...previa, ...k, id: previa.id } : { ...k, id: genId("kpi") };
              });
              const labelsEntrantes = new Set(entrantes.map((k) => k.label.toLowerCase().trim()));
              next.kpis = [
                ...p.kpis.filter((k) => !labelsEntrantes.has(k.label.toLowerCase().trim())),
                ...entrantes,
              ];
            }

            return next;
          }),
        })),

      addAlertas: (proyectoId, alertas) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            alertas: [
              ...alertas.map((a) => ({ ...a, id: genId("alt"), creadoEn: new Date().toISOString() })),
              ...(p.alertas ?? []),
            ].slice(0, 40),
          })),
        })),

      descartarAlerta: (proyectoId, alertaId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({
            ...p,
            alertas: (p.alertas ?? []).filter((a) => a.id !== alertaId),
          })),
        })),

      descartarTodasLasAlertas: (proyectoId) =>
        set((s) => ({
          proyectos: mapProyecto(s.proyectos, proyectoId, (p) => ({ ...p, alertas: [] })),
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
          vinculoSugerido: null,
          comoCobrarlo: null,
          horasSemanalesEstimadas: null,
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

      // La base manda cuando tiene contenido: es la copia compartida entre
      // dispositivos. Se conserva la sección abierta para no sacar a Eduardo
      // de donde estaba trabajando cuando termina de cargar.
      hidratarDesdeServidor: (estado) =>
        set((s) => {
          const propio = estado.proyectos.find((p) => p.id === s.selectedProyectoId)
            ? s.selectedProyectoId
            : (estado.proyectos.find((p) => p.tipo === "propio")?.id ?? estado.proyectos[0]?.id ?? "");
          const referencia = estado.proyectos.find((p) => p.id === s.compareProyectoId)
            ? s.compareProyectoId
            : (estado.proyectos.find((p) => p.tipo === "competencia")?.id ?? null);
          return {
            proyectos: estado.proyectos,
            triageCasos: estado.triageCasos,
            comparaciones: estado.comparaciones,
            selectedProyectoId: propio,
            compareProyectoId: referencia,
            compareOn: false,
          };
        }),

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

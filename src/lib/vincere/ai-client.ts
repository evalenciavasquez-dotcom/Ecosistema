import type { EvidenciaDeEntrada } from "./entrada";
import {
  VincereAlerta,
  VincereAlertaSeveridad,
  VincereARDiagnostico,
  VincereVeredictoColab,
  VincereCancion,
  VincereCancionAnalisis,
  VincereInforme,
  VincereIngestaPropuesta,
  VincereIngestaResultado,
  VincereInvestigacion,
  VincereInvestigacionTipo,
  VincereMarcaDiagnostico,
  VincereModalidad,
  VincereMonetizacionDiagnostico,
  VincereNivel,
  VincereOportunidad,
  VincerePitch,
  VincerePitchDestino,
  VincerePotencialCancion,
  VincerePrioridadPaso,
  VincereSeccion,
  VincereStressTest,
  VincereTouringDiagnostico,
  VincereVeredictoPlaza,
  VincereVinculoTipo,
  VINCERE_ESCENARIOS_PLAN,
} from "./types";

function clampNivel(n: unknown): VincereNivel {
  const v = typeof n === "number" ? Math.round(n) : 2;
  return (Math.min(4, Math.max(1, v)) as VincereNivel) || 2;
}

export interface InterpretInsight {
  texto: string;
  nivel: VincereNivel;
}

export async function fetchInterpret(
  titulo: string,
  contexto: unknown,
  instruccion?: string
): Promise<InterpretInsight[]> {
  const res = await fetch("/api/vincere/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, contexto, instruccion }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const body = await res.json();
  const insights = (body?.result?.insights ?? []) as { texto: string; nivel: number }[];
  return insights.map((i) => ({ texto: i.texto, nivel: clampNivel(i.nivel) }));
}

export async function fetchAsk(
  titulo: string,
  contexto: unknown,
  pregunta: string
): Promise<{ respuesta: string; nivel: VincereNivel }> {
  const res = await fetch("/api/vincere/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, contexto, pregunta }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const body = await res.json();
  return { respuesta: body?.result?.respuesta ?? "", nivel: clampNivel(body?.result?.nivel) };
}

export async function fetchTriage(input: {
  nombre: string;
  genero: string;
  fase: string;
  descripcion: string;
  // El material adjunto, igual que en la ingesta.
  data?: string;
  mediaType?: string;
  investigoWeb?: boolean;
  proyectoConMedicion?: boolean;
  proyectoConHistorico?: boolean;
  datosDelProyecto?: unknown;
  investigacion?: unknown;
}): Promise<{
  veredicto: string;
  prioridad: "Alta" | "Media" | "Baja";
  motorRecomendado: string;
  vinculoSugerido: VincereVinculoTipo;
  comoCobrarlo: string;
  horasSemanalesEstimadas: number | null;
  nivel: VincereNivel;
  evidencia: EvidenciaDeEntrada | null;
}> {
  const res = await fetch("/api/vincere/triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const body = await res.json();
  const r = body?.result ?? {};
  const VINCULOS: VincereVinculoTipo[] = ["propio", "socio", "cliente", "evaluando", "ninguno"];
  const horas = typeof r.horasSemanalesEstimadas === "number" ? Math.round(r.horasSemanalesEstimadas) : null;

  // El servidor ya recortó el nivel con el techo que calculó contando el
  // material. Acá solo se sanea el rango: duplicar la regla del techo en dos
  // lados es cómo terminan diciendo cosas distintas.
  const evidencia: EvidenciaDeEntrada | null = body?.evidencia ?? null;

  return {
    veredicto: r.veredicto ?? "",
    prioridad: r.prioridad ?? "Media",
    motorRecomendado: r.motorRecomendado ?? "",
    vinculoSugerido: VINCULOS.includes(r.vinculoSugerido as VincereVinculoTipo)
      ? (r.vinculoSugerido as VincereVinculoTipo)
      : "evaluando",
    comoCobrarlo: r.comoCobrarlo ?? "",
    horasSemanalesEstimadas: horas != null ? Math.min(60, Math.max(0, horas)) : null,
    nivel: clampNivel(r.nivel),
    evidencia,
  };
}

const POTENCIAL_VALIDOS: VincerePotencialCancion[] = ["single", "album", "relleno", "incierto"];

// Análisis profundo de la letra de una canción — devuelve el análisis listo para
// guardar en el store (sin id, con generadoEn puesto por el cliente).
export async function fetchSongAnalysis(input: {
  cancion: Pick<VincereCancion, "nombre" | "streams" | "retencionPct" | "skipPct" | "playlistAdds">;
  letra: string;
  artista: unknown;
  audio?: unknown;
  metrica?: unknown;
  notasProduccion?: string;
}): Promise<Omit<VincereCancionAnalisis, "generadoEn"> & { generadoEn: string }> {
  const res = await fetch("/api/vincere/analyze-song", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const clasificacion = POTENCIAL_VALIDOS.includes(r.clasificacionPotencial)
    ? (r.clasificacionPotencial as VincerePotencialCancion)
    : "incierto";
  return {
    tema: r.tema ?? "",
    arcoEmocional: r.arcoEmocional ?? "",
    gancho: r.gancho ?? "",
    sonido: r.sonido ?? "",
    audiencia: r.audiencia ?? "",
    fitMarca: r.fitMarca ?? "",
    potencial: r.potencial ?? "",
    clasificacionPotencial: clasificacion,
    reescrituras: Array.isArray(r.reescrituras) ? r.reescrituras.filter((x: unknown) => typeof x === "string") : [],
    decision: r.decision ?? "",
    nivel: clampNivel(r.nivel),
    generadoEn: new Date().toISOString(),
  };
}

const SEVERIDADES: VincereAlertaSeveridad[] = ["critica", "atencion", "oportunidad"];
const SECCIONES_ALERTA: VincereSeccion[] = [
  "resumen",
  "diagnostico",
  "song",
  "audiencia",
  "calor",
  "management",
  "kpis",
];

// Limpia los null que devuelve el modelo y descarta bloques vacíos, para que
// el store no escriba campos en blanco encima de data que ya estaba bien.
function limpiarObjeto<T extends object>(obj: unknown): Partial<T> | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return Object.keys(out).length ? (out as Partial<T>) : undefined;
}

function lista<T>(v: unknown): T[] | undefined {
  return Array.isArray(v) && v.length ? (v as T[]) : undefined;
}

// Lee material crudo (imagen, PDF o texto) y devuelve la propuesta de data ya
// repartida por motor, más las alertas que levantó.
export async function fetchIngest(input: {
  data?: string;
  mediaType?: string;
  texto?: string;
  nota?: string;
  artista: unknown;
}): Promise<VincereIngestaResultado> {
  const res = await fetch("/api/vincere/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const p = r.propuesta ?? {};

  const audiencia = p.audiencia
    ? {
        edad: lista<{ label: string; pct: number }>(p.audiencia.edad),
        plataformas: lista<{ label: string; pct: number }>(p.audiencia.plataformas),
        paises: lista<{ label: string; pct: number }>(p.audiencia.paises),
      }
    : undefined;
  const audienciaLimpia =
    audiencia && (audiencia.edad || audiencia.plataformas || audiencia.paises) ? audiencia : undefined;

  const propuesta: VincereIngestaPropuesta = {
    resumen: limpiarObjeto(p.resumen),
    diagnostico: limpiarObjeto(p.diagnostico),
    canciones: lista<Omit<VincereCancion, "id">>(p.canciones),
    audiencia: audienciaLimpia,
    zonasCalor: lista<{ ciudad: string; calor: number }>(p.zonasCalor),
    kpis: lista<{ label: string; actual: number; meta: number; unidad: string; nota: string }>(p.kpis),
  };

  const alertas = (Array.isArray(r.alertas) ? r.alertas : []).map(
    (a: { texto?: string; severidad?: string; seccion?: string; nivel?: number }) => ({
      texto: a.texto ?? "",
      severidad: SEVERIDADES.includes(a.severidad as VincereAlertaSeveridad)
        ? (a.severidad as VincereAlertaSeveridad)
        : "atencion",
      seccion: SECCIONES_ALERTA.includes(a.seccion as VincereSeccion) ? (a.seccion as VincereSeccion) : null,
      nivel: clampNivel(a.nivel),
    })
  );

  return {
    fuente: r.fuente ?? "Material sin identificar",
    lectura: r.lectura ?? "",
    propuesta,
    alertas,
    faltante: Array.isArray(r.faltante) ? r.faltante.filter((x: unknown) => typeof x === "string") : [],
    confianza: clampNivel(r.confianza),
  };
}

const PRIORIDADES: VincerePrioridadPaso[] = ["Alta", "Media", "Baja"];

// Informe final del proyecto — el entregable que cruza todos los motores.
export async function fetchInforme(contexto: unknown): Promise<VincereInforme> {
  const res = await fetch("/api/vincere/informe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contexto, fecha: new Date().toISOString().slice(0, 10) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  return {
    titulo: r.titulo ?? "Informe final",
    sinopsis: r.sinopsis ?? "",
    bloques: arr<{ titulo: string; parrafos: unknown; nivel: number }>(r.bloques).map((b) => ({
      titulo: b.titulo ?? "",
      parrafos: Array.isArray(b.parrafos) ? b.parrafos.filter((p): p is string => typeof p === "string") : [],
      nivel: clampNivel(b.nivel),
    })),
    riesgos: arr<{ riesgo: string; consecuencia: string; nivel: number }>(r.riesgos).map((x) => ({
      riesgo: x.riesgo ?? "",
      consecuencia: x.consecuencia ?? "",
      nivel: clampNivel(x.nivel),
    })),
    oportunidades: arr<{ oportunidad: string; porQue: string; nivel: number }>(r.oportunidades).map((x) => ({
      oportunidad: x.oportunidad ?? "",
      porQue: x.porQue ?? "",
      nivel: clampNivel(x.nivel),
    })),
    proximosPasos: arr<{ accion: string; responsable: string; plazo: string; prioridad: string }>(r.proximosPasos).map(
      (x) => ({
        accion: x.accion ?? "",
        responsable: x.responsable ?? "",
        plazo: x.plazo ?? "",
        prioridad: PRIORIDADES.includes(x.prioridad as VincerePrioridadPaso)
          ? (x.prioridad as VincerePrioridadPaso)
          : "Media",
        hecho: false,
      })
    ),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
    editadoEn: null,
  };
}

const TIPOS_VARIABLE = ["ganadora", "perdedora", "incierta"] as const;
const IMPACTOS = ["alto", "medio", "bajo"] as const;

// Somete un plan de un tercero a prueba contra la realidad del artista.
export async function fetchMonetizacion(input: {
  artista: unknown;
  nota?: string;
}): Promise<VincereMonetizacionDiagnostico> {
  const res = await fetch("/api/vincere/monetizacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const ESFUERZOS = ["bajo", "medio", "alto"] as const;

  return {
    lecturaGeneral: r.lecturaGeneral ?? "",
    brechaAtencionIngreso: r.brechaAtencionIngreso ?? "",
    riesgoDeConcentracion: r.riesgoDeConcentracion ?? "",
    loQueYaFunciona: textos(r.loQueYaFunciona),
    viasSinExplotar: (Array.isArray(r.viasSinExplotar) ? r.viasSinExplotar : []).map(
      (v: { via?: string; porQueEncaja?: string; queHaceFalta?: string; esfuerzo?: string; nivel?: number }) => ({
        via: v.via ?? "",
        porQueEncaja: v.porQueEncaja ?? "",
        queHaceFalta: v.queHaceFalta ?? "",
        esfuerzo: (ESFUERZOS as readonly string[]).includes(v.esfuerzo ?? "")
          ? (v.esfuerzo as "bajo" | "medio" | "alto")
          : "medio",
        nivel: clampNivel(v.nivel),
      })
    ),
    queMoverAhora: textos(r.queMoverAhora),
    lecturaDeLoMio: r.lecturaDeLoMio ?? "",
    queFaltaSaber: textos(r.queFaltaSaber),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchPitch(input: {
  artista: unknown;
  destino: VincerePitchDestino;
  objetivo?: string;
  plaza?: string | null;
}): Promise<Omit<VincerePitch, "id">> {
  const res = await fetch("/api/vincere/pitch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  // El campo de Spotify tiene tope duro de 500 caracteres: se recorta acá para
  // que lo que se muestra sea siempre pegable tal cual.
  const corto = typeof r.pitchCorto === "string" && r.pitchCorto.trim() ? r.pitchCorto.trim() : null;

  const esPromotor = input.destino === "promotor";
  // Un aforo tiene que ser un entero positivo y creíble. Un cero o un número
  // absurdo en un documento que se manda a un empresario es peor que no dar
  // ninguno: se prefiere dejarlo vacío y que Eduardo lo ponga.
  const aforo =
    typeof r.aforoSugerido === "number" && Number.isFinite(r.aforoSugerido) && r.aforoSugerido > 0
      ? Math.round(r.aforoSugerido)
      : null;

  return {
    destino: input.destino,
    plaza: esPromotor ? (input.plaza?.trim() || null) : null,
    objetivo: input.objetivo?.trim() ?? "",
    titular: r.titular ?? "",
    apertura: r.apertura ?? "",
    bloques: (Array.isArray(r.bloques) ? r.bloques : []).map((b: { titulo?: string; contenido?: string }) => ({
      titulo: b.titulo ?? "",
      contenido: b.contenido ?? "",
    })),
    evidencia: (Array.isArray(r.evidencia) ? r.evidencia : []).map(
      (e: { dato?: string; deDondeSale?: string; nivel?: number }) => ({
        dato: e.dato ?? "",
        deDondeSale: e.deDondeSale ?? "",
        nivel: clampNivel(e.nivel),
      })
    ),
    riesgoQueNombramos: r.riesgoQueNombramos ?? "",
    porQueIgualFunciona: r.porQueIgualFunciona ?? "",
    elPedido: r.elPedido ?? "",
    queDamosACambio: r.queDamosACambio ?? "",
    queNoDecir: textos(r.queNoDecir),
    pitchCorto: input.destino === "dsp" && corto ? corto.slice(0, 500) : null,
    etiquetas: input.destino === "dsp" ? textos(r.etiquetas) : [],
    aforoSugerido: esPromotor ? aforo : null,
    porQueEseAforo: esPromotor ? (r.porQueEseAforo ?? null) : null,
    destinatarioSugerido: input.destino === "dsp" ? null : (r.destinatarioSugerido ?? null),
    porQueEseDestinatario: input.destino === "dsp" ? null : (r.porQueEseDestinatario ?? null),
    contactosRelevantes: textos(r.contactosRelevantes),
    siguientePaso: r.siguientePaso ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchOportunidad(input: {
  artista: unknown;
  nota?: string;
}): Promise<VincereOportunidad> {
  const res = await fetch("/api/vincere/oportunidad", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const MODALIDADES: VincereModalidad[] = [
    "management",
    "management-360",
    "por-proyecto",
    "servicios",
    "sociedad",
    "distribucion",
    "solo-asesoria",
  ];

  // Se fuerza el múltiplo de diez acá y no solo en el prompt: el semáforo se
  // deriva del puntaje, y un 63 colado rompería la promesa de la escala.
  const bruto = typeof r.puntaje === "number" ? r.puntaje : 0;
  const puntaje = Math.min(100, Math.max(0, Math.round(bruto / 10) * 10));

  return {
    puntaje,
    porQueEsePuntaje: r.porQueEsePuntaje ?? "",
    loQueLoSube: textos(r.loQueLoSube),
    loQueLoBaja: textos(r.loQueLoBaja),
    vias: (Array.isArray(r.vias) ? r.vias : []).map(
      (v: {
        modalidad?: string;
        comoFunciona?: string;
        participacion?: string;
        queAportamos?: string;
        queEsperamosRecuperar?: string;
        compromisosNuestros?: unknown;
        compromisosDelArtista?: unknown;
        clausulaDeRevision?: string;
        riesgo?: string;
        nivel?: number;
      }) => ({
        modalidad: MODALIDADES.includes(v.modalidad as VincereModalidad)
          ? (v.modalidad as VincereModalidad)
          : "servicios",
        comoFunciona: v.comoFunciona ?? "",
        participacion: v.participacion ?? "",
        queAportamos: v.queAportamos ?? "",
        queEsperamosRecuperar: v.queEsperamosRecuperar ?? "",
        compromisosNuestros: textos(v.compromisosNuestros),
        compromisosDelArtista: textos(v.compromisosDelArtista),
        clausulaDeRevision: v.clausulaDeRevision ?? "",
        riesgo: v.riesgo ?? "",
        nivel: clampNivel(v.nivel),
      })
    ),
    viaRecomendada: r.viaRecomendada ?? "",
    escenarios: (Array.isArray(r.escenarios) ? r.escenarios : []).map(
      (e: {
        nombre?: string;
        queOcurre?: string;
        queSignificaParaNosotros?: string;
        probabilidad?: string;
        nivel?: number;
      }) => ({
        nombre: e.nombre ?? "",
        queOcurre: e.queOcurre ?? "",
        queSignificaParaNosotros: e.queSignificaParaNosotros ?? "",
        probabilidad: e.probabilidad ?? "",
        nivel: clampNivel(e.nivel),
      })
    ),
    serviciosQueOfrecemos: textos(r.serviciosQueOfrecemos),
    porQueNosotros: r.porQueNosotros ?? "",
    costoDeOportunidad: r.costoDeOportunidad ?? "",
    senalesDeAlerta: textos(r.senalesDeAlerta),
    queFaltaSaber: textos(r.queFaltaSaber),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchAR(input: { artista: unknown; nota?: string }): Promise<VincereARDiagnostico> {
  const res = await fetch("/api/vincere/ar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const VEREDICTOS: VincereVeredictoColab[] = ["perseguir", "explorar", "esperar", "descartar"];

  return {
    lecturaGeneral: r.lecturaGeneral ?? "",
    candidatos: (Array.isArray(r.candidatos) ? r.candidatos : []).map(
      (c: {
        nombre?: string;
        veredicto?: string;
        fitMarca?: string;
        solapamiento?: string;
        asimetria?: string;
        queGana?: string;
        queArriesga?: string;
        nivel?: number;
      }) => ({
        nombre: c.nombre ?? "",
        veredicto: VEREDICTOS.includes(c.veredicto as VincereVeredictoColab)
          ? (c.veredicto as VincereVeredictoColab)
          : "explorar",
        fitMarca: c.fitMarca ?? "",
        solapamiento: c.solapamiento ?? "",
        asimetria: c.asimetria ?? "",
        queGana: c.queGana ?? "",
        queArriesga: c.queArriesga ?? "",
        nivel: clampNivel(c.nivel),
      })
    ),
    primeroPerseguir: r.primeroPerseguir ?? "",
    senalesDeAlerta: textos(r.senalesDeAlerta),
    perfilQueFalta: r.perfilQueFalta ?? "",
    queFaltaSaber: textos(r.queFaltaSaber),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchTouring(input: {
  artista: unknown;
  nota?: string;
}): Promise<VincereTouringDiagnostico> {
  const res = await fetch("/api/vincere/touring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const VEREDICTOS: VincereVeredictoPlaza[] = ["ir", "probar", "esperar", "no"];

  return {
    lecturaGeneral: r.lecturaGeneral ?? "",
    listoParaGira: r.listoParaGira === true,
    plazas: (Array.isArray(r.plazas) ? r.plazas : []).map(
      (p: {
        ciudad?: string;
        veredicto?: string;
        tamanoSala?: string;
        lectura?: string;
        senalDeConversion?: string;
        nivel?: number;
      }) => ({
        ciudad: p.ciudad ?? "",
        veredicto: VEREDICTOS.includes(p.veredicto as VincereVeredictoPlaza)
          ? (p.veredicto as VincereVeredictoPlaza)
          : "esperar",
        tamanoSala: p.tamanoSala ?? "",
        lectura: p.lectura ?? "",
        senalDeConversion: p.senalDeConversion ?? "",
        nivel: clampNivel(p.nivel),
      })
    ),
    // Se reordena por si el modelo devuelve los tramos desordenados: la ruta
    // solo significa algo si se lee en orden.
    ruta: (Array.isArray(r.ruta) ? r.ruta : [])
      .map((t: { orden?: number; ciudad?: string; porQueVaAqui?: string }, i: number) => ({
        orden: typeof t.orden === "number" ? t.orden : i + 1,
        ciudad: t.ciudad ?? "",
        porQueVaAqui: t.porQueVaAqui ?? "",
      }))
      .sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden),
    trampas: textos(r.trampas),
    queFaltaSaber: textos(r.queFaltaSaber),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchMarca(input: { artista: unknown; nota?: string }): Promise<VincereMarcaDiagnostico> {
  const res = await fetch("/api/vincere/marca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const puntuacion = typeof r.puntuacionCoherencia === "number" ? Math.round(r.puntuacionCoherencia) : 0;

  return {
    coherencia: r.coherencia ?? "",
    puntuacionCoherencia: Math.min(100, Math.max(0, puntuacion)),
    brechas: (Array.isArray(r.brechas) ? r.brechas : []).map(
      (b: { declarado?: string; recibido?: string; lectura?: string; nivel?: number }) => ({
        declarado: b.declarado ?? "",
        recibido: b.recibido ?? "",
        lectura: b.lectura ?? "",
        nivel: clampNivel(b.nivel),
      })
    ),
    diferenciacion: r.diferenciacion ?? "",
    senalesDeMarca: textos(r.senalesDeMarca),
    riesgos: textos(r.riesgos),
    movimientos: textos(r.movimientos),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    generadoEn: new Date().toISOString(),
  };
}

export async function fetchStressTest(input: {
  data?: string;
  mediaType?: string;
  texto?: string;
  nota?: string;
  artista: unknown;
}): Promise<Omit<VincereStressTest, "id">> {
  const res = await fetch("/api/vincere/stress-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const r = (await res.json())?.result ?? {};
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const escenariosRaw = Array.isArray(r.escenarios) ? r.escenarios : [];
  // Se fuerza el orden canónico: los cinco escenarios siempre se leen igual.
  const escenarios = VINCERE_ESCENARIOS_PLAN.map((nombre) => {
    const e = escenariosRaw.find((x: { nombre?: string }) => x?.nombre === nombre) ?? {};
    return {
      nombre,
      queOcurre: e.queOcurre ?? "",
      quePasaSiSeDa: e.quePasaSiSeDa ?? "",
      probabilidad: e.probabilidad ?? "",
      nivel: clampNivel(e.nivel),
    };
  });

  return {
    titulo: r.titulo ?? "Plan sin título",
    fuente: r.fuente ?? "No identificado",
    resumenPlan: r.resumenPlan ?? "",
    supuestos: textos(r.supuestos),
    variables: (Array.isArray(r.variables) ? r.variables : []).map(
      (v: { variable?: string; lectura?: string; tipo?: string; impacto?: string; nivel?: number }) => ({
        variable: v.variable ?? "",
        lectura: v.lectura ?? "",
        tipo: TIPOS_VARIABLE.includes(v.tipo as (typeof TIPOS_VARIABLE)[number])
          ? (v.tipo as (typeof TIPOS_VARIABLE)[number])
          : "incierta",
        impacto: IMPACTOS.includes(v.impacto as (typeof IMPACTOS)[number])
          ? (v.impacto as (typeof IMPACTOS)[number])
          : "medio",
        nivel: clampNivel(v.nivel),
      })
    ),
    escenarios,
    puntoDeQuiebre: r.puntoDeQuiebre ?? "",
    condiciones: textos(r.condiciones),
    veredicto: r.veredicto ?? "",
    nivelGlobal: clampNivel(r.nivelGlobal),
    creadoEn: new Date().toISOString(),
  };
}

// Investigación web: el sistema sale a buscar afuera y vuelve con hallazgos
// citados. Devuelve también las alertas, que se levantan aparte igual que en
// la ingesta.
export async function fetchResearch(input: {
  tipo: VincereInvestigacionTipo;
  consulta: string;
  artista: unknown;
}): Promise<{
  investigacion: Omit<VincereInvestigacion, "id">;
  alertas: Omit<VincereAlerta, "id" | "creadoEn" | "origen">[];
}> {
  const res = await fetch("/api/vincere/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status}`);
  }
  const body = await res.json();
  const r = body?.result ?? {};

  const fuentes = (Array.isArray(body?.fuentes) ? body.fuentes : []).map(
    (f: { titulo?: string; url?: string; fecha?: string | null }) => ({
      titulo: f.titulo ?? f.url ?? "Fuente sin título",
      url: f.url ?? "",
      fecha: f.fecha ?? null,
    })
  );

  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  // Un número de fuente fuera de rango sería una cita rota en pantalla: se
  // descarta aquí en vez de dejar que el enlace apunte a la nada.
  const referenciasValidas = (v: unknown): number[] =>
    Array.isArray(v)
      ? v
          .filter((n): n is number => typeof n === "number" && Number.isInteger(n))
          .filter((n) => n >= 1 && n <= fuentes.length)
      : [];

  const hallazgos = (Array.isArray(r.hallazgos) ? r.hallazgos : []).map(
    (h: { texto?: string; implicacion?: string; nivel?: number; fuentes?: unknown }) => {
      const refs = referenciasValidas(h.fuentes);
      return {
        texto: h.texto ?? "",
        implicacion: h.implicacion ?? "",
        // Un hallazgo sin fuente es criterio, no evidencia: se le pone techo
        // aunque el modelo se haya entusiasmado con el nivel.
        nivel: refs.length === 0 ? (Math.min(2, clampNivel(h.nivel)) as VincereNivel) : clampNivel(h.nivel),
        fuentes: refs,
      };
    }
  );

  const senalesPlaza = (Array.isArray(r.senalesPlaza) ? r.senalesPlaza : [])
    .map((s: { ciudad?: string; senal?: string; calorSugerido?: number; nivel?: number }) => ({
      ciudad: (s.ciudad ?? "").trim(),
      senal: s.senal ?? "",
      calorSugerido: Math.max(0, Math.min(100, Math.round(Number(s.calorSugerido) || 0))),
      nivel: clampNivel(s.nivel),
    }))
    .filter((s: { ciudad: string }) => s.ciudad.length > 0);

  const sinFuentes = Boolean(body?.sinFuentes) || fuentes.length === 0;

  const alertas = (Array.isArray(r.alertas) ? r.alertas : []).map(
    (a: { texto?: string; severidad?: string; seccion?: string; nivel?: number }) => ({
      texto: a.texto ?? "",
      severidad: SEVERIDADES.includes(a.severidad as VincereAlertaSeveridad)
        ? (a.severidad as VincereAlertaSeveridad)
        : "atencion",
      seccion: SECCIONES_ALERTA.includes(a.seccion as VincereSeccion) ? (a.seccion as VincereSeccion) : null,
      nivel: clampNivel(a.nivel),
    })
  );

  return {
    investigacion: {
      tipo: input.tipo,
      consulta: input.consulta,
      titulo: r.titulo ?? input.consulta,
      resumen: r.resumen ?? "",
      hallazgos,
      senalesPlaza,
      implicacionesCatalogo: textos(r.implicacionesCatalogo),
      preguntasAbiertas: textos(r.preguntasAbiertas),
      fuentes,
      nivelGlobal: sinFuentes
        ? (Math.min(2, clampNivel(r.nivelGlobal)) as VincereNivel)
        : clampNivel(r.nivelGlobal),
      sinFuentes,
      aplicadaEnCalor: false,
      creadoEn: new Date().toISOString(),
    },
    alertas,
  };
}

export type NotionRegisterResult =
  | { status: "ok" }
  | { status: "not_configured" }
  | { status: "error"; error: string };

export async function registerNotion(input: {
  proyecto: string;
  seccion: string;
  titulo: string;
  detalle: string;
}): Promise<NotionRegisterResult> {
  try {
    const res = await fetch("/api/vincere/notion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (body?.configured === false) return { status: "not_configured" };
    if (!res.ok || body?.ok === false) return { status: "error", error: body?.error ?? `Error ${res.status}` };
    return { status: "ok" };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "Error de red" };
  }
}

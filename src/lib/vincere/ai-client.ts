import { VincereCancionAnalisis, VincereCancion, VincereNivel, VincerePotencialCancion } from "./types";

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
}): Promise<{ veredicto: string; prioridad: "Alta" | "Media" | "Baja"; motorRecomendado: string; nivel: VincereNivel }> {
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
  return {
    veredicto: r.veredicto ?? "",
    prioridad: r.prioridad ?? "Media",
    motorRecomendado: r.motorRecomendado ?? "",
    nivel: clampNivel(r.nivel),
  };
}

const POTENCIAL_VALIDOS: VincerePotencialCancion[] = ["single", "album", "relleno", "incierto"];

// Análisis profundo de la letra de una canción — devuelve el análisis listo para
// guardar en el store (sin id, con generadoEn puesto por el cliente).
export async function fetchSongAnalysis(input: {
  cancion: Pick<VincereCancion, "nombre" | "streams" | "retencionPct" | "skipPct" | "playlistAdds">;
  letra: string;
  artista: unknown;
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

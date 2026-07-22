import { VincereNivel } from "./types";

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

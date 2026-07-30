"use client";

import { useVincereStore } from "./store";
import { VincereProyecto, VincereSeccion } from "./types";
import { buildSectionContext, sectionTitle } from "./context";
import { fetchAsk, fetchInterpret } from "./ai-client";
import { genId } from "../id";

// Une una sección con la capa de IA + el store: generar lectura y preguntar,
// persistiendo ambos resultados en el proyecto correspondiente.
export function useSectionAI(proyecto: VincereProyecto, seccion: VincereSeccion) {
  const setInsights = useVincereStore((s) => s.setInsights);
  const addQA = useVincereStore((s) => s.addQA);

  const insights = proyecto.insights[seccion] ?? [];
  const qaLog = proyecto.qaLog[seccion] ?? [];

  async function generate() {
    const contexto = buildSectionContext(proyecto, seccion);
    const result = await fetchInterpret(sectionTitle(seccion), contexto);
    setInsights(
      proyecto.id,
      seccion,
      result.map((r) => ({ id: genId("ins"), texto: r.texto, nivel: r.nivel }))
    );
  }

  async function ask(pregunta: string) {
    const contexto = buildSectionContext(proyecto, seccion);
    const { respuesta, nivel } = await fetchAsk(sectionTitle(seccion), contexto, pregunta);
    addQA(proyecto.id, seccion, {
      id: genId("qa"),
      pregunta,
      respuesta,
      nivel,
      creadoEn: new Date().toISOString(),
    });
  }

  return { insights, qaLog, generate, ask };
}

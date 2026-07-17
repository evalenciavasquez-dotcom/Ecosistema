import {
  Accion,
  AgendaEvento,
  Decision,
  Evidencia,
  HistorialEntry,
  Insight,
  MovimientoEconomico,
  Persona,
  Proyecto,
} from "./types";

export function daysBetween(dateStr: string, ref: Date = new Date()): number {
  const d = new Date(dateStr);
  const diffMs = ref.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function proyectoNombre(proyectos: Proyecto[], id: string | null): string {
  if (!id) return "Sin proyecto";
  return proyectos.find((p) => p.id === id)?.nombre ?? "Sin proyecto";
}

export function selectPersonasEsperando(personas: Persona[]): Persona[] {
  return personas
    .filter((p) => (p.diasSinResponder ?? 0) > 0)
    .sort((a, b) => (b.diasSinResponder ?? 0) - (a.diasSinResponder ?? 0));
}

export function selectProximoCompromiso(agenda: AgendaEvento[], ref: Date = new Date()): AgendaEvento | null {
  const upcoming = agenda
    .filter((e) => new Date(`${e.fecha}T${e.hora || "00:00"}`).getTime() >= ref.setHours(0, 0, 0, 0))
    .sort(
      (a, b) =>
        new Date(`${a.fecha}T${a.hora || "00:00"}`).getTime() -
        new Date(`${b.fecha}T${b.hora || "00:00"}`).getTime()
    );
  return upcoming[0] ?? null;
}

export function selectEconomiaNueva(movimientos: MovimientoEconomico[], windowDays = 10) {
  const now = new Date();
  const recientes = movimientos.filter(
    (m) => m.tipo === "ingreso" && m.estado === "confirmado" && daysBetween(m.fecha, now) <= windowDays && daysBetween(m.fecha, now) >= 0
  );
  const total = recientes.reduce((sum, m) => sum + m.monto, 0);
  return { total, movimientos: recientes };
}

export function selectPrioridadDelDia(acciones: Accion[]): Accion[] {
  const abiertas = acciones.filter((a) => a.estado !== "Completada" && a.estado !== "Cancelada");
  const orden = { P1: 0, P2: 1, P3: 2 } as const;
  const sorted = [...abiertas].sort((a, b) => {
    const p = orden[a.prioridad] - orden[b.prioridad];
    if (p !== 0) return p;
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });
  return sorted.slice(0, 3);
}

export function selectInsights(
  proyectos: Proyecto[],
  personas: Persona[],
  decisiones: Decision[]
): Insight[] {
  const insights: Insight[] = [];

  decisiones
    .filter((d) => d.estado === "Abierta" && d.nivelRiesgo === "Alto" && d.recomendacionSistema)
    .forEach((d) => {
      insights.push({
        id: `insight-dec-${d.id}`,
        texto: `Antes de decidir sobre "${d.pregunta}", ${d.recomendacionSistema.toLowerCase()}.`,
        evidenceLevel: d.evidenceLevel,
        etiqueta: proyectoNombre(proyectos, d.proyectoId),
      });
    });

  selectPersonasEsperando(personas)
    .filter((p) => (p.diasSinResponder ?? 0) >= 5)
    .forEach((p) => {
      insights.push({
        id: `insight-per-${p.id}`,
        texto: `${p.nombre.split(" ")[0]} lleva ${p.diasSinResponder} días sin responder — considera escalar o pausar.`,
        evidenceLevel: "reportado",
        etiqueta: p.empresaProyecto,
      });
    });

  proyectos
    .filter((p) => p.estado === "Activo" && p.evidenceLevel === "verificado" && p.oportunidades.length > 0)
    .forEach((p) => {
      insights.push({
        id: `insight-proj-${p.id}`,
        texto: `${p.nombre} tiene condiciones favorables para ${p.oportunidades[0].toLowerCase()} — puedes avanzar.`,
        evidenceLevel: "verificado",
        etiqueta: p.nombre,
      });
    });

  proyectos
    .filter((p) => p.riesgos.length > 0 && p.estado !== "Cerrado" && p.estado !== "Descartado")
    .forEach((p) => {
      insights.push({
        id: `insight-risk-${p.id}`,
        texto: `${p.nombre}: ${p.riesgos[0]}`,
        evidenceLevel: p.evidenceLevel,
        etiqueta: p.nombre,
      });
    });

  return insights.slice(0, 8);
}

export function buildAnalysisContext(
  decision: Decision,
  proyectos: Proyecto[],
  personas: Persona[],
  movimientos: MovimientoEconomico[],
  evidencias: Evidencia[],
  historial: HistorialEntry[],
  decisiones: Decision[]
) {
  const proyecto = proyectos.find((p) => p.id === decision.proyectoId) ?? null;
  const personasRelacionadas = proyecto
    ? personas.filter((p) => p.proyectoIds.includes(proyecto.id))
    : [];
  const movimientosRelacionados = decision.proyectoId
    ? movimientos.filter((m) => m.proyectoId === decision.proyectoId)
    : [];
  const evidenciasRelacionadas = decision.proyectoId
    ? evidencias.filter((e) => e.proyectoId === decision.proyectoId)
    : [];
  const historialRelacionado = historial
    .filter((h) => h.entidadId === decision.proyectoId || h.entidadId === decision.id)
    .slice(0, 30);
  const otrasDecisiones = decisiones.filter(
    (d) => d.id !== decision.id && d.proyectoId === decision.proyectoId
  );

  return {
    decision: {
      pregunta: decision.pregunta,
      contexto: decision.contexto,
      fechaLimite: decision.fechaLimite,
      nivelRiesgo: decision.nivelRiesgo,
    },
    proyecto,
    personas: personasRelacionadas,
    movimientos: movimientosRelacionados,
    evidencias: evidenciasRelacionadas,
    historial: historialRelacionado,
    otrasDecisiones,
  };
}

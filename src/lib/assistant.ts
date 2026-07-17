import { Accion, Decision, EvidenceLevel, Persona, Proyecto } from "./types";
import { proyectoNombre, selectPrioridadDelDia } from "./selectors";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export interface AssistantAnswer {
  texto: string;
  evidenceLevel: EvidenceLevel;
  etiqueta: string;
}

export function answerQuery(
  query: string,
  data: { proyectos: Proyecto[]; personas: Persona[]; decisiones: Decision[]; acciones: Accion[] }
): AssistantAnswer {
  const q = normalize(query);
  const { proyectos, personas, decisiones, acciones } = data;

  const proyecto = proyectos.find((p) => q.includes(normalize(p.nombre)));
  if (proyecto) {
    const riesgos = proyecto.riesgos.length ? proyecto.riesgos.join("; ") : "sin riesgos reportados";
    return {
      texto: `${proyecto.nombre} está "${proyecto.estado}". Próximo hito: ${proyecto.proximoHito}. Riesgos: ${riesgos}. Recomendación: ${proyecto.proximaAccionRecomendada}.`,
      evidenceLevel: proyecto.evidenceLevel,
      etiqueta: proyecto.nombre,
    };
  }

  const persona = personas.find((p) => q.includes(normalize(p.nombre.split(" ")[0])));
  if (persona) {
    const espera = persona.diasSinResponder
      ? `Lleva ${persona.diasSinResponder} días sin responder.`
      : `Último contacto: ${persona.ultimoContacto}.`;
    return {
      texto: `${persona.nombre} (${persona.rol}, ${persona.empresaProyecto}). ${espera} ${persona.conversacionesPendientes}`,
      evidenceLevel: "reportado",
      etiqueta: persona.empresaProyecto,
    };
  }

  if (/(decision|decidir|firmar)/.test(q)) {
    const decision = decisiones.find((d) => d.estado === "Abierta");
    if (decision) {
      return {
        texto: `${decision.pregunta} — Riesgo ${decision.nivelRiesgo}. Recomendación: ${decision.recomendacionSistema}.`,
        evidenceLevel: decision.evidenceLevel,
        etiqueta: proyectoNombre(proyectos, decision.proyectoId),
      };
    }
  }

  if (/(que hago|qué hago|hoy|prioridad|siguiente accion|siguiente acción)/.test(q)) {
    const prioridades = selectPrioridadDelDia(acciones);
    if (prioridades.length === 0) {
      return {
        texto: "No hay acciones abiertas registradas — la bandeja está al día.",
        evidenceLevel: "verificado",
        etiqueta: "Sistema",
      };
    }
    const texto = prioridades
      .map((a) => `${a.titulo} (${proyectoNombre(proyectos, a.proyectoId)}, ${a.fecha})`)
      .join(" · ");
    return {
      texto: `Tu prioridad ahora: ${texto}.`,
      evidenceLevel: "verificado",
      etiqueta: "Prioridad del día",
    };
  }

  if (/(riesgo|alerta|peligro)/.test(q)) {
    const riesgosProyectos = proyectos.filter((p) => p.riesgos.length > 0);
    if (riesgosProyectos.length === 0) {
      return { texto: "No hay riesgos abiertos registrados en este momento.", evidenceLevel: "verificado", etiqueta: "Sistema" };
    }
    const p = riesgosProyectos[0];
    return {
      texto: `El riesgo más relevante ahora: ${p.nombre} — ${p.riesgos[0]}`,
      evidenceLevel: p.evidenceLevel,
      etiqueta: p.nombre,
    };
  }

  return {
    texto:
      "No tengo evidencia suficiente sobre eso todavía. Regístralo en la Bandeja de entrada para que el sistema lo analice y lo vincule al proyecto correcto.",
    evidenceLevel: "interpretacion",
    etiqueta: "Sistema",
  };
}

import { BandejaDestino, ClasificacionSugerida, Persona, Proyecto } from "./types";

const KEYWORDS: Record<BandejaDestino, string[]> = {
  economia: [
    "pago", "pagué", "pague", "cobr", "factura", "transferencia", "deposito",
    "depósito", "gasto", "ingreso", "monto", "cuenta", "saldo", "$", "usd",
  ],
  decision: [
    "firmar", "decidir", "debería", "deberia", "aceptar", "renegociar",
    "riesgo", "aprobar", "conviene", "firmo", "negoci",
  ],
  evidencia: [
    "contrato", "comprobante", "correo", "term sheet", "documento", "adjunto",
    "captura", "certificado", "informe", "propuesta", "nda",
  ],
  evento: [
    "reunión", "reunion", "cita", "agenda", "llamada", "a las", "hoy a", "mañana a",
  ],
  accion: [
    "enviar", "revisar", "llamar", "seguimiento", "confirmar", "preparar", "coordinar",
  ],
  registro: [],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function classifyText(
  text: string,
  proyectos: Proyecto[],
  personas: Persona[]
): ClasificacionSugerida {
  const normalized = normalize(text);

  let bestDestino: BandejaDestino = "registro";
  let bestScore = 0;
  let bestKeyword = "";

  (Object.keys(KEYWORDS) as BandejaDestino[]).forEach((destino) => {
    for (const kw of KEYWORDS[destino]) {
      if (normalized.includes(normalize(kw))) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          bestDestino = destino;
          bestKeyword = kw;
        }
      }
    }
  });

  let proyectoId: string | null = null;
  for (const proyecto of proyectos) {
    if (normalized.includes(normalize(proyecto.nombre))) {
      proyectoId = proyecto.id;
      break;
    }
  }
  if (!proyectoId) {
    for (const persona of personas) {
      const [firstName] = persona.nombre.split(" ");
      if (normalized.includes(normalize(persona.nombre)) || normalized.includes(normalize(firstName))) {
        proyectoId = persona.proyectoIds[0] ?? null;
        break;
      }
    }
  }

  const confianza = Math.min(0.95, 0.4 + (bestScore > 0 ? 0.25 : 0) + (proyectoId ? 0.2 : 0));

  const destinoTexto: Record<BandejaDestino, string> = {
    accion: "Posible tarea a ejecutar",
    decision: "Posible decisión estratégica pendiente",
    economia: "Posible movimiento económico",
    evidencia: "Posible evidencia o documento de respaldo",
    evento: "Posible evento o compromiso de agenda",
    registro: "Registro informativo sin acción inmediata clara",
  };

  const razon = bestKeyword
    ? `${destinoTexto[bestDestino]} — coincide con "${bestKeyword}"`
    : `${destinoTexto[bestDestino]} — sin señales fuertes, revisión manual recomendada`;

  return { destino: bestDestino, proyectoId, confianza, razon };
}

import { BandejaDestino, ClasificacionSugerida, MovimientoTipo, Persona, Proyecto } from "./types";

const KEYWORDS: Record<BandejaDestino, string[]> = {
  economia: [
    "pago", "pagué", "pague", "cobr", "factura", "transferencia", "deposito",
    "depósito", "gasto", "ingreso", "entraron", "entro", "entró", "monto", "cuenta", "saldo", "$", "usd",
    "dolares", "dólares", "pesos", "plata",
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

// Extrae un monto en texto libre, ej. "60.000 dolares", "$1.000", "1000 pesos".
// Solo cubre casos claros, es un respaldo instantaneo mientras responde la IA real.
function extractMonto(text: string): number | null {
  const match = text.match(/\$?\s?(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{2}))?/);
  if (!match) return null;
  const entero = match[1].replace(/[.,]/g, "");
  const decimales = match[2] ?? "";
  const num = Number(decimales ? `${entero}.${decimales}` : entero);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractMoneda(normalized: string): string | null {
  if (/\busd\b|dolar/.test(normalized)) return "USD";
  if (/\bcop\b|peso/.test(normalized)) return "COP";
  if (normalized.includes("$")) return "USD";
  return null;
}

function extractCuenta(normalized: string): string | null {
  if (/cuenta de banco|cuenta bancaria|transferencia/.test(normalized)) return "Cuenta bancaria";
  if (/efectivo|cash/.test(normalized)) return "Efectivo";
  if (/tarjeta/.test(normalized)) return "Tarjeta";
  return null;
}

function extractTipoMovimiento(normalized: string): MovimientoTipo | null {
  if (/ingres|entr[oa]ron|cobr|recib[ií]|deposit/.test(normalized)) return "ingreso";
  if (/gast|pagu|pague|sali[oó]|factura a pagar/.test(normalized)) return "gasto";
  return null;
}

function extractHora(normalized: string): string | null {
  const match = normalized.match(/\ba las?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) return null;
  let hora = Number(match[1]);
  const minutos = match[2] ?? "00";
  if (match[3] === "pm" && hora < 12) hora += 12;
  if (match[3] === "am" && hora === 12) hora = 0;
  return `${String(hora).padStart(2, "0")}:${minutos}`;
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

  const base: ClasificacionSugerida = { destino: bestDestino, proyectoId, confianza, razon };

  if (base.destino === "economia") {
    base.monto = extractMonto(text);
    base.moneda = extractMoneda(normalized);
    base.cuenta = extractCuenta(normalized);
    base.tipoMovimiento = extractTipoMovimiento(normalized);
  } else if (base.destino === "evento") {
    base.horaEvento = extractHora(normalized);
  }

  return base;
}

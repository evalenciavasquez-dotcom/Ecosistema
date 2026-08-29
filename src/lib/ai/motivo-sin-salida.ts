// Por qué una llamada al modelo no dejó una salida utilizable.
//
// Sin esto, cuando la respuesta se corta por longitud el código cae en el
// mensaje genérico de "el modelo no devolvió el formato esperado" — y eso
// manda a Eduardo a reintentar algo que va a fallar exactamente igual, porque
// el problema nunca fue el formato: fue que la respuesta no cabía. VINCERE ya
// se comió esa confusión (la lectura se cortaba por largo y el sistema decía
// que el material no servía); acá el mensaje dice la verdad y, cuando es un
// corte por longitud, dice también qué hacer.

export type MotivoSinSalida = "truncado" | "rechazado" | "formato";

export interface DiagnosticoSalida {
  motivo: MotivoSinSalida;
  mensaje: string;
}

// `stopReason` viene de la respuesta del modelo. `queSeAnalizaba` es una
// frase corta en minúscula que se incrusta en el mensaje ("el análisis",
// "el cierre mensual") para que el error diga de qué habla.
export function diagnosticarSalida(
  stopReason: string | null | undefined,
  queSeAnalizaba: string
): DiagnosticoSalida | null {
  if (stopReason === "max_tokens") {
    return {
      motivo: "truncado",
      mensaje: `${capitalizar(queSeAnalizaba)} se cortó por longitud: la respuesta era más larga de lo que cabe en una sola pasada. No es que el material no sirva — reintentarlo tal cual va a dar el mismo resultado. Reduce el caso a lo esencial (menos contexto, menos ítems) y vuelve a intentar.`,
    };
  }
  if (stopReason === "refusal") {
    return {
      motivo: "rechazado",
      mensaje: `El sistema no pudo generar ${queSeAnalizaba} para este caso.`,
    };
  }
  return null;
}

// Cuando no hubo salida estructurada y el stop_reason no explica nada, al
// menos se distingue el corte por longitud del formato roto de verdad.
export function mensajeSinSalidaEstructurada(
  stopReason: string | null | undefined,
  queSeAnalizaba: string
): string {
  const diagnostico = diagnosticarSalida(stopReason, queSeAnalizaba);
  if (diagnostico) return diagnostico.mensaje;
  return `El modelo no devolvió ${queSeAnalizaba} con el formato esperado. Intenta de nuevo.`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

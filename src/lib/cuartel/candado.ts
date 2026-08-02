// El candado — la regla de descarte automático.
//
// Vive en un archivo propio, separado del store y de la interfaz, porque es la
// mecánica no negociable del producto: si la ruta "Sostener" tiene 2 de 4
// métricas en rojo, se descarta sola. No se negocia caso por caso y no hay
// forma de editar la validez a mano — se calcula acá y en ningún otro lugar.

import {
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CUARTEL_TIPOS_QUE_HABILITAN,
  CuartelEscenario,
  CuartelRuta,
  CuartelVeredicto,
} from "./types";

export const CANDADO_ROJOS_MINIMOS = 2;

export function contarRojos(ruta: CuartelRuta): number {
  return CUARTEL_METRICAS.filter((m) => ruta.semaforo[m] === "rojo").length;
}

export function metricasSinEvaluar(ruta: CuartelRuta): string[] {
  return CUARTEL_METRICAS.filter((m) => ruta.semaforo[m] === null).map((m) => CUARTEL_METRICA_META[m].label);
}

export function sombrerosSinLlenar(ruta: CuartelRuta): string[] {
  return CUARTEL_SOMBREROS.filter((s) => !ruta.sombreros[s].trim()).map((s) => CUARTEL_SOMBRERO_META[s].label);
}

// La regla de El Instructor: hace falta al menos una pregunta de Contraste o
// Confrontación YA RESPONDIDA. Una pregunta hecha y no contestada no cuenta —
// si contara, bastaría con generar preguntas y mirarlas para desbloquear la
// validez, que es exactamente lo que la regla existe para impedir.
export function instructorCumplido(ruta: CuartelRuta): boolean {
  return ruta.turnos.some(
    (t) => CUARTEL_TIPOS_QUE_HABILITAN.includes(t.tipo) && !!t.respuesta && t.respuesta.trim().length > 0
  );
}

// El veredicto completo de una ruta. Devuelve también qué falta, porque
// "pendiente" sin explicación es una forma cómoda de no decidir nunca.
export function calcularVeredicto(ruta: CuartelRuta): CuartelVeredicto {
  const rojos = contarRojos(ruta);
  const faltantes: string[] = [];

  const sinSombrero = sombrerosSinLlenar(ruta);
  if (sinSombrero.length) faltantes.push(`Sombreros sin llenar: ${sinSombrero.join(", ")}`);

  const sinMetrica = metricasSinEvaluar(ruta);
  if (sinMetrica.length) faltantes.push(`Métricas sin evaluar: ${sinMetrica.join(", ")}`);

  if (!instructorCumplido(ruta)) {
    faltantes.push("El Instructor todavía no puso esta ruta a prueba (falta una pregunta de Contraste o Confrontación respondida)");
  }

  // El candado corre ANTES que los faltantes: una ruta "Sostener" con dos
  // métricas en rojo ya está descartada aunque falte llenar un sombrero. Al
  // revés, un análisis incompleto serviría de refugio para no aplicarlo.
  if (ruta.tipo === "sostener" && rojos >= CANDADO_ROJOS_MINIMOS) {
    return {
      validez: "descartada",
      motivo: `Candado aplicado: ${rojos} de 4 métricas en rojo sobre una ruta de sostener. El patrón de riesgo ya está identificado — esta ruta no compite.`,
      rojos,
      faltantes: [],
    };
  }

  if (faltantes.length) {
    return {
      validez: "pendiente",
      motivo: "Análisis incompleto: la validez no se calcula sobre una ruta a medio revisar.",
      rojos,
      faltantes,
    };
  }

  return {
    validez: "valida",
    motivo:
      rojos > 0
        ? `Ruta válida con ${rojos} métrica${rojos === 1 ? "" : "s"} en rojo — entra a la comparación, con ese costo a la vista.`
        : "Ruta válida: análisis completo, puesta a prueba y sin rojos en el semáforo.",
    rojos,
    faltantes: [],
  };
}

export function veredictosDe(escenario: CuartelEscenario): Record<string, CuartelVeredicto> {
  const out: Record<string, CuartelVeredicto> = {};
  for (const ruta of escenario.rutas) out[ruta.id] = calcularVeredicto(ruta);
  return out;
}

export interface CuartelResumenEscenario {
  validas: number;
  pendientes: number;
  descartadas: number;
  // Un escenario está listo para comparar cuando quedan al menos dos rutas
  // válidas: comparar una sola ruta con nada no es comparar.
  listoParaComparar: boolean;
  diasParaLimite: number | null;
}

export function resumirEscenario(escenario: CuartelEscenario, hoy = new Date()): CuartelResumenEscenario {
  const veredictos = Object.values(veredictosDe(escenario));
  const validas = veredictos.filter((v) => v.validez === "valida").length;

  return {
    validas,
    pendientes: veredictos.filter((v) => v.validez === "pendiente").length,
    descartadas: veredictos.filter((v) => v.validez === "descartada").length,
    listoParaComparar: validas >= 2,
    diasParaLimite: diasHasta(escenario.fechaLimite, hoy),
  };
}

// Días desde hoy hasta la fecha límite. Negativo si ya pasó, null si no hay
// fecha. Se compara a medianoche local para que "hoy" sea 0 y no -1 por horas.
export function diasHasta(fecha: string, hoy = new Date()): number | null {
  if (!fecha) return null;
  const objetivo = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(objetivo.getTime())) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((objetivo.getTime() - base.getTime()) / 86_400_000);
}

// Escenarios estancados: activos hace más de 30 días sin decisión. Es una de
// las métricas de éxito del sistema — y la que más incomoda, por eso se
// muestra en Inicio y no escondida en un reporte.
export function diasEstancado(escenario: CuartelEscenario, hoy = new Date()): number | null {
  if (escenario.estado !== "activo" && escenario.estado !== "analisis") return null;
  const creado = new Date(escenario.creadoEn);
  if (Number.isNaN(creado.getTime())) return null;
  return Math.floor((hoy.getTime() - creado.getTime()) / 86_400_000);
}

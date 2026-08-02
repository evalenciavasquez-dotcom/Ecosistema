import { AnalisisResponse, InstructorResponse, RecomendacionResponse } from "./schema";
import { calcularVeredicto } from "./candado";
import {
  CUARTEL_CATEGORIA_LABEL,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_RUTA_LABEL,
  CuartelEscenario,
  CuartelRuta,
} from "./types";

// Contexto que se manda a Claude. Se arma acá y no en cada sección para que
// todos los motores vean lo mismo — y para que el Libro Rojo entre siempre:
// es lo que hace que un escenario nuevo no arranque de cero.
export function contextoEscenario(escenario: CuartelEscenario, historial: CuartelEscenario[]) {
  return {
    nombre: escenario.nombre,
    categoria: CUARTEL_CATEGORIA_LABEL[escenario.categoria],
    contextoActual: escenario.contextoActual,
    patronRepetido: escenario.patronRepetido,
    certezaPatron: CUARTEL_CERTEZA_LABEL[escenario.certezaPatron],
    tensionReal: escenario.tensionReal,
    fechaLimite: escenario.fechaLimite,
    historial: historial
      .filter((e) => e.id !== escenario.id && (e.estado === "cerrado" || e.estado === "seguimiento"))
      .slice(0, 8)
      .map((e) => ({
        escenario: e.nombre,
        rutaElegida: etiquetaRuta(e.rutas.find((r) => r.id === e.cierre.rutaElegidaId)) ?? "sin registrar",
        resultado: e.cierre.resultado,
        patronConfirmado: e.cierre.patronConfirmado,
      })),
  };
}

export function etiquetaRuta(ruta: CuartelRuta | undefined): string | null {
  if (!ruta) return null;
  return ruta.tipo === "otra" ? ruta.nombre || "Otra ruta" : CUARTEL_RUTA_LABEL[ruta.tipo];
}

async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
  return body.result as T;
}

export function fetchAnalisis(
  escenario: CuartelEscenario,
  historial: CuartelEscenario[]
): Promise<AnalisisResponse> {
  return postJSON<AnalisisResponse>("/api/cuartel/analizar", {
    escenario: contextoEscenario(escenario, historial),
    rutas: escenario.rutas.map((r) => ({ tipo: r.tipo, nombre: r.nombre })),
  });
}

export function fetchPreguntaInstructor(
  escenario: CuartelEscenario,
  ruta: CuartelRuta,
  historial: CuartelEscenario[]
): Promise<InstructorResponse> {
  return postJSON<InstructorResponse>("/api/cuartel/instructor", {
    escenario: contextoEscenario(escenario, historial),
    ruta: { tipo: ruta.tipo, nombre: ruta.nombre, sombreros: ruta.sombreros, semaforo: ruta.semaforo },
    turnos: ruta.turnos.map((t) => ({ tipo: t.tipo, pregunta: t.pregunta, respuesta: t.respuesta })),
  });
}

export function fetchRecomendacion(
  escenario: CuartelEscenario,
  historial: CuartelEscenario[]
): Promise<RecomendacionResponse> {
  const validas: { ruta: CuartelRuta; rojos: number }[] = [];
  const descartadas: { etiqueta: string; motivo: string }[] = [];

  for (const ruta of escenario.rutas) {
    const veredicto = calcularVeredicto(ruta);
    if (veredicto.validez === "valida") validas.push({ ruta, rojos: veredicto.rojos });
    else if (veredicto.validez === "descartada") {
      descartadas.push({ etiqueta: etiquetaRuta(ruta) ?? ruta.tipo, motivo: veredicto.motivo });
    }
  }

  return postJSON<RecomendacionResponse>("/api/cuartel/recomendar", {
    escenario: contextoEscenario(escenario, historial),
    rutas: validas.map(({ ruta, rojos }) => ({
      id: ruta.id,
      etiqueta: etiquetaRuta(ruta) ?? ruta.tipo,
      sombreros: ruta.sombreros,
      semaforo: ruta.semaforo,
      rojos,
    })),
    descartadas,
  });
}

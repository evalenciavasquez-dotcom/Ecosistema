// El Cuartel de mis Decisiones — modelo de datos.
//
// Sistema privado de análisis de decisiones personales. Es hermano de VINCERE
// pero NO comparte datos con él ni con el resto de C.C.O. E.V.: lo que se
// carga acá (relaciones, familia, salud) no aparece en ningún contexto de
// trabajo. Esa separación es un requisito del PRD, no una preferencia.
//
// El centro del producto es la comparación de rutas: ~80% análisis de
// decisión, ~20% registro. Todo lo que se agregue acá debe defender esa
// proporción.

export type CuartelSeccion = "inicio" | "escenarios" | "historial" | "metodo";

export const CUARTEL_SECCION_LABEL: Record<CuartelSeccion, string> = {
  inicio: "Inicio",
  escenarios: "Escenarios",
  historial: "Historial · Libro Rojo",
  metodo: "Método",
};

// ─────────────────────────── Niveles de certeza ───────────────────────────
// Etiqueta obligatoria en Riesgos e Historial. Existe para que una lectura de
// Claude nunca se confunda con algo que Eduardo confirmó.

export type CuartelCerteza = "hecho" | "reportado" | "interpretacion" | "hipotesis";

export const CUARTEL_CERTEZA_LABEL: Record<CuartelCerteza, string> = {
  hecho: "Hecho verificable",
  reportado: "Reportado por Eduardo",
  interpretacion: "Interpretación del sistema",
  hipotesis: "Hipótesis",
};

export const CUARTEL_CERTEZA_DETALLE: Record<CuartelCerteza, string> = {
  hecho: "Dato objetivo, comprobable fuera de esta conversación.",
  reportado: "Lo que contó Eduardo, sin verificación externa. La mayoría del contenido de este sistema.",
  interpretacion: "Lectura o inferencia del sistema sobre un patrón o un riesgo. No la confirmó nadie.",
  hipotesis: "Supuesto explícito, no confirmado por ninguna de las partes.",
};

export interface CuartelAfirmacion {
  texto: string;
  certeza: CuartelCerteza;
}

// ───────────────────────────── Escenarios ─────────────────────────────

export type CuartelCategoria = "relacion" | "familia" | "salud" | "vocacion" | "tiempo" | "otro";

export const CUARTEL_CATEGORIA_LABEL: Record<CuartelCategoria, string> = {
  relacion: "Relación",
  familia: "Familia",
  salud: "Salud",
  vocacion: "Vocación",
  tiempo: "Tiempo / Energía",
  otro: "Otro",
};

export type CuartelEstado = "activo" | "analisis" | "decidido" | "seguimiento" | "cerrado";

export const CUARTEL_ESTADO_LABEL: Record<CuartelEstado, string> = {
  activo: "Activo",
  analisis: "En análisis",
  decidido: "Decidido",
  seguimiento: "En seguimiento",
  cerrado: "Cerrado",
};

export const CUARTEL_ESTADO_ORDEN: CuartelEstado[] = ["activo", "analisis", "decidido", "seguimiento", "cerrado"];

// ─────────────────────────────── Rutas ───────────────────────────────

export type CuartelRutaTipo = "cortar" | "sostener" | "rediseñar" | "otra";

export const CUARTEL_RUTA_LABEL: Record<CuartelRutaTipo, string> = {
  cortar: "Cortar",
  sostener: "Sostener",
  rediseñar: "Rediseñar",
  otra: "Otra ruta",
};

export const CUARTEL_RUTA_DESCRIPCION: Record<CuartelRutaTipo, string> = {
  cortar: "Terminar el vínculo, la actividad o el compromiso. Asumir la pérdida del beneficio conocido.",
  sostener: "Seguir como está. No es ausencia de decisión: es una ruta con costo, y se analiza como tal.",
  rediseñar: "Cambiar las condiciones sin cortar: qué se acepta, qué no, con qué límite explícito.",
  otra: "Una ruta propia de este escenario que no cabe en las tres base.",
};

// Los 6 sombreros. Texto libre por ruta — es la estructura de análisis
// obligatoria: ninguna ruta se compara con otra si no pasó por las seis.
export type CuartelSombrero = "hechos" | "emocion" | "riesgos" | "beneficio" | "alternativas" | "meta";

export const CUARTEL_SOMBREROS: CuartelSombrero[] = [
  "hechos",
  "emocion",
  "riesgos",
  "beneficio",
  "alternativas",
  "meta",
];

export const CUARTEL_SOMBRERO_META: Record<CuartelSombrero, { icono: string; label: string; pregunta: string }> = {
  hechos: {
    icono: "🤍",
    label: "Hechos",
    pregunta: "Qué se sabe con certeza vs. qué se está asumiendo.",
  },
  emocion: {
    icono: "❤️",
    label: "Emoción",
    pregunta: "Qué se siente con esta ruta, sin racionalizar ni justificar.",
  },
  riesgos: {
    icono: "🖤",
    label: "Riesgos",
    pregunta: "Qué puede salir mal, qué patrón propio se repite acá.",
  },
  beneficio: {
    icono: "💛",
    label: "Beneficio real",
    pregunta: "Qué se gana de verdad, no lo que se cree ganar.",
  },
  alternativas: {
    icono: "💚",
    label: "Alternativas",
    pregunta: "Variantes de esta misma ruta que no se habían considerado.",
  },
  meta: {
    icono: "💙",
    label: "Meta / Alineación",
    pregunta: "Si acerca o aleja del objetivo de vida real.",
  },
};

export type CuartelSombreros = Record<CuartelSombrero, string>;

export function sombrerosVacios(): CuartelSombreros {
  return { hechos: "", emocion: "", riesgos: "", beneficio: "", alternativas: "", meta: "" };
}

// ────────────────────────── Semáforo de riesgo ──────────────────────────
// Cuatro métricas, siempre las mismas, para que dos rutas de dos escenarios
// distintos sigan siendo comparables. El candado se calcula sobre estas.

export type CuartelLuz = "verde" | "amarillo" | "rojo";

export const CUARTEL_LUZ_LABEL: Record<CuartelLuz, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
};

export const CUARTEL_LUZ_COLOR: Record<CuartelLuz, string> = {
  verde: "#5cc98e",
  amarillo: "#e0a83a",
  rojo: "#e0483a",
};

export type CuartelMetrica = "desgaste" | "patron" | "costoOportunidad" | "dependencia";

export const CUARTEL_METRICAS: CuartelMetrica[] = ["desgaste", "patron", "costoOportunidad", "dependencia"];

export const CUARTEL_METRICA_META: Record<
  CuartelMetrica,
  { label: string; pregunta: string; rojo: string; amarillo: string; verde: string }
> = {
  desgaste: {
    label: "Desgaste",
    pregunta: "¿Cuánta energía emocional consume esta ruta sostenida en el tiempo?",
    rojo: "Consume más de lo que devuelve, y ya se nota en otras áreas de la vida.",
    amarillo: "Cuesta, pero todavía es sostenible sin daño visible.",
    verde: "No desgasta, o el desgaste tiene fecha de vencimiento clara.",
  },
  patron: {
    label: "Repetición de patrón",
    pregunta: "¿Esto se parece a algo que Eduardo ya vivió y que terminó mal?",
    rojo: "Es el mismo patrón ya identificado, con los mismos ingredientes.",
    amarillo: "Se parece, pero hay una diferencia concreta — no una sensación.",
    verde: "No hay patrón previo que aplique acá.",
  },
  costoOportunidad: {
    label: "Costo de oportunidad",
    pregunta: "¿Qué se deja de vivir por mantener esta ruta activa?",
    rojo: "Bloquea algo concreto e importante que ya está identificado.",
    amarillo: "Ocupa espacio, pero no bloquea nada nombrado todavía.",
    verde: "No cierra ninguna puerta relevante.",
  },
  dependencia: {
    label: "Dependencia del otro",
    pregunta: "¿Cuánto de que esto funcione depende de que la otra parte cambie?",
    rojo: "Solo funciona si el otro cambia — y no hay evidencia de que vaya a cambiar.",
    amarillo: "Depende en parte del otro, con algo de margen propio.",
    verde: "Depende sobre todo de decisiones que Eduardo controla.",
  },
};

export type CuartelSemaforo = Record<CuartelMetrica, CuartelLuz | null>;

export function semaforoVacio(): CuartelSemaforo {
  return { desgaste: null, patron: null, costoOportunidad: null, dependencia: null };
}

// ─────────────────────────── Capa legal / fiscal ───────────────────────────
// No es un séptimo sombrero: corre en paralelo y solo cuando la ruta tiene un
// ángulo legal, contractual o fiscal real. Alcance exclusivamente personal.

export type CuartelLegalNivel = "no-aplica" | "recomendable" | "necesario";

export const CUARTEL_LEGAL_LABEL: Record<CuartelLegalNivel, string> = {
  "no-aplica": "No aplica",
  recomendable: "Recomendable",
  necesario: "Necesario antes de actuar",
};

export interface CuartelLegal {
  nivel: CuartelLegalNivel;
  nota: string;
}

export function legalVacio(): CuartelLegal {
  return { nivel: "no-aplica", nota: "" };
}

// ───────────────────────────── El Instructor ─────────────────────────────
// El estándar de calidad de las preguntas. Ninguna ruta obtiene Validez
// calculada sin al menos una pregunta de Contraste o Confrontación respondida.

export type CuartelPreguntaTipo =
  | "contraste"
  | "confrontativa"
  | "consistencia"
  | "psicologica"
  | "aceptacion"
  | "cierre";

export const CUARTEL_PREGUNTA_LABEL: Record<CuartelPreguntaTipo, string> = {
  contraste: "Contraste",
  confrontativa: "Confrontativa",
  consistencia: "Consistencia",
  psicologica: "Psicológica",
  aceptacion: "Aceptación",
  cierre: "Cierre / guía",
};

// Los dos tipos que habilitan el cálculo de Validez. Una pregunta de
// consistencia o psicológica ayuda, pero no reemplaza poner la ruta a prueba.
export const CUARTEL_TIPOS_QUE_HABILITAN: CuartelPreguntaTipo[] = ["contraste", "confrontativa"];

export interface CuartelTurno {
  id: string;
  tipo: CuartelPreguntaTipo;
  pregunta: string;
  respuesta: string | null;
  creadoEn: string;
}

// ─────────────────────────────── Ruta ───────────────────────────────

// Validez es calculada, nunca editable a mano. "pendiente" no es un limbo
// cómodo: dice exactamente qué falta para poder decidir.
export type CuartelValidez = "pendiente" | "valida" | "descartada";

export interface CuartelVeredicto {
  validez: CuartelValidez;
  motivo: string;
  rojos: number;
  // Qué falta para que la validez deje de estar pendiente. Vacío si ya no falta nada.
  faltantes: string[];
}

export interface CuartelRuta {
  id: string;
  tipo: CuartelRutaTipo;
  // Solo se usa cuando tipo === "otra"; para las tres base manda la etiqueta fija.
  nombre: string;
  sombreros: CuartelSombreros;
  semaforo: CuartelSemaforo;
  legal: CuartelLegal;
  // Certeza declarada del sombrero de Riesgos — el campo donde es más fácil
  // confundir una lectura del sistema con algo confirmado.
  certezaRiesgos: CuartelCerteza;
  turnos: CuartelTurno[];
  // Marca si el contenido de esta ruta lo generó el sistema o lo escribió
  // Eduardo. Trazabilidad, requisito no funcional del PRD.
  origen: "eduardo" | "sistema";
  creadoEn: string;
}

// ─────────────────────────────── Cierre ───────────────────────────────

export interface CuartelCierre {
  // Ruta que el sistema recomendó y ruta que Eduardo eligió. Pueden diferir:
  // esa diferencia es justamente lo que el Libro Rojo necesita registrar.
  rutaRecomendadaId: string | null;
  razonRecomendacion: string;
  rutaElegidaId: string | null;
  movidaConcreta: string;
  plazoMovida: string;
  fechaDecision: string;
  movidaEjecutada: boolean;
  resultado: string;
  // Si el patrón de riesgo identificado al principio terminó confirmándose.
  patronConfirmado: boolean | null;
  fechaResultado: string;
}

export function cierreVacio(): CuartelCierre {
  return {
    rutaRecomendadaId: null,
    razonRecomendacion: "",
    rutaElegidaId: null,
    movidaConcreta: "",
    plazoMovida: "",
    fechaDecision: "",
    movidaEjecutada: false,
    resultado: "",
    patronConfirmado: null,
    fechaResultado: "",
  };
}

// ────────────────────────────── Escenario ──────────────────────────────

export interface CuartelEscenario {
  id: string;
  nombre: string;
  categoria: CuartelCategoria;
  estado: CuartelEstado;
  contextoActual: string;
  // El patrón que ya se repitió antes. Lleva certeza porque acá es donde una
  // interpretación del sistema se disfraza de historia confirmada.
  patronRepetido: string;
  certezaPatron: CuartelCerteza;
  // "No me interesa por X pero no lo suelto por Y" — la tensión real, separada
  // de los hechos a propósito.
  tensionReal: string;
  fechaLimite: string;
  rutas: CuartelRuta[];
  cierre: CuartelCierre;
  creadoEn: string;
  actualizadoEn: string;
}

export const CUARTEL_RUTAS_BASE: CuartelRutaTipo[] = ["cortar", "sostener", "rediseñar"];

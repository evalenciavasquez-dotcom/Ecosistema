// Dónde rinde el peso de pauta, y dónde es tirarlo.
//
// El principio que casi nadie aplica: **no se pauta donde ya estás caliente.**
// Una plaza caliente ya te encontró; meterle presupuesto es comprar audiencia
// que ya tenías. Todo el mundo hace lo contrario porque en el reporte esa plaza
// se ve bien, y confundir "aquí funciona" con "aquí conviene invertir" es el
// error más caro y más común de un lanzamiento.
//
// Donde el peso rinde de verdad es en la plaza tibia: hay señal, falta empuje.
// Y donde se abre mercado es en la fría que vive en un país donde ya hay
// calientes — el vecindario ya validó al artista.
//
// Esto es una regla, no una interpretación: se calcula igual siempre, y por eso
// se puede discutir en una mesa. La IA después la lee, pero no la decide.

import { VincereProyecto, VincereZonaCalor } from "./types";

export type AccionDePlaza = "sostener" | "cobrar" | "revisar" | "reforzar" | "abrir" | "esperar";

export const ACCION_LABEL: Record<AccionDePlaza, string> = {
  sostener: "Sostener",
  cobrar: "Cobrarla",
  revisar: "Revisar",
  reforzar: "Reforzar con pauta",
  abrir: "Abrir",
  esperar: "Esperar",
};

// Estados, no identidades: cada acción sale siempre con su etiqueta escrita al
// lado, así que van con los tokens del semáforo. «Abrir» es la excepción y por
// eso lleva el acento: no es bueno ni malo, es lo tocable — la plaza donde hay
// algo que decidir. «Esperar» es ausencia de acción, y va en gris.
export const ACCION_COLOR: Record<AccionDePlaza, string> = {
  sostener: "var(--vin-ok)",
  cobrar: "var(--vin-ok)",
  revisar: "var(--vin-risk)",
  reforzar: "var(--vin-warn)",
  abrir: "var(--vin-accent)",
  esperar: "var(--vin-dim)",
};

// Qué significa cada una en plata y en acción. Es lo que se le dice al cliente.
export const ACCION_QUE_HACER: Record<AccionDePlaza, string> = {
  sostener:
    "Ya convierte y ya se probó en taquilla. La pauta acá compra lo que ya tienes: el presupuesto rinde más en producto — otra fecha, merch, contenido.",
  cobrar:
    "Hay demanda y todavía no se ha cobrado: nunca se ha tocado ahí. Lo que corresponde no es pauta, es una fecha.",
  revisar:
    "El calor es alto pero la taquilla no lo confirmó. Antes de invertir hay que entender por qué: sala equivocada, precio, fecha, o escucha que no se traduce en salir de la casa.",
  reforzar:
    "Aquí es donde rinde el peso. Hay señal suficiente para que la pauta encuentre a quién hablarle, y hay techo para crecer.",
  abrir:
    "Fría, pero el país ya tiene plazas calientes: el vecindario validó al artista. Es expansión con respaldo, no apuesta a ciegas.",
  esperar:
    "Sin señal propia ni vecindad que la sostenga. Pautar acá es comprar oyentes que no vuelven.",
};

export interface PlazaEvaluada {
  ciudad: string;
  pais: string | null;
  calor: number;
  accion: AccionDePlaza;
  // El porqué, con los números que lo sostienen. Se muestra tal cual.
  razon: string;
  // Prioridad de presupuesto: 1 es donde primero va el peso.
  prioridadPauta: number | null;
  showsPrevios: number;
  mejorConversionPct: number | null;
}

export interface MapaDePlazas {
  plazas: PlazaEvaluada[];
  // Lo que hay que decir en una frase antes de entrar al detalle.
  titular: string;
  // Advertencias sobre la propia data, para no leer de más.
  avisos: string[];
}

const CALIENTE = 70;
const MEDIO = 40;

function conversionesDe(p: VincereProyecto, ciudad: string): { shows: number; mejor: number | null } {
  const clave = ciudad.trim().toLocaleLowerCase("es");
  const aqui = (p.shows ?? []).filter((s) => s.ciudad.trim().toLocaleLowerCase("es") === clave);
  const conv = aqui
    .filter((s) => s.asistencia != null && s.aforo > 0)
    .map((s) => Math.round(((s.asistencia as number) / s.aforo) * 100));
  return { shows: aqui.length, mejor: conv.length ? Math.max(...conv) : null };
}

function clasificar(
  z: VincereZonaCalor,
  conv: { shows: number; mejor: number | null },
  paisTieneCaliente: boolean
): { accion: AccionDePlaza; razon: string } {
  if (z.calor >= CALIENTE) {
    if (conv.mejor != null && conv.mejor >= 80) {
      return {
        accion: "sostener",
        razon: `Calor ${z.calor} y ${conv.mejor}% de taquilla en su mejor fecha. Ya te encontró y ya paga.`,
      };
    }
    if (conv.mejor != null && conv.mejor < 60) {
      return {
        accion: "revisar",
        razon: `Calor ${z.calor} —de los más altos— pero la mejor taquilla fue ${conv.mejor}%. La escucha no se tradujo en salir de la casa.`,
      };
    }
    if (conv.mejor != null) {
      return {
        accion: "sostener",
        razon: `Calor ${z.calor} con ${conv.mejor}% de taquilla. Convierte, aunque con margen.`,
      };
    }
    return {
      accion: "cobrar",
      razon: `Calor ${z.calor} y nunca se ha tocado ahí. La demanda existe y no se ha cobrado.`,
    };
  }

  if (z.calor >= MEDIO) {
    return {
      accion: "reforzar",
      razon: `Calor ${z.calor}: hay señal y hay techo. Es el rango donde la pauta encuentra a quién hablarle sin pagar por gente que ya te sigue.`,
    };
  }

  if (paisTieneCaliente) {
    return {
      accion: "abrir",
      razon: `Calor ${z.calor}, pero ${z.pais} ya tiene plazas calientes. El país validó al artista; esta ciudad todavía no lo conoce.`,
    };
  }

  return {
    accion: "esperar",
    razon: `Calor ${z.calor} y sin ninguna plaza caliente que la respalde.`,
  };
}

// El orden en que se reparte el presupuesto. Reforzar primero porque es donde
// cada peso mueve más; abrir después, que es apuesta con respaldo.
const ORDEN_PAUTA: AccionDePlaza[] = ["reforzar", "abrir"];

export function mapaDePlazas(p: VincereProyecto): MapaDePlazas {
  const zonas = p.zonasCalor ?? [];
  const avisos: string[] = [];

  if (!zonas.length) {
    return {
      plazas: [],
      titular: "No hay zonas de calor cargadas: sin ellas no se puede decir dónde conviene invertir.",
      avisos: ["Las ciudades salen de Chartmetric o de Spotify for Artists → Audiencia."],
    };
  }

  const sinPais = zonas.filter((z) => !z.pais?.trim()).length;
  if (sinPais > 0) {
    avisos.push(
      `${sinPais} de ${zonas.length} plazas no tienen país. Sin él, una ciudad fría no se puede distinguir entre "abrir" —porque el país ya responde— y "esperar". Se evalúan solas.`
    );
  }
  if (!(p.shows ?? []).length) {
    avisos.push(
      "No hay shows registrados, así que ninguna plaza tiene prueba de taquilla. El calor dice quién escucha, no quién paga la entrada."
    );
  }

  // Países con al menos una plaza caliente: los que ya validaron al artista.
  const paisesCalientes = new Set(
    zonas.filter((z) => z.calor >= CALIENTE && z.pais?.trim()).map((z) => z.pais!.trim().toLocaleLowerCase("es"))
  );

  const evaluadas: PlazaEvaluada[] = zonas.map((z) => {
    const conv = conversionesDe(p, z.ciudad);
    const pais = z.pais?.trim() || null;
    const paisTieneCaliente = !!pais && paisesCalientes.has(pais.toLocaleLowerCase("es"));
    const { accion, razon } = clasificar(z, conv, paisTieneCaliente);
    return {
      ciudad: z.ciudad,
      pais,
      calor: z.calor,
      accion,
      razon,
      prioridadPauta: null,
      showsPrevios: conv.shows,
      mejorConversionPct: conv.mejor,
    };
  });

  // La prioridad se asigna después, comparando entre plazas: dentro de
  // "reforzar" manda el calor más alto, porque es la que está más cerca.
  const paraPauta = evaluadas
    .filter((e) => ORDEN_PAUTA.includes(e.accion))
    .sort((a, b) => {
      const oa = ORDEN_PAUTA.indexOf(a.accion);
      const ob = ORDEN_PAUTA.indexOf(b.accion);
      if (oa !== ob) return oa - ob;
      return b.calor - a.calor;
    });
  paraPauta.forEach((e, i) => {
    e.prioridadPauta = i + 1;
  });

  const reforzar = evaluadas.filter((e) => e.accion === "reforzar");
  const calientes = evaluadas.filter((e) => e.accion === "sostener" || e.accion === "cobrar");
  const revisar = evaluadas.filter((e) => e.accion === "revisar");

  let titular: string;
  if (reforzar.length) {
    const nombres = reforzar.slice(0, 3).map((e) => e.ciudad).join(", ");
    titular = `El presupuesto rinde en ${nombres}${reforzar.length > 3 ? " y otras" : ""}. En ${
      calientes.length ? calientes.map((e) => e.ciudad).slice(0, 3).join(", ") : "las plazas calientes"
    } no: ahí ya te encontraron y la pauta compraría lo que ya tienes.`;
  } else if (calientes.length) {
    titular =
      "Todas las plazas con señal ya están calientes. No hay dónde reforzar con pauta: lo que corresponde es cobrarlas con fechas y abrir mercado nuevo.";
  } else {
    titular = "Ninguna plaza llega al rango donde la pauta rinde. Antes de invertir hace falta señal.";
  }

  if (revisar.length) {
    titular += ` Ojo con ${revisar.map((e) => e.ciudad).join(", ")}: calor alto que no se tradujo en taquilla.`;
  }

  return { plazas: evaluadas.sort((a, b) => b.calor - a.calor), titular, avisos };
}

// Indicadores globales — la vista que cruza todos los proyectos.
//
// Todo lo demás en VINCERE mira un artista a la vez. Eso está bien para
// dirigir, y es inútil para operar: con cuatro o cinco proyectos abiertos, la
// pregunta de un lunes no es "cómo va SETTE" sino "qué se me está venciendo".
//
// Este módulo responde eso. Y tiene un sesgo deliberado: **muestra primero lo
// que está vencido y sin cerrar, no lo que va bien.** Un tablero que abre con
// las cifras bonitas es un tablero decorativo. Las predicciones que vencieron y
// nadie verificó, y los lanzamientos que pasaron su fecha de corte sin cierre,
// son exactamente las dos cosas que convierten a este sistema en humo si se
// dejan correr: un marcador que no se cierra siempre parece que va ganando.

import { VincereProyecto } from "./types";
import { calcularMarcador } from "./types";
import { motoresDelProyecto } from "./motores";
import { calcularFanRate } from "./fanrate";
import { cuelloDeBotella, Etapa, ETAPA_LABEL } from "./cuello";

const HOY = () => new Date().toISOString().slice(0, 10);

export interface PendienteGlobal {
  proyectoId: string;
  proyecto: string;
  tipo: "prediccion" | "lanzamiento";
  que: string;
  vencioEn: string;
  // Días desde que venció. Cuanto más viejo, peor: una predicción que lleva
  // meses sin cerrar ya no se puede verificar honestamente.
  diasVencido: number;
}

export interface FilaProyecto {
  id: string;
  nombre: string;
  tipo: "propio" | "competencia";
  motoresListos: number;
  motoresTotal: number;
  // Fan rate marginal si existe, si no el acumulado, si no null.
  fanRatePct: number | null;
  fanRateEsMarginal: boolean;
  prediccionesAbiertas: number;
  prediccionesVencidas: number;
  lanzamientosAbiertos: number;
  // En qué etapa está trabado cada artista. Puesto en una columna, el tablero
  // deja de ser una lista de proyectos y pasa a ser una cartera: tres artistas
  // trabados en conversión es un problema de método, no tres casualidades.
  cuello: Etapa | null;
  cuelloEvidencia: string | null;
  // Etapas que no se pueden ver. Una cartera donde nadie tiene el dato de
  // propiedad no está sana: está a ciegas, y eso se decide distinto.
  etapasCiegas: number;
}

export interface IndicadoresGlobales {
  proyectos: number;
  propios: number;
  competencia: number;
  // Lo que hay que atender hoy, de lo más viejo a lo más nuevo.
  pendientes: PendienteGlobal[];
  filas: FilaProyecto[];
  // Aciertos del sistema sumando todos los proyectos. Es el número que
  // responde "¿esto sirve?" mejor que cualquier otro del tablero.
  prediccionesCerradas: number;
  pctAcierto: number | null;
  // La frase de arriba. Dice qué atender, no qué celebrar.
  titular: string;
  // Cuando el mismo cuello se repite entre proyectos propios. Null si no hay
  // patrón: no se fuerza uno con dos proyectos que están trabados en cosas
  // distintas.
  patronDeCuello: string | null;
}

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + "T12:00:00").getTime();
  const b = new Date(hasta + "T12:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function indicadoresGlobales(proyectos: VincereProyecto[]): IndicadoresGlobales {
  const hoy = HOY();
  const pendientes: PendienteGlobal[] = [];

  let cerradas = 0;
  let acertadas = 0;
  let decisivas = 0;

  const filas: FilaProyecto[] = proyectos.map((p) => {
    const motores = motoresDelProyecto(p);
    const preds = p.predicciones ?? [];
    const marcador = calcularMarcador(preds);

    // Predicciones vencidas sin cerrar: la deuda que más rápido invalida el
    // marcador entero.
    for (const pr of preds) {
      if (pr.estado === "abierta" && pr.venceEn <= hoy) {
        pendientes.push({
          proyectoId: p.id,
          proyecto: p.nombre,
          tipo: "prediccion",
          que: pr.afirmacion,
          vencioEn: pr.venceEn,
          diasVencido: diasEntre(pr.venceEn, hoy),
        });
      }
    }

    // Lanzamientos que pasaron su corte y nadie cerró.
    const lanzamientos = p.lanzamientos ?? [];
    for (const l of lanzamientos) {
      if (!l.cierre && l.objetivo && l.objetivo.fechaCorte <= hoy) {
        pendientes.push({
          proyectoId: p.id,
          proyecto: p.nombre,
          tipo: "lanzamiento",
          que: `«${l.nombreCancion}» — ${l.objetivo.metrica.toLocaleLowerCase("es")}`,
          vencioEn: l.objetivo.fechaCorte,
          diasVencido: diasEntre(l.objetivo.fechaCorte, hoy),
        });
      }
    }

    cerradas += marcador.cerradas;
    const dec = marcador.acertadas + marcador.falladas;
    decisivas += dec;
    acertadas += marcador.acertadas;

    const cuello = cuelloDeBotella(p);
    const fr = calcularFanRate(p);
    // Mismo criterio que en el motor de lanzamiento: el marginal solo se
    // muestra como fan rate cuando se puede leer como conversión.
    const marginalUtil =
      fr.marginal &&
      fr.marginal.movimiento === "creció" &&
      !fr.marginal.imposibleComoConversion &&
      fr.marginal.pct > 0;

    return {
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      motoresListos: motores.filter((m) => m.listo).length,
      motoresTotal: motores.length,
      fanRatePct: marginalUtil ? fr.marginal!.pct : (fr.actual?.pct ?? null),
      fanRateEsMarginal: !!marginalUtil,
      prediccionesAbiertas: marcador.abiertas,
      prediccionesVencidas: marcador.vencidas,
      lanzamientosAbiertos: lanzamientos.filter((l) => !l.cierre).length,
      cuello: cuello.cuello?.etapa ?? null,
      cuelloEvidencia: cuello.cuello?.evidencia ?? null,
      etapasCiegas: cuello.ciegas.length,
    };
  });

  // Lo más viejo primero: una predicción vencida hace tres meses ya casi no se
  // puede verificar, y esa es la urgencia real.
  pendientes.sort((a, b) => b.diasVencido - a.diasVencido);

  const propios = proyectos.filter((p) => p.tipo === "propio").length;
  const pctAcierto = decisivas > 0 ? Math.round((acertadas / decisivas) * 100) : null;

  let titular: string;
  if (!proyectos.length) {
    titular = "No hay proyectos cargados.";
  } else if (pendientes.length) {
    const masViejo = pendientes[0];
    const cuantas =
      pendientes.length === 1 ? "1 cosa vencida" : `${pendientes.length} cosas vencidas`;
    const antiguedad =
      masViejo.diasVencido === 0
        ? "vence hoy"
        : `lleva ${masViejo.diasVencido} día${masViejo.diasVencido === 1 ? "" : "s"}`;
    titular = `${cuantas} sin cerrar. La más vieja ${antiguedad}: ${masViejo.proyecto}. Un marcador que no se cierra siempre parece que va ganando.`;
  } else if (cerradas === 0) {
    titular =
      "Nada vencido, pero tampoco nada cerrado todavía: el sistema aún no ha demostrado que acierta. Eso llega con la primera verificación.";
  } else {
    titular = `Nada vencido sin cerrar. ${cerradas} predicci${cerradas === 1 ? "ón verificada" : "ones verificadas"}${
      pctAcierto != null ? `, ${pctAcierto}% de acierto en las decisivas` : ""
    }.`;
  }

  return {
    proyectos: proyectos.length,
    propios,
    competencia: proyectos.length - propios,
    pendientes,
    filas,
    prediccionesCerradas: cerradas,
    pctAcierto,
    titular,
    patronDeCuello: patronDeCuello(filas.filter((f) => f.tipo === "propio")),
  };
}

// Cuando varios artistas propios se traban en la MISMA etapa, eso deja de ser
// una coincidencia: es el método. Un solo artista trabado en conversión es un
// caso; tres es una forma de trabajar que no está funcionando, y se arregla una
// vez para todos en lugar de tres veces por separado.
//
// Solo mira los proyectos propios: los de competencia están cargados para
// comparar, y meterlos acá inventaría un patrón sobre carreras que nadie opera.
function patronDeCuello(filas: FilaProyecto[]): string | null {
  const conCuello = filas.filter((f) => f.cuello);
  if (conCuello.length < 2) return null;

  const cuenta = new Map<Etapa, number>();
  conCuello.forEach((f) => cuenta.set(f.cuello!, (cuenta.get(f.cuello!) ?? 0) + 1));

  let etapa: Etapa | null = null;
  let veces = 0;
  cuenta.forEach((n, e) => {
    if (n > veces) {
      veces = n;
      etapa = e;
    }
  });

  if (veces < 2) return null;

  const quienes = conCuello.filter((f) => f.cuello === etapa).map((f) => f.nombre);
  return (
    `${veces} de ${conCuello.length} proyectos propios están trabados en la misma etapa — ${ETAPA_LABEL[etapa!].toLowerCase()} ` +
    `(${quienes.join(", ")}). Cuando el cuello se repite deja de ser el artista y pasa a ser el método: ` +
    `conviene arreglarlo una vez para todos antes que ${veces} veces por separado.`
  );
}

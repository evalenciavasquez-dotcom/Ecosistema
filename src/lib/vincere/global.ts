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
import { calcularNps, LecturaNps, ModoNps, RespuestaNps } from "./nps";
import { calcularFanRate } from "./fanrate";

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
  nps: number | null;
  npsRespuestas: number;
  // Con pocas respuestas la tabla muestra el conteo y no el puntaje: comparar
  // puntajes entre proyectos a esa escala es comparar ruido con ruido.
  npsModo: ModoNps;
  npsPromotores: number;
}

export interface IndicadoresGlobales {
  proyectos: number;
  propios: number;
  competencia: number;
  // Lo que hay que atender hoy, de lo más viejo a lo más nuevo.
  pendientes: PendienteGlobal[];
  filas: FilaProyecto[];
  // NPS de VINCERE como servicio: junta las respuestas marcadas 'vincere' de
  // todos los proyectos, porque es una sola encuesta repartida.
  npsVincere: LecturaNps;
  // Aciertos del sistema sumando todos los proyectos. Es el número que
  // responde "¿esto sirve?" mejor que cualquier otro del tablero.
  prediccionesCerradas: number;
  pctAcierto: number | null;
  // La frase de arriba. Dice qué atender, no qué celebrar.
  titular: string;
}

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + "T12:00:00").getTime();
  const b = new Date(hasta + "T12:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

export function indicadoresGlobales(proyectos: VincereProyecto[]): IndicadoresGlobales {
  const hoy = HOY();
  const pendientes: PendienteGlobal[] = [];
  const respuestasVincere: RespuestaNps[] = [];

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

    const npsRespuestas = (p.npsRespuestas ?? []).filter((r) => r.sobre === "artista");
    const npsArtista = calcularNps(npsRespuestas, "artista");
    respuestasVincere.push(...(p.npsRespuestas ?? []).filter((r) => r.sobre === "vincere"));

    const fr = calcularFanRate(p);
    const marginalUtil = fr.marginal && !fr.marginal.audienciaBajo && fr.marginal.oyentesGanados > 0;

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
      nps: npsArtista.puntaje,
      npsRespuestas: npsArtista.respuestas,
      npsModo: npsArtista.modo,
      npsPromotores: npsArtista.promotores,
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
    npsVincere: calcularNps(respuestasVincere, "vincere"),
    prediccionesCerradas: cerradas,
    pctAcierto,
    titular,
  };
}

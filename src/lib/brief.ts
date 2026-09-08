import { computeProyeccion, computeRunway } from "./finanzas";
import type { MovimientoEconomico } from "./types";

// El resumen del día, en un solo lugar.
//
// Antes esta lógica vivía dentro de la ruta del cron, así que el push de la
// mañana era el único que la usaba: la pantalla mostraba secciones sueltas y
// el aviso decía otra cosa. Acá se calcula una vez y la usan los dos — el
// push a las 7am y la tarjeta de Inicio — de modo que nunca se contradicen.
//
// La diferencia con el cron es el momento: el push sale a una hora fija, pero
// la pantalla se abre a cualquier hora, y a las 6pm no sirve el mismo resumen
// que a las 7am. Por eso el brief se arma según el momento del día.

export type MomentoDelDia = "manana" | "tarde" | "noche";

export type UrgenciaSenal = "critica" | "atencion" | "informativa";

export interface SenalBrief {
  id: string;
  texto: string;
  urgencia: UrgenciaSenal;
  href: string;
}

export interface Brief {
  momento: MomentoDelDia;
  titulo: string;
  // Una frase que enmarca el momento — lo que cambia entre abrir la app a las
  // 7am y abrirla a las 9pm.
  encuadre: string;
  senales: SenalBrief[];
  hayCritico: boolean;
}

export interface DatosBrief {
  acciones: { id: string; titulo: string; estado: string; fecha: string | null }[];
  decisiones: {
    id: string;
    pregunta: string;
    estado: string;
    fechaLimite: string | null;
    fechaDecision?: string | null;
    resultadoPosterior?: string | null;
  }[];
  agenda: { id: string; titulo: string; fecha: string; hora: string }[];
  personas: { id: string; nombre: string; diasSinResponder?: number | null }[];
  movimientos: MovimientoEconomico[];
  strategicCases: { decisionId: string; hipotesisCritica?: string | null }[];
}

export function momentoDe(fecha: Date): MomentoDelDia {
  const hora = fecha.getHours();
  if (hora < 12) return "manana";
  if (hora < 19) return "tarde";
  return "noche";
}

const ENCUADRE: Record<MomentoDelDia, { titulo: string; encuadre: string }> = {
  manana: { titulo: "Lo que viene hoy", encuadre: "El día todavía no ha pasado. Esto es lo que lo define." },
  tarde: { titulo: "Lo que queda del día", encuadre: "Queda tarde. Esto es lo que alcanzas a mover." },
  noche: { titulo: "Cómo cerró el día", encuadre: "El día ya casi es historia. Esto es lo que quedó y lo que viene." },
};

function diasHasta(fechaISO: string, hoy: string): number {
  return Math.round((new Date(fechaISO).getTime() - new Date(hoy).getTime()) / 86400000);
}

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// `ahora` entra como parámetro en vez de leerse del reloj adentro: la rama de
// la tarde necesita saber la hora para descartar los eventos que ya pasaron, y
// una función que consulta el reloj por su cuenta no se puede probar — el
// resultado cambia según cuándo se corra el test.
export function construirBrief(
  datos: DatosBrief,
  hoy: string,
  momento: MomentoDelDia,
  ahora: Date = new Date()
): Brief {
  const senales: SenalBrief[] = [];
  const abiertas = datos.acciones.filter((a) => a.estado === "Pendiente" || a.estado === "En curso");

  // --- Lo que es crítico a cualquier hora ---
  // Que se haya hecho de noche no vuelve menos grave una caja en déficit ni
  // una acción vencida: estas entran en todos los momentos, primero.

  const vencidas = abiertas.filter((a) => a.fecha && a.fecha < hoy);
  if (vencidas.length > 0) {
    senales.push({
      id: "acciones-vencidas",
      texto:
        vencidas.length === 1
          ? `1 acción vencida: "${vencidas[0].titulo}"`
          : `${vencidas.length} acciones vencidas — la más vieja: "${vencidas[0].titulo}"`,
      urgencia: "critica",
      href: "/acciones",
    });
  }

  const runway = computeRunway(datos.movimientos, hoy);
  const runwayCorto = runway.filter((r) => r.mesesRunway !== null && r.mesesRunway < 2);
  if (runwayCorto.length > 0) {
    const r = runwayCorto[0];
    senales.push({
      id: "runway",
      texto:
        r.mesesRunway! < 0
          ? `Caja en déficit en ${r.moneda}`
          : `Runway de ${r.mesesRunway!.toFixed(1)} meses en ${r.moneda} — caja baja`,
      urgencia: "critica",
      href: "/economia",
    });
  }

  const proyeccionNegativa = computeProyeccion(datos.movimientos, hoy).filter((p) => p.proyeccion30 < 0);
  if (proyeccionNegativa.length > 0) {
    senales.push({
      id: "proyeccion",
      texto: `Caja proyectada a 30 días se vuelve negativa en ${proyeccionNegativa[0].moneda}`,
      urgencia: "critica",
      href: "/economia",
    });
  }

  const decisionesAbiertas = datos.decisiones.filter((d) => d.estado === "Abierta" && d.fechaLimite);
  const decisionesUrgentes = decisionesAbiertas
    .map((d) => ({ d, dias: diasHasta(d.fechaLimite as string, hoy) }))
    .filter(({ dias }) => dias >= 0 && dias <= 3)
    .sort((a, b) => a.dias - b.dias);
  if (decisionesUrgentes.length > 0) {
    const { d, dias } = decisionesUrgentes[0];
    senales.push({
      id: `decision-${d.id}`,
      texto: `"${d.pregunta}" vence ${dias === 0 ? "HOY" : dias === 1 ? "mañana" : `en ${dias} días`}`,
      urgencia: dias <= 1 ? "critica" : "atencion",
      href: `/decisiones?open=${d.id}`,
    });
  }

  // --- Lo que depende del momento ---

  const eventosHoy = [...datos.agenda].filter((e) => e.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const paraHoy = abiertas.filter((a) => a.fecha === hoy);

  if (momento === "manana") {
    if (eventosHoy.length > 0) {
      const e = eventosHoy[0];
      senales.push({
        id: `evento-${e.id}`,
        texto:
          eventosHoy.length === 1
            ? `Hoy: ${e.titulo}${e.hora ? ` a las ${e.hora}` : ""}`
            : `${eventosHoy.length} eventos hoy — el primero: ${e.titulo}${e.hora ? ` a las ${e.hora}` : ""}`,
        urgencia: "informativa",
        href: "/inicio",
      });
    }
    if (paraHoy.length > 0) {
      senales.push({
        id: "acciones-hoy",
        texto:
          paraHoy.length === 1
            ? `Para hoy: "${paraHoy[0].titulo}"`
            : `${paraHoy.length} acciones para hoy — empieza por "${paraHoy[0].titulo}"`,
        urgencia: "atencion",
        href: "/acciones",
      });
    }
  }

  if (momento === "tarde") {
    // Lo que ya pasó no sirve de aviso: a media tarde importa el evento que
    // todavía no ha ocurrido, no el de la mañana.
    const horaActual = ahora.toTimeString().slice(0, 5);
    const eventosRestantes = eventosHoy.filter((e) => !e.hora || e.hora >= horaActual);
    if (eventosRestantes.length > 0) {
      const e = eventosRestantes[0];
      senales.push({
        id: `evento-${e.id}`,
        texto: `Todavía hoy: ${e.titulo}${e.hora ? ` a las ${e.hora}` : ""}`,
        urgencia: "atencion",
        href: "/inicio",
      });
    }
    if (paraHoy.length > 0) {
      senales.push({
        id: "acciones-hoy",
        texto:
          paraHoy.length === 1
            ? `Sigue abierta la de hoy: "${paraHoy[0].titulo}"`
            : `${paraHoy.length} acciones de hoy siguen abiertas`,
        urgencia: "atencion",
        href: "/acciones",
      });
    }
  }

  if (momento === "noche") {
    if (paraHoy.length > 0) {
      senales.push({
        id: "acciones-hoy",
        texto:
          paraHoy.length === 1
            ? `Quedó sin cerrar: "${paraHoy[0].titulo}"`
            : `${paraHoy.length} acciones de hoy quedaron sin cerrar`,
        urgencia: "atencion",
        href: "/acciones",
      });
    }
    const manana = sumarDias(hoy, 1);
    const eventosManana = [...datos.agenda].filter((e) => e.fecha === manana).sort((a, b) => a.hora.localeCompare(b.hora));
    if (eventosManana.length > 0) {
      const e = eventosManana[0];
      senales.push({
        id: `evento-${e.id}`,
        texto: `Mañana: ${e.titulo}${e.hora ? ` a las ${e.hora}` : ""}`,
        urgencia: "informativa",
        href: "/inicio",
      });
    }
  }

  // --- Señales de fondo, en cualquier momento ---

  const esperando = [...datos.personas]
    .filter((p) => (p.diasSinResponder ?? 0) >= 5)
    .sort((a, b) => (b.diasSinResponder ?? 0) - (a.diasSinResponder ?? 0));
  if (esperando.length > 0) {
    const p = esperando[0];
    senales.push({
      id: `persona-${p.id}`,
      texto: `${p.nombre} lleva ${p.diasSinResponder} días sin responder`,
      urgencia: "atencion",
      href: "/proyectos",
    });
  }

  // Cerrar el ciclo: si decidió algo hace 30, 60 o 90 días y nunca registró
  // qué pasó, se pregunta una vez. Sin esto el aprendizaje nunca ocurre,
  // porque nadie vuelve solo a un caso cerrado hace tres meses.
  const paraCierre = datos.decisiones.filter((d) => {
    if (!d.fechaDecision || d.resultadoPosterior) return false;
    const diasDesde = -diasHasta(d.fechaDecision, hoy);
    return diasDesde === 30 || diasDesde === 60 || diasDesde === 90;
  });
  if (paraCierre.length > 0) {
    const d = paraCierre[0];
    const diasDesde = -diasHasta(d.fechaDecision as string, hoy);
    const caso = datos.strategicCases.find((c) => c.decisionId === d.id);
    senales.push({
      id: `cierre-${d.id}`,
      texto:
        `Hace ${diasDesde} días decidiste "${d.pregunta}". ¿Qué pasó?` +
        (caso?.hipotesisCritica ? ` La hipótesis era: ${caso.hipotesisCritica}` : ""),
      urgencia: "informativa",
      href: `/decisiones?open=${d.id}`,
    });
  }

  const marco = ENCUADRE[momento];
  return {
    momento,
    titulo: marco.titulo,
    encuadre: marco.encuadre,
    senales,
    hayCritico: senales.some((s) => s.urgencia === "critica"),
  };
}

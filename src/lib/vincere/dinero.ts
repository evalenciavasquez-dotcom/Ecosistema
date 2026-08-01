import {
  VincereFuenteTipo,
  VincereIngreso,
  VincereProyecto,
  VincereVinculo,
  VINCERE_MONEDA_POR_DEFECTO,
} from "./types";

// Moneda base del proyecto, con respaldo para los guardados antes de que el
// campo existiera.
export function monedaDe(p: VincereProyecto): string {
  return p.moneda?.trim() || VINCERE_MONEDA_POR_DEFECTO;
}

// Cálculos de dinero. Viven acá y no en el prompt a propósito: sumar, dividir y
// sacar porcentajes son operaciones exactas, y un modelo de lenguaje las falla
// lo justo como para arruinar una lectura de negocio. La IA recibe los números
// ya resueltos y solo los interpreta.
//
// Sobre monedas: NO se convierte nada. Sumar pesos con dólares usando un tipo
// de cambio inventado produce un número que parece correcto y no lo es, y ese
// error se propaga a todo lo demás. Se agrupa por moneda y se muestran por
// separado; si hay varias, se dice.

export interface TotalPorMoneda {
  moneda: string;
  total: number;
}

export interface ParticipacionFuente {
  tipo: VincereFuenteTipo;
  total: number;
  pct: number;
}

export interface ResumenDinero {
  // Los shows entran solos desde Touring: su ingreso neto ya está cargado ahí
  // y volver a escribirlo sería duplicar.
  ingresos: VincereIngreso[];
  monedas: TotalPorMoneda[];
  monedaPrincipal: string | null;
  variasMonedas: boolean;
  totalPrincipal: number;
  porFuente: ParticipacionFuente[];
  // Concentración: qué porcentaje viene de la fuente más grande. Por encima de
  // 70 el negocio depende de una sola pata.
  concentracionPct: number;
  fuenteDominante: VincereFuenteTipo | null;
  meses: number;
  promedioMensual: number;
  // El par de números que pone el alcance en su lugar. El primero es lo que
  // paga el streaming; el segundo, lo que vale esa misma audiencia contando
  // TODO lo que entra. La distancia entre ambos es la lectura.
  porMilStreams: number | null; // Solo ingreso de streaming.
  porMilStreamsTotal: number | null; // Ingreso total sobre la misma base.
}

const PERIODO_RE = /^\d{4}-\d{2}$/;

// Convierte los shows registrados en Touring a entradas de ingreso, para que
// el registro no exija volver a escribir lo que ya está en el sistema.
export function ingresosDeShows(p: VincereProyecto): VincereIngreso[] {
  return (p.shows ?? [])
    .filter((s) => s.ingresoNeto != null && s.ingresoNeto > 0)
    .map((s) => ({
      id: `show-${s.id}`,
      tipo: "shows" as const,
      monto: s.ingresoNeto as number,
      moneda: s.moneda || monedaDe(p),
      periodo: s.fecha.slice(0, 7),
      nota: `${s.sala || "Show"} en ${s.ciudad}`,
    }));
}

export function resumirDinero(p: VincereProyecto): ResumenDinero {
  const manuales = (p.ingresos ?? []).filter((i) => i.monto > 0);
  const ingresos = [...manuales, ...ingresosDeShows(p)];

  const base = monedaDe(p);
  const porMoneda = new Map<string, number>();
  for (const i of ingresos) {
    const m = i.moneda || base;
    porMoneda.set(m, (porMoneda.get(m) ?? 0) + i.monto);
  }
  const monedas: TotalPorMoneda[] = [...porMoneda.entries()]
    .map(([moneda, total]) => ({ moneda, total }))
    .sort((a, b) => b.total - a.total);

  const monedaPrincipal = monedas[0]?.moneda ?? null;
  const totalPrincipal = monedas[0]?.total ?? 0;
  // Todo lo que sigue se calcula SOLO sobre la moneda principal. Mezclar
  // monedas en un porcentaje da un reparto falso.
  const deLaPrincipal = ingresos.filter((i) => (i.moneda || base) === monedaPrincipal);

  const acumFuente = new Map<VincereFuenteTipo, number>();
  for (const i of deLaPrincipal) {
    acumFuente.set(i.tipo, (acumFuente.get(i.tipo) ?? 0) + i.monto);
  }
  const porFuente: ParticipacionFuente[] = [...acumFuente.entries()]
    .map(([tipo, total]) => ({
      tipo,
      total,
      pct: totalPrincipal > 0 ? Math.round((total / totalPrincipal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const periodos = new Set(deLaPrincipal.map((i) => i.periodo).filter((x) => PERIODO_RE.test(x)));
  const meses = Math.max(1, periodos.size);
  const promedioMensual = Math.round(totalPrincipal / meses);

  const streamingMensual = (acumFuente.get("streaming") ?? 0) / meses;
  const streamsMes = p.resumen.streamsMes;
  const porMilStreams = streamsMes > 0 && streamingMensual > 0 ? (streamingMensual / streamsMes) * 1000 : null;
  // Se usa el promedio mensual y no el acumulado: dividir el total de varios
  // meses entre los streams de UN mes daría un número inflado.
  const porMilStreamsTotal =
    streamsMes > 0 && promedioMensual > 0 ? (promedioMensual / streamsMes) * 1000 : null;

  return {
    ingresos,
    monedas,
    monedaPrincipal,
    variasMonedas: monedas.length > 1,
    totalPrincipal,
    porFuente,
    concentracionPct: porFuente[0]?.pct ?? 0,
    fuenteDominante: porFuente[0]?.tipo ?? null,
    meses,
    promedioMensual,
    porMilStreams,
    porMilStreamsTotal,
  };
}

export interface LoMio {
  aplica: boolean;
  // Por qué vía entra: participación sobre ingresos, o tarifa fija.
  via: "participacion" | "tarifa" | null;
  mensual: number | null;
  moneda: string | null;
  // Un vínculo sin confirmar es hipótesis: se calcula igual, pero se marca.
  hipotetico: boolean;
  explicacion: string;
}

export function calcularLoMio(v: VincereVinculo | null | undefined, r: ResumenDinero): LoMio {
  const nada: LoMio = {
    aplica: false,
    via: null,
    mensual: null,
    moneda: null,
    hipotetico: false,
    explicacion: "",
  };
  if (!v || v.tipo === "ninguno") {
    return { ...nada, explicacion: "No hay vínculo de negocio con este proyecto." };
  }

  const hipotetico = !v.confirmado;

  if (v.tipo === "cliente") {
    if (v.tarifa == null) {
      return { ...nada, explicacion: "Es un cliente, pero todavía no hay tarifa cargada." };
    }
    // Una tarifa es independiente de lo que gane el artista: es lo que se
    // factura, entre o no entre dinero del otro lado.
    return {
      aplica: true,
      via: "tarifa",
      mensual: v.tarifa,
      moneda: v.moneda,
      hipotetico,
      explicacion: `Tarifa ${v.periodicidad || "acordada"}, independiente de lo que ingrese el artista.`,
    };
  }

  if (v.tipo === "propio" || v.tipo === "socio" || v.tipo === "evaluando") {
    if (v.participacionPct == null) {
      return { ...nada, explicacion: "Falta cargar el porcentaje de participación." };
    }
    if (r.promedioMensual <= 0) {
      return {
        ...nada,
        explicacion: `${v.participacionPct}% de participación, pero todavía no hay ingresos cargados para calcular sobre qué.`,
      };
    }
    return {
      aplica: true,
      via: "participacion",
      mensual: Math.round((r.promedioMensual * v.participacionPct) / 100),
      moneda: r.monedaPrincipal,
      hipotetico,
      explicacion: `${v.participacionPct}% sobre el promedio mensual de ${r.meses} ${r.meses === 1 ? "mes" : "meses"} cargados.`,
    };
  }

  return nada;
}

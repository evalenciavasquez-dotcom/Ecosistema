import { MetaFinanciera, MovimientoEconomico } from "./types";

function sumByMoneda(movs: MovimientoEconomico[]): Record<string, number> {
  const out: Record<string, number> = {};
  movs.forEach((m) => {
    out[m.moneda] = (out[m.moneda] ?? 0) + m.monto;
  });
  return out;
}

function mergeMonedas(...records: Record<string, number>[]): string[] {
  const set = new Set<string>();
  records.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  return Array.from(set).sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)));
}

function diasEntre(fechaISO: string, hoy: string): number {
  return Math.round((new Date(fechaISO).getTime() - new Date(hoy).getTime()) / 86400000);
}

export interface RunwayInfo {
  moneda: string;
  cajaActual: number;
  gastoMensualPromedio: number;
  mesesRunway: number | null;
}

// Runway = caja confirmada / gasto mensual promedio, calculado sobre gastos
// confirmados de los últimos 90 días (o todo el historial si hay menos).
export function computeRunway(movimientos: MovimientoEconomico[], hoyISO: string): RunwayInfo[] {
  const confirmados = movimientos.filter((m) => m.estado === "confirmado");
  const ingresos = sumByMoneda(confirmados.filter((m) => m.tipo === "ingreso"));
  const gastos = sumByMoneda(confirmados.filter((m) => m.tipo === "gasto"));
  const monedas = mergeMonedas(ingresos, gastos);

  const desde90 = new Date(hoyISO);
  desde90.setDate(desde90.getDate() - 90);
  const desde90ISO = desde90.toISOString().slice(0, 10);

  return monedas.map((moneda) => {
    const cajaActual = (ingresos[moneda] ?? 0) - (gastos[moneda] ?? 0);
    const gastosRecientes = confirmados.filter(
      (m) => m.tipo === "gasto" && m.moneda === moneda && m.fecha >= desde90ISO
    );
    const totalReciente = gastosRecientes.reduce((acc, m) => acc + m.monto, 0);
    const mesesConDatos = new Set(gastosRecientes.map((m) => m.fecha.slice(0, 7))).size || 1;
    const gastoMensualPromedio = totalReciente / Math.max(mesesConDatos, 1);
    return {
      moneda,
      cajaActual,
      gastoMensualPromedio,
      mesesRunway: gastoMensualPromedio > 0 ? cajaActual / gastoMensualPromedio : null,
    };
  });
}

export interface ProyeccionPunto {
  moneda: string;
  cajaActual: number;
  proyeccion30: number;
  proyeccion60: number;
  proyeccion90: number;
}

// Caja actual + ingresos esperados − gastos esperados con vencimiento dentro
// de cada ventana (incluye esperados vencidos, porque siguen pendientes de cobrar/pagar).
export function computeProyeccion(movimientos: MovimientoEconomico[], hoyISO: string): ProyeccionPunto[] {
  const confirmados = movimientos.filter((m) => m.estado === "confirmado");
  const ingresosConf = sumByMoneda(confirmados.filter((m) => m.tipo === "ingreso"));
  const gastosConf = sumByMoneda(confirmados.filter((m) => m.tipo === "gasto"));
  const esperados = movimientos.filter((m) => m.estado === "esperado");
  const monedas = mergeMonedas(ingresosConf, gastosConf, sumByMoneda(esperados));

  function proyectarA(dias: number, moneda: string, cajaActual: number): number {
    const enVentana = esperados.filter((m) => m.moneda === moneda && diasEntre(m.fecha, hoyISO) <= dias);
    const ing = enVentana.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
    const gas = enVentana.filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.monto, 0);
    return cajaActual + ing - gas;
  }

  return monedas.map((moneda) => {
    const cajaActual = (ingresosConf[moneda] ?? 0) - (gastosConf[moneda] ?? 0);
    return {
      moneda,
      cajaActual,
      proyeccion30: proyectarA(30, moneda, cajaActual),
      proyeccion60: proyectarA(60, moneda, cajaActual),
      proyeccion90: proyectarA(90, moneda, cajaActual),
    };
  });
}

export interface SaldoPorCuenta {
  cuenta: string;
  moneda: string;
  saldo: number;
}

export function computeCajaPorCuenta(movimientos: MovimientoEconomico[]): SaldoPorCuenta[] {
  const porCuenta = new Map<string, SaldoPorCuenta>();
  movimientos
    .filter((m) => m.estado === "confirmado")
    .forEach((m) => {
      const key = `${m.cuenta}__${m.moneda}`;
      const actual = porCuenta.get(key) ?? { cuenta: m.cuenta, moneda: m.moneda, saldo: 0 };
      actual.saldo += m.tipo === "ingreso" ? m.monto : -m.monto;
      porCuenta.set(key, actual);
    });
  return Array.from(porCuenta.values()).sort((a, b) => b.saldo - a.saldo);
}

export interface ResumenMensual {
  moneda: string;
  ingresosMes: number;
  gastosMes: number;
  deficitMes: number;
}

// Ingresos y gastos CONFIRMADOS del mes calendario actual (según hoyISO),
// y el déficit resultante (negativo = gastó más de lo que confirmó de ingreso).
export function computeResumenMensual(movimientos: MovimientoEconomico[], hoyISO: string): ResumenMensual[] {
  const mesActual = hoyISO.slice(0, 7);
  const delMes = movimientos.filter((m) => m.estado === "confirmado" && m.fecha.slice(0, 7) === mesActual);
  const ingresos = sumByMoneda(delMes.filter((m) => m.tipo === "ingreso"));
  const gastos = sumByMoneda(delMes.filter((m) => m.tipo === "gasto"));
  const monedas = mergeMonedas(ingresos, gastos);
  return monedas.map((moneda) => ({
    moneda,
    ingresosMes: ingresos[moneda] ?? 0,
    gastosMes: gastos[moneda] ?? 0,
    deficitMes: (ingresos[moneda] ?? 0) - (gastos[moneda] ?? 0),
  }));
}

export interface PagoPendiente {
  id: string;
  descripcion: string;
  monto: number;
  moneda: string;
  fecha: string;
  diasRestantes: number;
}

export interface PagosPendientesVentanas {
  dias3: PagoPendiente[];
  dias5: PagoPendiente[];
  dias8: PagoPendiente[];
}

// Gastos "esperado" (por pagar) que vencen hoy o en los próximos 3/5/8 días —
// ventanas acumulativas para dar visibilidad de corto plazo sobre lo que se
// viene. No incluye ingresos esperados: esto es específicamente "qué debo pagar".
export function computePagosPendientes(movimientos: MovimientoEconomico[], hoyISO: string): PagosPendientesVentanas {
  const pendientes = movimientos
    .filter((m) => m.tipo === "gasto" && m.estado === "esperado" && m.fecha >= hoyISO)
    .map((m) => ({
      id: m.id,
      descripcion: m.descripcion,
      monto: m.monto,
      moneda: m.moneda,
      fecha: m.fecha,
      diasRestantes: diasEntre(m.fecha, hoyISO),
    }))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return {
    dias3: pendientes.filter((p) => p.diasRestantes <= 3),
    dias5: pendientes.filter((p) => p.diasRestantes <= 5),
    dias8: pendientes.filter((p) => p.diasRestantes <= 8),
  };
}

export interface SplitPersonalProyectos {
  moneda: string;
  personal: number;
  proyectos: number;
}

// Divide la caja confirmada entre movimientos sin proyecto (personal/general)
// y movimientos amarrados a un proyecto — usando el mismo dato ya registrado,
// sin pedirle a Eduardo que clasifique nada de nuevo.
export function computeSplitPersonalProyectos(movimientos: MovimientoEconomico[]): SplitPersonalProyectos[] {
  const confirmados = movimientos.filter((m) => m.estado === "confirmado");
  const personal = sumByMoneda(
    confirmados.filter((m) => !m.proyectoId).map((m) => ({ ...m, monto: m.tipo === "ingreso" ? m.monto : -m.monto }))
  );
  const proyectos = sumByMoneda(
    confirmados.filter((m) => m.proyectoId).map((m) => ({ ...m, monto: m.tipo === "ingreso" ? m.monto : -m.monto }))
  );
  const monedas = mergeMonedas(personal, proyectos);
  return monedas.map((moneda) => ({
    moneda,
    personal: personal[moneda] ?? 0,
    proyectos: proyectos[moneda] ?? 0,
  }));
}

export interface ProgresoMeta {
  id: string;
  descripcion: string;
  moneda: string;
  montoInicial: number;
  montoObjetivo: number;
  montoActual: number;
  progreso: number; // 0..1
  cumplida: boolean;
  diasRestantes: number | null;
}

// Avance real hacia una meta financiera personal — mide sobre la caja
// personal (movimientos sin proyecto, igual que computeSplitPersonalProyectos)
// desde el punto de partida capturado al crear la meta. La misma fórmula
// sirve tanto para "ahorrar hasta X" como para "salir de deuda hasta 0":
// lo que importa es el avance entre el inicio y el objetivo, sea cual sea
// la dirección.
export function computeProgresoMetas(
  metas: MetaFinanciera[],
  movimientos: MovimientoEconomico[],
  hoyISO: string
): ProgresoMeta[] {
  const split = computeSplitPersonalProyectos(movimientos);
  const actualPorMoneda = new Map(split.map((s) => [s.moneda, s.personal]));

  return metas.map((m) => {
    const montoActual = actualPorMoneda.get(m.moneda) ?? 0;
    const rango = m.montoObjetivo - m.montoInicial;
    const avance = montoActual - m.montoInicial;
    const progreso = rango === 0 ? 1 : Math.min(1, Math.max(0, avance / rango));
    const cumplida = rango >= 0 ? montoActual >= m.montoObjetivo : montoActual <= m.montoObjetivo;
    return {
      id: m.id,
      descripcion: m.descripcion,
      moneda: m.moneda,
      montoInicial: m.montoInicial,
      montoObjetivo: m.montoObjetivo,
      montoActual,
      progreso,
      cumplida,
      diasRestantes: m.fechaObjetivo ? diasEntre(m.fechaObjetivo, hoyISO) : null,
    };
  });
}

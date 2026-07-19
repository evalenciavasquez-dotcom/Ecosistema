import { MovimientoEconomico } from "./types";

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

import { computeProgresoMetas, computeRunway } from "./finanzas";
import type {
  CierreCategoriaGasto,
  CierreMetaSnapshot,
  CierrePagoVencido,
  CierreResumenMoneda,
  Decision,
  MetaFinanciera,
  MovimientoEconomico,
  Proyecto,
  RegistroTiempo,
} from "./types";

// Motor de cálculo del cierre económico mensual — funciones puras, sin IA,
// reutilizables tanto por el cierre general (todo el sistema) como por el
// cierre de un proyecto individual (pasando su propio subconjunto de
// movimientos/tiempo). La lectura estratégica y el semáforo los produce la
// IA por separado, a partir de lo que estas funciones calculan.

export function mesAnterior(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "31" como límite superior funciona por comparación de texto aunque el mes
// no tenga 31 días — solo se usa para acotar "hasta el final de este mes".
function finDeMes(mes: string): string {
  return `${mes}-31`;
}

function sumaTipo(movs: MovimientoEconomico[], tipo: "ingreso" | "gasto"): number {
  return movs.filter((m) => m.tipo === tipo).reduce((acc, m) => acc + m.monto, 0);
}

export function computeResumenPorMoneda(movimientos: MovimientoEconomico[], mes: string): CierreResumenMoneda[] {
  const mesPrev = mesAnterior(mes);
  const corte = finDeMes(mes);
  const confirmados = movimientos.filter((m) => m.estado === "confirmado" && m.fecha <= corte);
  const delMes = confirmados.filter((m) => m.fecha.slice(0, 7) === mes);
  const delMesPrev = confirmados.filter((m) => m.fecha.slice(0, 7) === mesPrev);

  const monedas = Array.from(new Set(confirmados.map((m) => m.moneda))).sort((a, b) =>
    a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)
  );
  const runway = computeRunway(confirmados, corte);

  return monedas.map((moneda) => {
    const runwayMoneda = runway.find((r) => r.moneda === moneda);
    return {
      moneda,
      ingresosMes: sumaTipo(delMes.filter((m) => m.moneda === moneda), "ingreso"),
      gastosMes: sumaTipo(delMes.filter((m) => m.moneda === moneda), "gasto"),
      deficitMes:
        sumaTipo(delMes.filter((m) => m.moneda === moneda), "ingreso") -
        sumaTipo(delMes.filter((m) => m.moneda === moneda), "gasto"),
      ingresosMesAnterior: sumaTipo(delMesPrev.filter((m) => m.moneda === moneda), "ingreso"),
      gastosMesAnterior: sumaTipo(delMesPrev.filter((m) => m.moneda === moneda), "gasto"),
      cajaActual: runwayMoneda?.cajaActual ?? 0,
      mesesRunway: runwayMoneda?.mesesRunway ?? null,
    };
  });
}

// Agrupa los gastos confirmados del mes por "fuente" — el campo libre más
// parecido a una categoría que existe hoy. Top 8 por moneda para no saturar
// el cierre con detalle mínimo.
export function computeCategoriasGasto(movimientos: MovimientoEconomico[], mes: string): CierreCategoriaGasto[] {
  const delMes = movimientos.filter(
    (m) => m.estado === "confirmado" && m.tipo === "gasto" && m.fecha.slice(0, 7) === mes
  );
  const grupos = new Map<string, number>();
  delMes.forEach((m) => {
    const key = `${m.fuente || "Sin especificar"}__${m.moneda}`;
    grupos.set(key, (grupos.get(key) ?? 0) + m.monto);
  });
  return Array.from(grupos.entries())
    .map(([key, monto]) => {
      const [categoria, moneda] = key.split("__");
      return { categoria, moneda, monto };
    })
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 8);
}

// Gastos "esperado" cuya fecha ya pasó el corte del mes que se cierra —
// siguen sin pagarse, y si cruzan al mes siguiente hay que priorizarlos.
export function computePagosVencidos(movimientos: MovimientoEconomico[], mes: string): CierrePagoVencido[] {
  const corte = finDeMes(mes);
  return movimientos
    .filter((m) => m.tipo === "gasto" && m.estado === "esperado" && m.fecha <= corte)
    .map((m) => ({
      descripcion: m.descripcion,
      monto: m.monto,
      moneda: m.moneda,
      fecha: m.fecha,
      diasVencido: Math.max(0, Math.round((new Date(corte).getTime() - new Date(m.fecha).getTime()) / 86400000)),
    }))
    .sort((a, b) => b.diasVencido - a.diasVencido);
}

export function computeMetasSnapshot(
  metas: MetaFinanciera[],
  movimientos: MovimientoEconomico[],
  mes: string
): CierreMetaSnapshot[] {
  const corte = finDeMes(mes);
  const confirmados = movimientos.filter((m) => m.fecha <= corte);
  return computeProgresoMetas(metas, confirmados, corte).map((p) => ({
    descripcion: p.descripcion,
    moneda: p.moneda,
    progreso: p.progreso,
    cumplida: p.cumplida,
  }));
}

export function computeProyectosEnRiesgo(proyectos: Proyecto[]): string[] {
  return proyectos.filter((p) => p.estado === "En riesgo" || p.estado === "En cierre").map((p) => p.nombre);
}

export function computeDecisionesSinCerrar(decisiones: Decision[]): string[] {
  return decisiones.filter((d) => d.estado === "Decidida" && !d.resultadoPosterior.trim()).map((d) => d.pregunta);
}

// Horas (no minutos) invertidas en el proyecto durante ese mes calendario —
// para poder comparar contra el ingreso que ese mismo mes generó.
export function horasInvertidasEnMes(tiempo: RegistroTiempo[], proyectoId: string, mes: string): number {
  const minutos = tiempo
    .filter((t) => t.proyectoId === proyectoId && t.fecha.slice(0, 7) === mes)
    .reduce((acc, t) => acc + t.minutos, 0);
  return Math.round((minutos / 60) * 10) / 10;
}

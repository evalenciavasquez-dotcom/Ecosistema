import {
  Accion,
  Decision,
  Evidencia,
  HistorialEntry,
  MovimientoEconomico,
  Proyecto,
  RegistroTiempo,
} from "./types";
import { formatMinutos, hoyISO, inicioSemanaISO, minutosDe } from "./tiempo";

export type KpiTone = "green" | "amber" | "red" | undefined;

export interface KpiTile {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function formatMonto(value: number, moneda: string): string {
  const signo = value < 0 ? "-" : "";
  return `${signo}${Math.abs(value).toLocaleString("es-ES")} ${moneda}`;
}

// Cada KPI solo aparece si el proyecto tiene los datos que lo sustentan —
// nada de tiles vacíos ni inventados.
export function computeProjectKpis(
  proyecto: Proyecto,
  acciones: Accion[],
  decisiones: Decision[],
  evidencias: Evidencia[],
  movimientos: MovimientoEconomico[],
  tiempo: RegistroTiempo[],
  historial: HistorialEntry[]
): KpiTile[] {
  const tiles: KpiTile[] = [];
  const hoy = hoyISO();

  const accionesProy = acciones.filter((a) => a.proyectoId === proyecto.id);
  if (accionesProy.length > 0) {
    const canceladas = accionesProy.filter((a) => a.estado === "Cancelada").length;
    const activas = accionesProy.length - canceladas;
    const completadas = accionesProy.filter((a) => a.estado === "Completada").length;
    if (activas > 0) {
      const ejecucion = pct(completadas, activas);
      tiles.push({
        key: "ejecucion",
        label: "Ejecución de acciones",
        value: `${ejecucion}%`,
        sub: `${completadas}/${activas} completadas`,
        tone: ejecucion >= 70 ? "green" : ejecucion >= 40 ? "amber" : "red",
      });
    }

    const vencidas = accionesProy.filter(
      (a) => (a.estado === "Pendiente" || a.estado === "En curso") && a.fecha && a.fecha < hoy
    );
    tiles.push({
      key: "vencidas",
      label: "Acciones vencidas",
      value: String(vencidas.length),
      tone: vencidas.length === 0 ? "green" : vencidas.length <= 2 ? "amber" : "red",
    });

    const completadasATiempo = historial
      .filter((h) => h.entidadTipo === "accion" && h.cambio.includes('"Completada"'))
      .map((h) => {
        const acc = accionesProy.find((a) => a.id === h.entidadId);
        if (!acc || !acc.fecha) return null;
        return h.timestamp.slice(0, 10) <= acc.fecha;
      })
      .filter((v): v is boolean => v !== null);
    if (completadasATiempo.length > 0) {
      const aTiempoPct = pct(completadasATiempo.filter(Boolean).length, completadasATiempo.length);
      tiles.push({
        key: "cumplimiento",
        label: "Completadas a tiempo",
        value: `${aTiempoPct}%`,
        sub: `${completadasATiempo.length} con fecha registrada`,
        tone: aTiempoPct >= 70 ? "green" : aTiempoPct >= 40 ? "amber" : "red",
      });
    }
  }

  const tiempoProy = tiempo.filter((t) => t.proyectoId === proyecto.id);
  if (tiempoProy.length > 0) {
    const totalMin = tiempoProy.reduce((acc, t) => acc + t.minutos, 0);
    const semanaMin = minutosDe(tiempoProy, proyecto.id, inicioSemanaISO());
    tiles.push({
      key: "tiempo",
      label: "Tiempo invertido",
      value: formatMinutos(totalMin),
      sub: `${formatMinutos(semanaMin)} esta semana`,
    });
  }

  const movProy = movimientos.filter((m) => m.proyectoId === proyecto.id);
  if (movProy.length > 0) {
    const porMoneda: Record<string, number> = {};
    movProy.forEach((m) => {
      porMoneda[m.moneda] = (porMoneda[m.moneda] ?? 0) + (m.tipo === "ingreso" ? m.monto : -m.monto);
    });
    Object.entries(porMoneda).forEach(([moneda, valor]) => {
      tiles.push({
        key: `balance-${moneda}`,
        label: `Balance (${moneda})`,
        value: formatMonto(valor, moneda),
        tone: valor >= 0 ? "green" : "red",
      });
    });
  }

  const decProy = decisiones.filter((d) => d.proyectoId === proyecto.id);
  if (decProy.length > 0) {
    const resueltas = decProy.filter((d) => d.estado === "Decidida" || d.estado === "Cerrada").length;
    tiles.push({
      key: "decisiones",
      label: "Decisiones resueltas",
      value: `${pct(resueltas, decProy.length)}%`,
      sub: `${resueltas}/${decProy.length}`,
    });
  }

  const evProy = evidencias.filter((e) => e.proyectoId === proyecto.id);
  if (evProy.length > 0) {
    const solidas = evProy.filter(
      (e) => e.nivelConfiabilidad === "verificado" || e.nivelConfiabilidad === "documentado"
    ).length;
    const evidenciaPct = pct(solidas, evProy.length);
    tiles.push({
      key: "evidencia",
      label: "Evidencia sólida",
      value: `${evidenciaPct}%`,
      sub: `${solidas}/${evProy.length} verificada o documentada`,
      tone: evidenciaPct >= 70 ? "green" : evidenciaPct >= 40 ? "amber" : undefined,
    });
  }

  return tiles;
}

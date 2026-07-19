"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { proyectoNombre } from "@/lib/selectors";
import { EvidenceLevel, MovimientoEconomico, MovimientoEstado, MovimientoTipo } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";
import { EvidenceBadge } from "@/components/ui/badges";

interface InterpretacionEconomia {
  diagnostico: string;
  pasosASeguir: string[];
  rutasMejoraDeficit: string[];
  evidenceLevel: EvidenceLevel;
}
import {
  computeCajaPorCuenta,
  computePagosPendientes,
  computeProgresoMetas,
  computeProyeccion,
  computeResumenMensual,
  computeRunway,
  computeSplitPersonalProyectos,
} from "@/lib/finanzas";
import { hoyISO } from "@/lib/tiempo";

const ESTADO_TONE: Record<MovimientoEstado, "green" | "amber" | "red"> = {
  confirmado: "green",
  esperado: "amber",
  sin_conciliar: "red",
};

const ESTADO_LABEL: Record<MovimientoEstado, string> = {
  confirmado: "Confirmado",
  esperado: "Esperado",
  sin_conciliar: "Sin conciliar",
};

const TIPO_LABEL: Record<MovimientoTipo, string> = {
  ingreso: "Ingresos",
  gasto: "Gastos",
};

const MONEDAS = ["USD", "COP"] as const;
const MONEDA_LABEL: Record<string, string> = {
  USD: "Dólares (USD)",
  COP: "Pesos (COP)",
};

function formatMonto(value: number, moneda: string) {
  const signo = value < 0 ? "-" : "";
  return `${signo}$${Math.abs(value).toLocaleString("es-ES")} ${moneda}`;
}

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

function sumPagosPorMoneda(pagos: { moneda: string; monto: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  pagos.forEach((p) => {
    out[p.moneda] = (out[p.moneda] ?? 0) + p.monto;
  });
  return out;
}

export default function EconomiaPage() {
  const router = useRouter();
  const movimientos = useAppStore((s) => s.movimientos);
  const proyectos = useAppStore((s) => s.proyectos);
  const metasFinancieras = useAppStore((s) => s.metasFinancieras);
  const deleteMetaFinanciera = useAppStore((s) => s.deleteMetaFinanciera);
  const decisionesAbiertas = useAppStore((s) => s.decisiones).filter((d) => d.estado === "Abierta");
  const proyectosConAnalisis = proyectos.filter((p) => p.analisisEconomico);
  const [showNew, setShowNew] = useState(false);
  const [showNewMeta, setShowNewMeta] = useState(false);
  const [editando, setEditando] = useState<MovimientoEconomico | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | MovimientoEstado>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | MovimientoTipo>("Todos");

  const ingresosConfirmados = sumByMoneda(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "confirmado"));
  const ingresosEsperados = sumByMoneda(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "esperado"));
  const gastosConfirmados = sumByMoneda(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "confirmado"));
  const gastosEsperados = sumByMoneda(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "esperado"));
  const sinConciliar = movimientos.filter((m) => m.estado === "sin_conciliar");
  const esperadosVencidos = movimientos.filter(
    (m) => m.estado === "esperado" && m.fecha && m.fecha < hoyISO()
  );

  const monedasCaja = mergeMonedas(ingresosConfirmados, gastosConfirmados);
  const caja: Record<string, number> = {};
  monedasCaja.forEach((m) => {
    caja[m] = (ingresosConfirmados[m] ?? 0) - (gastosConfirmados[m] ?? 0);
  });

  const monedasBrecha = mergeMonedas(caja, ingresosEsperados, gastosEsperados);
  const brecha: Record<string, number> = {};
  monedasBrecha.forEach((m) => {
    brecha[m] = (caja[m] ?? 0) + (ingresosEsperados[m] ?? 0) - (gastosEsperados[m] ?? 0);
  });

  const cajaPorCuenta = useMemo(() => computeCajaPorCuenta(movimientos), [movimientos]);

  const visibles = movimientos.filter(
    (m) => (filtroEstado === "Todos" || m.estado === filtroEstado) && (filtroTipo === "Todos" || m.tipo === filtroTipo)
  );

  const hoy = hoyISO();
  const runway = useMemo(() => computeRunway(movimientos, hoy), [movimientos, hoy]);
  const proyeccion = useMemo(() => computeProyeccion(movimientos, hoy), [movimientos, hoy]);
  const splitPersonal = useMemo(() => computeSplitPersonalProyectos(movimientos), [movimientos]);
  const resumenMensual = useMemo(() => computeResumenMensual(movimientos, hoy), [movimientos, hoy]);
  const pagosPendientes = useMemo(() => computePagosPendientes(movimientos, hoy), [movimientos, hoy]);
  const progresoMetas = useMemo(
    () => computeProgresoMetas(metasFinancieras, movimientos, hoy),
    [metasFinancieras, movimientos, hoy]
  );

  const [interpretacion, setInterpretacion] = useState<InterpretacionEconomia | null>(null);
  const [interpretando, setInterpretando] = useState(false);
  const [errorInterpretacion, setErrorInterpretacion] = useState("");

  async function handleInterpretar() {
    setInterpretando(true);
    setErrorInterpretacion("");
    try {
      const res = await fetch("/api/interpret-economia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runway,
          proyeccion,
          splitPersonal,
          cajaPorCuenta,
          resumenMensual,
          pagosPendientes: {
            dias3: pagosPendientes.dias3.map((p) => ({ descripcion: p.descripcion, monto: p.monto, moneda: p.moneda, fecha: p.fecha })),
            dias5: pagosPendientes.dias5.map((p) => ({ descripcion: p.descripcion, monto: p.monto, moneda: p.moneda, fecha: p.fecha })),
            dias8: pagosPendientes.dias8.map((p) => ({ descripcion: p.descripcion, monto: p.monto, moneda: p.moneda, fecha: p.fecha })),
          },
          movimientosSinConciliar: sinConciliar.length,
          movimientosEsperadosVencidos: esperadosVencidos.map((m) => ({
            descripcion: m.descripcion,
            monto: m.monto,
            moneda: m.moneda,
            tipo: m.tipo,
            fecha: m.fecha,
          })),
          decisionesAbiertas: decisionesAbiertas.map((d) => ({
            pregunta: d.pregunta,
            nivelRiesgo: d.nivelRiesgo,
            impactoEconomico: d.impactoEconomico,
            recomendacionSistema: d.recomendacionSistema,
            proyecto: proyectoNombre(proyectos, d.proyectoId),
          })),
          proyectosPotencial: proyectosConAnalisis.map((p) => ({
            nombre: p.nombre,
            potencialIngresos: p.analisisEconomico!.potencialIngresos,
            viasMonetizacion: p.analisisEconomico!.viasMonetizacion,
            impactoEnCajaPersonal: p.analisisEconomico!.impactoEnCajaPersonal,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorInterpretacion(body.error ?? "No se pudo generar la interpretación");
        return;
      }
      setInterpretacion(body.result);
    } catch {
      setErrorInterpretacion("Error de conexión al interpretar");
    } finally {
      setInterpretando(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-wide text-accent-blue font-semibold">
            Metas financieras personales
          </div>
          <button
            onClick={() => setShowNewMeta(true)}
            className="rounded-full bg-accent-blue text-white text-xs font-medium px-3 py-1.5 shrink-0"
          >
            + Nueva meta
          </button>
        </div>

        {progresoMetas.length === 0 ? (
          <p className="text-sm text-muted">
            Define a dónde quieres llegar — salir de un hueco, armar un ahorro — y aquí ves el avance real, aparte
            del negocio.
          </p>
        ) : (
          <div className="space-y-3">
            {progresoMetas.map((m) => (
              <div key={m.id} className="rounded-xl bg-surface-2 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium">{m.descripcion}</span>
                  <button
                    onClick={() => deleteMetaFinanciera(m.id)}
                    className="text-accent-red text-xs shrink-0"
                    aria-label="Eliminar meta"
                  >
                    ✕
                  </button>
                </div>
                <div className="h-2 rounded-full bg-overlay/10 overflow-hidden">
                  <div
                    className={`h-full transition-all ${m.cumplida ? "bg-accent-green" : "bg-accent-blue"}`}
                    style={{ width: `${Math.round(m.progreso * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted mt-1.5">
                  <span>
                    {formatMonto(m.montoActual, m.moneda)} de {formatMonto(m.montoObjetivo, m.moneda)}
                  </span>
                  <span className={m.cumplida ? "text-accent-green font-medium" : ""}>
                    {m.cumplida ? "Cumplida" : `${Math.round(m.progreso * 100)}%`}
                  </span>
                </div>
                {m.diasRestantes !== null && !m.cumplida && (
                  <div className="text-xs text-muted mt-0.5">
                    {m.diasRestantes < 0
                      ? `Vencida hace ${Math.abs(m.diasRestantes)} día(s)`
                      : m.diasRestantes === 0
                      ? "Vence hoy"
                      : `${m.diasRestantes} día(s) restantes`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(runway.length > 0 || proyeccion.length > 0) && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-wide text-accent-blue font-semibold">
              Resumen financiero
            </div>
            <button
              onClick={handleInterpretar}
              disabled={interpretando}
              className="rounded-full bg-accent-blue text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shrink-0"
            >
              {interpretando ? "Interpretando…" : interpretacion ? "Reinterpretar" : "Interpretar con IA"}
            </button>
          </div>

          {errorInterpretacion && (
            <div className="rounded-xl p-4 text-sm leading-relaxed bg-accent-red/10 border border-accent-red/30 text-accent-red">
              {errorInterpretacion}
            </div>
          )}

          {interpretacion && (
            <div className="rounded-xl p-4 space-y-3 bg-accent-blue/10 border border-accent-blue/30">
              <div className="flex items-center gap-2">
                <EvidenceBadge level={interpretacion.evidenceLevel} />
              </div>
              <p className="text-sm leading-relaxed">{interpretacion.diagnostico}</p>
              {interpretacion.pasosASeguir.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Pasos a seguir</div>
                  <ul className="space-y-1 list-disc list-inside text-sm">
                    {interpretacion.pasosASeguir.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {interpretacion.rutasMejoraDeficit.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Rutas para mejorar el déficit</div>
                  <ul className="space-y-1 list-disc list-inside text-sm">
                    {interpretacion.rutasMejoraDeficit.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {resumenMensual.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Este mes — ingresos, gastos y déficit confirmados</div>
              <div className="space-y-2">
                {resumenMensual.map((r) => (
                  <div key={r.moneda} className="grid grid-cols-3 gap-2 text-center rounded-xl bg-surface-2 p-3">
                    <div>
                      <div className="text-[10px] text-muted">Ingresos ({r.moneda})</div>
                      <div className="text-sm font-semibold tabular-nums text-accent-green">
                        {formatMonto(r.ingresosMes, r.moneda)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">Gastos</div>
                      <div className="text-sm font-semibold tabular-nums text-accent-red">
                        {formatMonto(r.gastosMes, r.moneda)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">Déficit</div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${r.deficitMes >= 0 ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatMonto(r.deficitMes, r.moneda)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(pagosPendientes.dias8.length > 0) && (
            <div>
              <div className="text-xs text-muted mb-2">Pagos pendientes por vencer</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "dias3" as const, label: "En 3 días" },
                    { key: "dias5" as const, label: "En 5 días" },
                    { key: "dias8" as const, label: "En 8 días" },
                  ]
                ).map(({ key, label }) => {
                  const items = pagosPendientes[key];
                  const totales = sumPagosPorMoneda(items);
                  return (
                    <div key={key} className="rounded-xl bg-surface-2 p-3">
                      <div className="text-[10px] text-muted">{label}</div>
                      {items.length === 0 ? (
                        <div className="text-sm text-muted mt-1">—</div>
                      ) : (
                        Object.entries(totales).map(([moneda, monto]) => (
                          <div key={moneda} className="text-sm font-semibold tabular-nums text-accent-amber mt-1">
                            {formatMonto(monto, moneda)}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 mt-2">
                {pagosPendientes.dias8.slice(0, 4).map((p) => (
                  <div key={p.id} className="text-xs text-muted">
                    {p.descripcion} · {formatMonto(-p.monto, p.moneda)} · en {p.diasRestantes} día{p.diasRestantes === 1 ? "" : "s"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {runway.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Runway — cuánto aguanta la caja actual al ritmo de gasto reciente</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {runway.map((r) => (
                  <div key={r.moneda} className="rounded-xl bg-surface-2 p-3.5">
                    <div className="text-xs text-muted">{r.moneda}</div>
                    {r.mesesRunway === null ? (
                      <div className="text-sm mt-1">
                        {r.gastoMensualPromedio === 0
                          ? "Sin gasto confirmado reciente — no hay quema de caja detectada."
                          : "Datos insuficientes para calcular runway."}
                      </div>
                    ) : (
                      <>
                        <div
                          className={`text-xl font-bold mt-1 tabular-nums ${
                            r.mesesRunway < 0
                              ? "text-accent-red"
                              : r.mesesRunway < 2
                              ? "text-accent-red"
                              : r.mesesRunway < 4
                              ? "text-accent-amber"
                              : "text-accent-green"
                          }`}
                        >
                          {r.mesesRunway < 0 ? "En déficit" : `${r.mesesRunway.toFixed(1)} meses`}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          gasto promedio ~{Math.round(r.gastoMensualPromedio).toLocaleString("es-ES")} {r.moneda}/mes
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {proyeccion.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Caja proyectada — actual + esperados dentro de cada ventana</div>
              <div className="space-y-2">
                {proyeccion.map((p) => (
                  <div key={p.moneda} className="grid grid-cols-4 gap-2 text-center rounded-xl bg-surface-2 p-3">
                    <div>
                      <div className="text-[10px] text-muted">Hoy ({p.moneda})</div>
                      <div className="text-sm font-semibold tabular-nums">{formatMonto(p.cajaActual, p.moneda)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">30 días</div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${p.proyeccion30 >= 0 ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatMonto(p.proyeccion30, p.moneda)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">60 días</div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${p.proyeccion60 >= 0 ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatMonto(p.proyeccion60, p.moneda)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted">90 días</div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${p.proyeccion90 >= 0 ? "text-accent-green" : "text-accent-red"}`}
                      >
                        {formatMonto(p.proyeccion90, p.moneda)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {splitPersonal.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Personal vs. en proyectos — de lo confirmado, cuánto está en cada lado</div>
              <div className="space-y-2">
                {splitPersonal.map((s) => {
                  const total = Math.abs(s.personal) + Math.abs(s.proyectos) || 1;
                  const pctPersonal = Math.round((Math.abs(s.personal) / total) * 100);
                  return (
                    <div key={s.moneda} className="rounded-xl bg-surface-2 p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span>
                          Sin proyecto: <span className="font-semibold">{formatMonto(s.personal, s.moneda)}</span>
                        </span>
                        <span>
                          En proyectos: <span className="font-semibold">{formatMonto(s.proyectos, s.moneda)}</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-accent-blue/20 overflow-hidden flex">
                        <div className="h-full bg-accent-blue" style={{ width: `${pctPersonal}%` }} />
                        <div className="h-full bg-overlay/20" style={{ width: `${100 - pctPersonal}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {proyectosConAnalisis.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-accent-blue font-semibold">
            Proyectos — potencial económico
          </div>
          <div className="space-y-2">
            {proyectosConAnalisis.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/proyectos?open=${p.id}`)}
                className="w-full text-left rounded-xl bg-surface-2 border border-border-subtle p-3.5 hover:border-accent-blue/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{p.nombre}</span>
                  <EvidenceBadge level={p.analisisEconomico!.evidenceLevel} />
                </div>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{p.analisisEconomico!.impactoEnCajaPersonal}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Caja disponible" values={caja} positiveTone />
        <SummaryCard label="Ingresos confirmados" values={ingresosConfirmados} tone="text-accent-green" />
        <SummaryCard label="Ingresos esperados" values={ingresosEsperados} tone="text-accent-amber" />
        <SummaryCard label="Gastos confirmados" values={gastosConfirmados} tone="text-accent-red" />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wide text-muted mb-3">Caja por cuenta</div>
        {cajaPorCuenta.length === 0 && <p className="text-sm text-muted">Sin movimientos confirmados todavía.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cajaPorCuenta.map(({ cuenta, moneda, saldo }) => (
            <div key={`${cuenta}-${moneda}`} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
              <span className="text-sm">{cuenta}</span>
              <span className={`text-sm font-semibold ${saldo >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {formatMonto(saldo, moneda)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wide text-muted">Brecha de caja proyectada</div>
        <div className="mt-1 space-y-0.5">
          {monedasBrecha.length === 0 && <div className="text-xl font-semibold text-accent-green">$0</div>}
          {monedasBrecha.map((m) => (
            <div key={m} className={`text-xl font-semibold ${brecha[m] >= 0 ? "text-accent-green" : "text-accent-red"}`}>
              {formatMonto(brecha[m], m)}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-1">
          Caja actual + ingresos esperados − gastos esperados, por moneda (no se mezclan monedas distintas en un solo total).{" "}
          {monedasBrecha.some((m) => brecha[m] < 0) && "Riesgo financiero: revisa obligaciones pendientes."}
        </p>
      </div>

      {sinConciliar.length > 0 && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/5 p-4">
          <div className="text-xs font-medium text-accent-red">
            {sinConciliar.length} movimiento(s) sin conciliar — revisa para evitar doble contabilización
          </div>
        </div>
      )}

      {esperadosVencidos.length > 0 && (
        <div className="rounded-2xl border border-accent-amber/30 bg-accent-amber/5 p-4 space-y-1.5">
          <div className="text-xs font-medium text-accent-amber">
            {esperadosVencidos.length} movimiento(s) &ldquo;esperado&rdquo; con fecha ya vencida — ¿llegó o no?
          </div>
          <div className="space-y-1">
            {esperadosVencidos.slice(0, 3).map((m) => (
              <div key={m.id} className="text-xs text-muted">
                {m.descripcion} · {formatMonto(m.tipo === "ingreso" ? m.monto : -m.monto, m.moneda)} · vencido desde{" "}
                {m.fecha}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {(["Todos", "ingreso", "gasto"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filtroTipo === f
                  ? "bg-surface-2 border-accent-blue text-foreground"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {f === "Todos" ? "Todos" : TIPO_LABEL[f]}
            </button>
          ))}
          <span className="w-px bg-border-subtle mx-1" />
          {(["Todos", "confirmado", "esperado", "sin_conciliar"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filtroEstado === f
                  ? "bg-surface-2 border-accent-blue text-foreground"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {f === "Todos" ? "Todos" : ESTADO_LABEL[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 shrink-0"
        >
          + Nuevo movimiento
        </button>
      </div>

      <div className="space-y-2">
        {visibles.length === 0 && <p className="text-sm text-muted">No hay movimientos en este filtro.</p>}
        {visibles.map((m) => (
          <button
            key={m.id}
            onClick={() => setEditando(m)}
            className="w-full flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-accent-blue/50 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.descripcion}</div>
              <div className="text-xs text-muted mt-0.5">
                {proyectoNombre(proyectos, m.proyectoId)} · {m.cuenta} · {m.fecha} · {m.fuente}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-semibold ${m.tipo === "ingreso" ? "text-accent-green" : "text-accent-red"}`}>
                {m.tipo === "ingreso" ? "+" : "-"}${m.monto.toLocaleString("es-ES")} {m.moneda}
              </span>
              <Pill tone={ESTADO_TONE[m.estado]}>{ESTADO_LABEL[m.estado]}</Pill>
            </div>
          </button>
        ))}
      </div>

      {showNew && (
        <MovimientoModal
          onClose={() => setShowNew(false)}
          cuentasExistentes={Array.from(new Set(cajaPorCuenta.map((c) => c.cuenta)))}
        />
      )}
      {editando && (
        <MovimientoModal
          movimiento={editando}
          onClose={() => setEditando(null)}
          cuentasExistentes={Array.from(new Set(cajaPorCuenta.map((c) => c.cuenta)))}
        />
      )}
      {showNewMeta && <NuevaMetaModal onClose={() => setShowNewMeta(false)} />}
    </div>
  );
}

function NuevaMetaModal({ onClose }: { onClose: () => void }) {
  const addMetaFinanciera = useAppStore((s) => s.addMetaFinanciera);
  const [descripcion, setDescripcion] = useState("");
  const [moneda, setMoneda] = useState<string>("USD");
  const [montoObjetivo, setMontoObjetivo] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim() || !montoObjetivo) return;
    addMetaFinanciera({
      descripcion: descripcion.trim(),
      moneda,
      montoObjetivo: Number(montoObjetivo),
      fechaObjetivo: fechaObjetivo || null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4"
      >
        <h3 className="font-semibold">Nueva meta financiera</h3>
        <div>
          <label className="block text-xs text-muted mb-1">¿A dónde quieres llegar?</label>
          <input
            autoFocus
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej. Saldar la tarjeta de crédito, Ahorro de emergencia"
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Monto objetivo</label>
            <input
              value={montoObjetivo}
              onChange={(e) => setMontoObjetivo(e.target.value.replace(/[^0-9.-]/g, ""))}
              inputMode="decimal"
              placeholder="0 = deuda en cero"
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Fecha objetivo (opcional)</label>
          <input
            type="date"
            value={fechaObjetivo}
            onChange={(e) => setFechaObjetivo(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <p className="text-xs text-muted">
          El punto de partida se toma solo, de tu caja personal actual en esa moneda — no tienes que calcular nada.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancelar
          </button>
          <button type="submit" className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2">
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

function SummaryCard({
  label,
  values,
  tone,
  positiveTone,
}: {
  label: string;
  values: Record<string, number>;
  tone?: string;
  positiveTone?: boolean;
}) {
  const monedas = Object.keys(values);
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 space-y-0.5">
        {monedas.length === 0 && <div className="text-lg font-semibold text-muted">$0</div>}
        {monedas.map((m) => (
          <div
            key={m}
            className={`text-lg font-semibold ${
              positiveTone ? (values[m] >= 0 ? "text-accent-green" : "text-accent-red") : tone
            }`}
          >
            {formatMonto(values[m], m)}
          </div>
        ))}
      </div>
    </div>
  );
}

function MovimientoModal({
  movimiento,
  onClose,
  cuentasExistentes,
}: {
  movimiento?: MovimientoEconomico;
  onClose: () => void;
  cuentasExistentes: string[];
}) {
  const addMovimiento = useAppStore((s) => s.addMovimiento);
  const updateMovimiento = useAppStore((s) => s.updateMovimiento);
  const deleteMovimiento = useAppStore((s) => s.deleteMovimiento);
  const proyectos = useAppStore((s) => s.proyectos);
  const [tipo, setTipo] = useState<MovimientoTipo>(movimiento?.tipo ?? "ingreso");
  const [monto, setMonto] = useState(movimiento ? String(movimiento.monto) : "");
  const [moneda, setMoneda] = useState<string>(movimiento?.moneda ?? "USD");
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion ?? "");
  const [proyectoId, setProyectoId] = useState<string>(movimiento?.proyectoId ?? proyectos[0]?.id ?? "");
  const [estado, setEstado] = useState<MovimientoEstado>(movimiento?.estado ?? "confirmado");
  const [cuenta, setCuenta] = useState(movimiento?.cuenta ?? cuentasExistentes[0] ?? "");
  const [cuentaNueva, setCuentaNueva] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cuentaFinal = cuenta === "__nueva__" ? cuentaNueva.trim() : cuenta;
    if (!descripcion.trim() || !monto || !cuentaFinal) return;
    if (movimiento) {
      updateMovimiento(movimiento.id, {
        tipo,
        monto: Number(monto),
        moneda,
        proyectoId: proyectoId || null,
        descripcion: descripcion.trim(),
        estado,
        cuenta: cuentaFinal,
      });
    } else {
      addMovimiento({
        tipo,
        monto: Number(monto),
        moneda,
        fecha: new Date().toISOString().slice(0, 10),
        proyectoId: proyectoId || null,
        descripcion: descripcion.trim(),
        estado,
        fuente: "Registro manual",
        cuenta: cuentaFinal,
      });
    }
    onClose();
  }

  function handleDelete() {
    if (!movimiento) return;
    deleteMovimiento(movimiento.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <h3 className="font-semibold">{movimiento ? "Editar movimiento económico" : "Nuevo movimiento económico"}</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo("ingreso")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === "ingreso"
                  ? "bg-accent-green/15 border-accent-green text-accent-green"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              + Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo("gasto")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                tipo === "gasto"
                  ? "bg-accent-red/15 border-accent-red text-accent-red"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              − Gasto
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              {MONEDAS.map((m) => (
                <option key={m} value={m}>
                  {MONEDA_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Descripción</label>
          <input
            autoFocus
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Cuenta — ¿dónde está o saldrá la plata?</label>
          <select
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          >
            {Array.from(new Set([...cuentasExistentes, ...(movimiento ? [movimiento.cuenta] : [])])).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__nueva__">+ Nueva cuenta...</option>
          </select>
          {cuenta === "__nueva__" && (
            <input
              autoFocus
              value={cuentaNueva}
              onChange={(e) => setCuentaNueva(e.target.value)}
              placeholder="Ej. Bancolombia, Nequi, Efectivo..."
              className="mt-2 w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Proyecto</label>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as MovimientoEstado)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="confirmado">Confirmado</option>
              <option value="esperado">Esperado</option>
              <option value="sin_conciliar">Sin conciliar</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          {movimiento ? (
            <button type="button" onClick={handleDelete} className="text-sm text-accent-red">
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="text-sm text-muted">
              Cancelar
            </button>
            <button type="submit" className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2">
              {movimiento ? "Guardar" : "Registrar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

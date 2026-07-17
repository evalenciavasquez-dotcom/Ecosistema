"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { proyectoNombre } from "@/lib/selectors";
import { MovimientoEconomico, MovimientoEstado, MovimientoTipo } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";

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

function sum(movs: MovimientoEconomico[]) {
  return movs.reduce((acc, m) => acc + m.monto, 0);
}

export default function EconomiaPage() {
  const movimientos = useAppStore((s) => s.movimientos);
  const proyectos = useAppStore((s) => s.proyectos);
  const [showNew, setShowNew] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | MovimientoEstado>("Todos");
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | MovimientoTipo>("Todos");

  const ingresosConfirmados = sum(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "confirmado"));
  const ingresosEsperados = sum(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "esperado"));
  const gastosConfirmados = sum(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "confirmado"));
  const gastosEsperados = sum(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "esperado"));
  const sinConciliar = movimientos.filter((m) => m.estado === "sin_conciliar");

  const caja = ingresosConfirmados - gastosConfirmados;
  const brecha = caja + ingresosEsperados - gastosEsperados;

  const cajaPorCuenta = useMemo(() => {
    const porCuenta = new Map<string, number>();
    movimientos
      .filter((m) => m.estado === "confirmado")
      .forEach((m) => {
        const actual = porCuenta.get(m.cuenta) ?? 0;
        porCuenta.set(m.cuenta, actual + (m.tipo === "ingreso" ? m.monto : -m.monto));
      });
    return Array.from(porCuenta.entries()).sort((a, b) => b[1] - a[1]);
  }, [movimientos]);

  const visibles = movimientos.filter(
    (m) => (filtroEstado === "Todos" || m.estado === filtroEstado) && (filtroTipo === "Todos" || m.tipo === filtroTipo)
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Caja disponible" value={caja} tone={caja >= 0 ? "text-accent-green" : "text-accent-red"} />
        <SummaryCard label="Ingresos confirmados" value={ingresosConfirmados} tone="text-accent-green" />
        <SummaryCard label="Ingresos esperados" value={ingresosEsperados} tone="text-accent-amber" />
        <SummaryCard label="Gastos confirmados" value={gastosConfirmados} tone="text-accent-red" />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wide text-muted mb-3">Caja por cuenta</div>
        {cajaPorCuenta.length === 0 && <p className="text-sm text-muted">Sin movimientos confirmados todavía.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cajaPorCuenta.map(([cuenta, saldo]) => (
            <div key={cuenta} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-2.5">
              <span className="text-sm">{cuenta}</span>
              <span className={`text-sm font-semibold ${saldo >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                ${saldo.toLocaleString("es-ES")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5">
        <div className="text-[11px] uppercase tracking-wide text-muted">Brecha de caja proyectada</div>
        <div className={`text-xl font-semibold mt-1 ${brecha >= 0 ? "text-accent-green" : "text-accent-red"}`}>
          ${brecha.toLocaleString("es-ES")}
        </div>
        <p className="text-xs text-muted mt-1">
          Caja actual + ingresos esperados − gastos esperados. {brecha < 0 && "Riesgo financiero: revisa obligaciones pendientes."}
        </p>
      </div>

      {sinConciliar.length > 0 && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/5 p-4">
          <div className="text-xs font-medium text-accent-red">
            {sinConciliar.length} movimiento(s) sin conciliar — revisa para evitar doble contabilización
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
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.descripcion}</div>
              <div className="text-xs text-muted mt-0.5">
                {proyectoNombre(proyectos, m.proyectoId)} · {m.cuenta} · {m.fecha} · {m.fuente}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-sm font-semibold ${m.tipo === "ingreso" ? "text-accent-green" : "text-accent-red"}`}>
                {m.tipo === "ingreso" ? "+" : "-"}${m.monto.toLocaleString("es-ES")}
              </span>
              <Pill tone={ESTADO_TONE[m.estado]}>{ESTADO_LABEL[m.estado]}</Pill>
            </div>
          </div>
        ))}
      </div>

      {showNew && <NuevoMovimientoModal onClose={() => setShowNew(false)} cuentasExistentes={cajaPorCuenta.map(([c]) => c)} />}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${tone}`}>${value.toLocaleString("es-ES")}</div>
    </div>
  );
}

function NuevoMovimientoModal({
  onClose,
  cuentasExistentes,
}: {
  onClose: () => void;
  cuentasExistentes: string[];
}) {
  const addMovimiento = useAppStore((s) => s.addMovimiento);
  const proyectos = useAppStore((s) => s.proyectos);
  const [tipo, setTipo] = useState<MovimientoTipo>("ingreso");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [estado, setEstado] = useState<MovimientoEstado>("confirmado");
  const [cuenta, setCuenta] = useState(cuentasExistentes[0] ?? "");
  const [cuentaNueva, setCuentaNueva] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cuentaFinal = cuenta === "__nueva__" ? cuentaNueva.trim() : cuenta;
    if (!descripcion.trim() || !monto || !cuentaFinal) return;
    addMovimiento({
      tipo,
      monto: Number(monto),
      moneda: "USD",
      fecha: new Date().toISOString().slice(0, 10),
      proyectoId: proyectoId || null,
      descripcion: descripcion.trim(),
      estado,
      fuente: "Registro manual",
      cuenta: cuentaFinal,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4"
      >
        <h3 className="font-semibold">Nuevo movimiento económico</h3>
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
        <div>
          <label className="block text-xs text-muted mb-1">Monto (USD)</label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
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
            {cuentasExistentes.map((c) => (
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
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancelar
          </button>
          <button type="submit" className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2">
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}

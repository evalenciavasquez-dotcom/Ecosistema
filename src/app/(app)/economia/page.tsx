"use client";

import { useState } from "react";
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

function sum(movs: MovimientoEconomico[]) {
  return movs.reduce((acc, m) => acc + m.monto, 0);
}

export default function EconomiaPage() {
  const movimientos = useAppStore((s) => s.movimientos);
  const proyectos = useAppStore((s) => s.proyectos);
  const [showNew, setShowNew] = useState(false);
  const [filtro, setFiltro] = useState<"Todos" | MovimientoEstado>("Todos");

  const ingresosConfirmados = sum(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "confirmado"));
  const ingresosEsperados = sum(movimientos.filter((m) => m.tipo === "ingreso" && m.estado === "esperado"));
  const gastosConfirmados = sum(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "confirmado"));
  const gastosEsperados = sum(movimientos.filter((m) => m.tipo === "gasto" && m.estado === "esperado"));
  const sinConciliar = movimientos.filter((m) => m.estado === "sin_conciliar");

  const caja = ingresosConfirmados - gastosConfirmados;
  const brecha = caja + ingresosEsperados - gastosEsperados;

  const visibles = movimientos.filter((m) => filtro === "Todos" || m.estado === filtro);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Caja disponible" value={caja} tone={caja >= 0 ? "text-accent-green" : "text-accent-red"} />
        <SummaryCard label="Ingresos confirmados" value={ingresosConfirmados} tone="text-accent-green" />
        <SummaryCard label="Ingresos esperados" value={ingresosEsperados} tone="text-accent-amber" />
        <SummaryCard label="Gastos confirmados" value={gastosConfirmados} tone="text-accent-red" />
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["Todos", "confirmado", "esperado", "sin_conciliar"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filtro === f
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
        {visibles.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{m.descripcion}</div>
              <div className="text-xs text-muted mt-0.5">
                {proyectoNombre(proyectos, m.proyectoId)} · {m.fecha} · {m.fuente}
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

      {showNew && <NuevoMovimientoModal onClose={() => setShowNew(false)} />}
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

function NuevoMovimientoModal({ onClose }: { onClose: () => void }) {
  const addMovimiento = useAppStore((s) => s.addMovimiento);
  const proyectos = useAppStore((s) => s.proyectos);
  const [tipo, setTipo] = useState<MovimientoTipo>("ingreso");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [estado, setEstado] = useState<MovimientoEstado>("confirmado");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim() || !monto) return;
    addMovimiento({
      tipo,
      monto: Number(monto),
      moneda: "USD",
      fecha: new Date().toISOString().slice(0, 10),
      proyectoId: proyectoId || null,
      descripcion: descripcion.trim(),
      estado,
      fuente: "Registro manual",
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MovimientoTipo)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
            </select>
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

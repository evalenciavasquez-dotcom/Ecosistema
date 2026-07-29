"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Goal, GoalEstado } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";

const ESTADO_TONE: Record<GoalEstado, "green" | "amber" | "red" | "blue"> = {
  en_progreso: "blue",
  cumplida: "green",
  pausada: "amber",
  descartada: "red",
};

const ESTADO_LABEL: Record<GoalEstado, string> = {
  en_progreso: "En progreso",
  cumplida: "Cumplida",
  pausada: "Pausada",
  descartada: "Descartada",
};

const ESTADOS: GoalEstado[] = ["en_progreso", "cumplida", "pausada", "descartada"];

function mesActualStr(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
}

function computeRachaYContador(retosIA: Goal[]) {
  const cumplidos = retosIA.filter((g) => g.estado === "cumplida" && g.completadoEn);
  const porMes = new Map<string, number>();
  cumplidos.forEach((g) => {
    const mes = g.completadoEn!.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
  });
  const esteMes = porMes.get(mesActualStr()) ?? 0;
  let racha = 0;
  const cursor = new Date();
  cursor.setDate(1);
  for (let mesesAtras = 0; mesesAtras < 240; mesesAtras++) {
    const mesStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if ((porMes.get(mesStr) ?? 0) === 0) break;
    racha++;
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return { esteMes, totalHistorico: cumplidos.length, racha };
}

export default function GoalsPage() {
  const router = useRouter();
  const goals = useAppStore((s) => s.goals);
  const proyectos = useAppStore((s) => s.proyectos);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);
  const buscarMasRetos = useAppStore((s) => s.buscarMasRetos);
  const buscandoRetos = useAppStore((s) => s.buscandoRetos);
  const [showNew, setShowNew] = useState(false);
  const [mostrarCerradas, setMostrarCerradas] = useState(false);
  const [errorRetos, setErrorRetos] = useState("");

  const retosIA = useMemo(() => goals.filter((g) => g.origen === "ia"), [goals]);
  const retosActivos = retosIA.filter((g) => g.estado === "en_progreso");
  const { esteMes, totalHistorico, racha } = useMemo(() => computeRachaYContador(retosIA), [retosIA]);

  const manuales = goals.filter((g) => g.origen === "manual");
  const visibles = useMemo(
    () => manuales.filter((g) => mostrarCerradas || (g.estado !== "cumplida" && g.estado !== "descartada")),
    [manuales, mostrarCerradas]
  );

  const sinProyecto = visibles.filter((g) => !g.proyectoId);
  const grupos = useMemo(() => {
    const map = new Map<string, Goal[]>();
    visibles
      .filter((g) => g.proyectoId)
      .forEach((g) => {
        const lista = map.get(g.proyectoId!) ?? [];
        lista.push(g);
        map.set(g.proyectoId!, lista);
      });
    return map;
  }, [visibles]);

  async function handleBuscarRetos() {
    setErrorRetos("");
    const result = await buscarMasRetos();
    if (!result.ok) setErrorRetos(result.error ?? "No se pudo buscar retos nuevos");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Goals</h2>
        <p className="text-sm text-muted mt-1">
          Objetivos generales — de proyecto, personales o del sistema — con progreso que tú actualizas.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-wide text-accent-blue font-semibold">Retos de la IA</div>
          <button
            onClick={handleBuscarRetos}
            disabled={buscandoRetos}
            className="rounded-full bg-accent-blue text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50 shrink-0"
          >
            {buscandoRetos ? "Buscando…" : "Buscar más retos"}
          </button>
        </div>

        {errorRetos && (
          <div className="rounded-xl p-3 text-xs leading-relaxed bg-accent-red/10 border border-accent-red/30 text-accent-red">
            {errorRetos}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-[10px] text-muted">Este mes</div>
            <div className="text-lg font-semibold tabular-nums">{esteMes}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-[10px] text-muted">Racha</div>
            <div className="text-lg font-semibold tabular-nums">{racha > 0 ? `🔥 ${racha}` : "0"}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-[10px] text-muted">Total cumplidos</div>
            <div className="text-lg font-semibold tabular-nums">{totalHistorico}</div>
          </div>
        </div>

        {retosActivos.length === 0 ? (
          <p className="text-sm text-muted">
            Sin retos activos todavía. El sistema propone retos solo, basados en puntos débiles reales (runway,
            pagos vencidos, proyectos en riesgo, etc.) — o pulsa &ldquo;Buscar más retos&rdquo; para generarlos ahora.
          </p>
        ) : (
          <div className="space-y-2">
            {retosActivos.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onUpdate={updateGoal}
                onDelete={deleteGoal}
                proyectoNombre={g.proyectoId ? proyectos.find((p) => p.id === g.proyectoId)?.nombre : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-wide text-muted">Tus goals</div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 shrink-0"
        >
          + Nuevo goal
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={mostrarCerradas}
          onChange={(e) => setMostrarCerradas(e.target.checked)}
          className="rounded"
        />
        Mostrar cumplidas y descartadas
      </label>

      {visibles.length === 0 && (
        <p className="text-sm text-muted">
          Sin goals propios todavía. Un goal no es una meta financiera — es cualquier objetivo que quieras
          trackear: un lanzamiento, cerrar un cliente, terminar una fase de un proyecto.
        </p>
      )}

      {sinProyecto.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted mb-2">Sin proyecto</div>
          <div className="space-y-2">
            {sinProyecto.map((g) => (
              <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={deleteGoal} />
            ))}
          </div>
        </div>
      )}

      {Array.from(grupos.entries()).map(([proyectoId, lista]) => {
        const proyecto = proyectos.find((p) => p.id === proyectoId);
        return (
          <div key={proyectoId}>
            <button
              onClick={() => router.push(`/proyectos?open=${proyectoId}`)}
              className="text-[11px] uppercase tracking-wide text-accent-blue mb-2 hover:underline"
            >
              {proyecto?.nombre ?? "Proyecto eliminado"}
            </button>
            <div className="space-y-2">
              {lista.map((g) => (
                <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={deleteGoal} />
              ))}
            </div>
          </div>
        );
      })}

      {showNew && <NuevoGoalModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
  proyectoNombre,
}: {
  goal: Goal;
  onUpdate: (id: string, cambios: Partial<Pick<Goal, "titulo" | "descripcion" | "progreso" | "estado" | "fechaObjetivo">>) => void;
  onDelete: (id: string) => void;
  proyectoNombre?: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{goal.titulo}</span>
            {goal.origen === "ia" && <Pill tone="purple">Reto IA</Pill>}
            {goal.criterioAuto && <span className="text-[10px] text-muted">se verifica solo</span>}
          </div>
          {goal.descripcion && <p className="text-xs text-muted mt-1 leading-relaxed">{goal.descripcion}</p>}
          {proyectoNombre && <div className="text-[11px] text-accent-blue mt-1">{proyectoNombre}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Pill tone={ESTADO_TONE[goal.estado]}>{ESTADO_LABEL[goal.estado]}</Pill>
          <button onClick={() => onDelete(goal.id)} className="text-accent-red text-xs" aria-label="Eliminar goal">
            ✕
          </button>
        </div>
      </div>

      <div>
        <div className="h-2 rounded-full bg-overlay/10 overflow-hidden">
          <div
            className={`h-full transition-all ${goal.estado === "cumplida" ? "bg-accent-green" : "bg-accent-blue"}`}
            style={{ width: `${goal.progreso}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progreso}
            onChange={(e) => {
              const progreso = Number(e.target.value);
              onUpdate(goal.id, { progreso, estado: progreso >= 100 ? "cumplida" : goal.estado === "cumplida" ? "en_progreso" : goal.estado });
            }}
            className="flex-1"
          />
          <span className="text-xs font-medium tabular-nums w-10 text-right">{goal.progreso}%</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => onUpdate(goal.id, { estado: e, progreso: e === "cumplida" ? 100 : goal.progreso })}
            className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
              goal.estado === e
                ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {goal.fechaObjetivo && <div className="text-[11px] text-muted">Fecha objetivo: {goal.fechaObjetivo}</div>}
    </div>
  );
}

function NuevoGoalModal({ onClose }: { onClose: () => void }) {
  const addGoal = useAppStore((s) => s.addGoal);
  const proyectos = useAppStore((s) => s.proyectos);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [fechaObjetivo, setFechaObjetivo] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    addGoal({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      proyectoId: proyectoId || null,
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
        <h3 className="font-semibold">Nuevo goal</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Título</label>
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Lanzar la nueva versión, Cerrar cliente X"
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Proyecto (opcional)</label>
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
            <label className="block text-xs text-muted mb-1">Fecha objetivo (opcional)</label>
            <input
              type="date"
              value={fechaObjetivo}
              onChange={(e) => setFechaObjetivo(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            />
          </div>
        </div>
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

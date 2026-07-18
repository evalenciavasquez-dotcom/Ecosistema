"use client";

import { Suspense, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { AccionEstadoBadge } from "@/components/ui/badges";
import { Accion, AccionEstado } from "@/lib/types";
import { proyectoNombre } from "@/lib/selectors";
import { useOpenParam } from "@/lib/useOpenParam";

const ESTADOS: AccionEstado[] = ["Pendiente", "En curso", "Bloqueada", "Esperando tercero", "Completada", "Cancelada"];

function AccionesContent() {
  const acciones = useAppStore((s) => s.acciones);
  const proyectos = useAppStore((s) => s.proyectos);
  const setAccionEstado = useAppStore((s) => s.setAccionEstado);
  const openId = useOpenParam();
  const [filtro, setFiltro] = useState<string>(() => (openId ? "Todas" : "Abiertas"));
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(() => openId);

  useEffect(() => {
    if (!openId) return;
    window.history.replaceState(null, "", "/acciones");
    const t = setTimeout(() => {
      document.getElementById(`accion-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [openId]);

  const visibles = acciones.filter((a) => {
    if (filtro === "Todas") return true;
    if (filtro === "Abiertas") return a.estado !== "Completada" && a.estado !== "Cancelada";
    return a.estado === filtro;
  });

  const orden = { P1: 0, P2: 1, P3: 2 } as const;
  const ordenadas = [...visibles].sort((a, b) => orden[a.prioridad] - orden[b.prioridad] || new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {["Abiertas", "Todas", ...ESTADOS].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                filtro === f
                  ? "bg-surface-2 border-accent-blue text-foreground"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 shrink-0"
        >
          + Nueva acción
        </button>
      </div>

      <div className="space-y-3">
        {ordenadas.length === 0 && <p className="text-sm text-muted">No hay acciones en este filtro.</p>}
        {ordenadas.map((a) => (
          <div
            key={a.id}
            id={`accion-${a.id}`}
            className={`rounded-2xl border bg-surface p-4 transition-colors ${
              openId === a.id ? "border-accent-blue" : "border-border-subtle"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => setAccionEstado(a.id, a.estado === "Completada" ? "Pendiente" : "Completada")}
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                  a.estado === "Completada" ? "bg-accent-green border-accent-green" : "border-border-subtle"
                }`}
                aria-label="Marcar completada"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className={`text-sm font-medium leading-snug text-left ${a.estado === "Completada" ? "line-through text-muted" : ""}`}
                  >
                    {a.titulo}
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted">{a.fecha}</span>
                    <AccionEstadoBadge estado={a.estado} />
                  </div>
                </div>
                <div className="text-xs text-muted mt-1">
                  {proyectoNombre(proyectos, a.proyectoId)} · {a.responsable} · {a.prioridad}
                </div>

                {expandedId === a.id && (
                  <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                    {a.resultadoEsperado && (
                      <DetailRow label="Resultado esperado" value={a.resultadoEsperado} />
                    )}
                    {a.duracionEstimada && <DetailRow label="Duración estimada" value={a.duracionEstimada} />}
                    {a.dependencias && <DetailRow label="Dependencias" value={a.dependencias} />}
                    {a.impactoFinanciero && <DetailRow label="Impacto financiero" value={a.impactoFinanciero} />}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {ESTADOS.map((e) => (
                        <button
                          key={e}
                          onClick={() => setAccionEstado(a.id, e)}
                          className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                            a.estado === e
                              ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                              : "border-border-subtle text-muted hover:text-foreground"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && <NuevaAccionModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

export default function AccionesPage() {
  return (
    <Suspense>
      <AccionesContent />
    </Suspense>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted">{label}:</span> {value}
    </div>
  );
}

function NuevaAccionModal({ onClose }: { onClose: () => void }) {
  const addAccion = useAppStore((s) => s.addAccion);
  const proyectos = useAppStore((s) => s.proyectos);
  const [titulo, setTitulo] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [prioridad, setPrioridad] = useState<Accion["prioridad"]>("P2");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [resultadoEsperado, setResultadoEsperado] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    addAccion({
      titulo: titulo.trim(),
      resultadoEsperado,
      proyectoId: proyectoId || null,
      responsable: "Eduardo",
      prioridad,
      estado: "Pendiente",
      fecha,
      duracionEstimada: "",
      dependencias: "",
      impactoFinanciero: "",
      evidenciaCierre: "",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4"
      >
        <h3 className="font-semibold">Nueva acción</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Verbo / título</label>
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Resultado esperado</label>
          <input
            value={resultadoEsperado}
            onChange={(e) => setResultadoEsperado(e.target.value)}
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
            <label className="block text-xs text-muted mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Accion["prioridad"])}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
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

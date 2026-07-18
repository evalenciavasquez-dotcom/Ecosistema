"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { ProyectoEstadoBadge, PrioridadBadge, EvidenceBadge, AccionEstadoBadge } from "@/components/ui/badges";
import { Proyecto, ProyectoEstado, Prioridad } from "@/lib/types";
import { formatMinutos, hoyISO, inicioSemanaISO, minutosDe } from "@/lib/tiempo";

const ESTADOS: ProyectoEstado[] = [
  "Idea",
  "En evaluación",
  "En negociación",
  "Activo",
  "Bloqueado",
  "En espera",
  "En riesgo",
  "En cierre",
  "Cerrado",
  "Descartado",
];

export default function ProyectosPage() {
  const proyectos = useAppStore((s) => s.proyectos);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const selected = proyectos.find((p) => p.id === selectedId) ?? null;

  if (selected) {
    return <ProyectoDetail proyecto={selected} onClose={() => setSelectedId(null)} />;
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2"
        >
          + Nuevo proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proyectos.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className="text-left rounded-2xl border border-border-subtle bg-surface p-5 hover:border-accent-blue/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{p.nombre}</div>
              <ProyectoEstadoBadge estado={p.estado} />
            </div>
            <p className="text-sm text-muted mt-2 line-clamp-2">{p.objetivo}</p>
            <div className="flex items-center gap-2 mt-3">
              <PrioridadBadge prioridad={p.prioridad} />
            </div>
          </button>
        ))}
      </div>

      {showNew && <NuevoProyectoModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NuevoProyectoModal({ onClose }: { onClose: () => void }) {
  const addProyecto = useAppStore((s) => s.addProyecto);
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [estado, setEstado] = useState<ProyectoEstado>("Idea");
  const [prioridad, setPrioridad] = useState<Prioridad>("Media");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    addProyecto({
      nombre: nombre.trim(),
      objetivo,
      estado,
      prioridad,
      personaIds: [],
      rolUsuario: "",
      situacionEconomica: "",
      proximoHito: "",
      riesgos: [],
      oportunidades: [],
      proximaAccionRecomendada: "",
      evidenceLevel: "interpretacion",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4"
      >
        <h3 className="font-semibold">Nuevo proyecto</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Nombre</label>
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Objetivo</label>
          <textarea
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as ProyectoEstado)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as Prioridad)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
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

function ProyectoDetail({ proyecto, onClose }: { proyecto: Proyecto; onClose: () => void }) {
  const personas = useAppStore((s) => s.personas);
  const acciones = useAppStore((s) => s.acciones).filter((a) => a.proyectoId === proyecto.id);
  const decisiones = useAppStore((s) => s.decisiones).filter((d) => d.proyectoId === proyecto.id);
  const evidencias = useAppStore((s) => s.evidencias).filter((e) => e.proyectoId === proyecto.id);
  const historial = useAppStore((s) => s.historial).filter((h) => h.entidadId === proyecto.id);
  const updateProyecto = useAppStore((s) => s.updateProyecto);

  const personasProyecto = personas.filter((p) => proyecto.personaIds.includes(p.id));

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
        ← Volver a proyectos
      </button>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{proyecto.nombre}</h2>
          <EvidenceBadge level={proyecto.evidenceLevel} />
        </div>
        <p className="text-sm text-muted mt-2">{proyecto.objetivo}</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <ProyectoEstadoBadge estado={proyecto.estado} />
          <PrioridadBadge prioridad={proyecto.prioridad} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Rol de Eduardo" value={proyecto.rolUsuario || "Sin especificar"} />
        <Field label="Próximo hito" value={proyecto.proximoHito || "Sin definir"} />
        <Field label="Situación económica" value={proyecto.situacionEconomica || "Sin registrar"} />
        <Field label="Próxima acción recomendada" value={proyecto.proximaAccionRecomendada || "Sin recomendación"} />
      </div>

      <TiempoSection proyectoId={proyecto.id} />

      <Section title="Personas involucradas">
        {personasProyecto.length === 0 && <Empty />}
        <div className="space-y-2">
          {personasProyecto.map((p) => (
            <div key={p.id} className="rounded-xl border border-border-subtle bg-surface p-3 text-sm">
              <span className="font-medium">{p.nombre}</span>{" "}
              <span className="text-muted">— {p.rol} · {p.relacion}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Riesgos">
        {proyecto.riesgos.length === 0 && <Empty />}
        <ul className="space-y-1.5">
          {proyecto.riesgos.map((r, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-red mt-1.5 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Oportunidades">
        {proyecto.oportunidades.length === 0 && <Empty />}
        <ul className="space-y-1.5 list-disc list-inside text-sm">
          {proyecto.oportunidades.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </Section>

      <Section title="Acciones activas">
        {acciones.length === 0 && <Empty />}
        <div className="space-y-2">
          {acciones.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-3 text-sm">
              <span>{a.titulo}</span>
              <AccionEstadoBadge estado={a.estado} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Decisiones pendientes">
        {decisiones.length === 0 && <Empty />}
        <div className="space-y-2">
          {decisiones.map((d) => (
            <div key={d.id} className="rounded-xl border border-border-subtle bg-surface p-3 text-sm">
              {d.pregunta}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Evidencias">
        {evidencias.length === 0 && <Empty />}
        <div className="space-y-2">
          {evidencias.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-3 text-sm">
              <span>{e.afirmacionRespaldada}</span>
              <EvidenceBadge level={e.nivelConfiabilidad} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Historial">
        {historial.length === 0 && <Empty />}
        <ul className="space-y-1.5">
          {historial.map((h) => (
            <li key={h.id} className="text-xs text-muted">
              {new Date(h.timestamp).toLocaleString("es-ES")} — {h.cambio}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-2 pt-2">
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => updateProyecto(proyecto.id, { estado: e })}
            className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${
              proyecto.estado === e
                ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function TiempoSection({ proyectoId }: { proyectoId: string }) {
  const tiempo = useAppStore((s) => s.tiempo);
  const timerActivo = useAppStore((s) => s.timerActivo);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const addRegistroTiempo = useAppStore((s) => s.addRegistroTiempo);
  const deleteRegistroTiempo = useAppStore((s) => s.deleteRegistroTiempo);

  const [minutosManual, setMinutosManual] = useState("");
  const [notaManual, setNotaManual] = useState("");

  const registros = tiempo.filter((t) => t.proyectoId === proyectoId);
  const hoy = hoyISO();
  const minHoy = minutosDe(registros, proyectoId, hoy);
  const minSemana = minutosDe(registros, proyectoId, inicioSemanaISO());
  const minTotal = registros.reduce((acc, r) => acc + r.minutos, 0);

  const corriendoAqui = timerActivo?.proyectoId === proyectoId;
  const corriendoOtro = timerActivo && !corriendoAqui;

  function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    const min = parseInt(minutosManual, 10);
    if (!min || min <= 0) return;
    addRegistroTiempo({ proyectoId, fecha: hoy, minutos: min, descripcion: notaManual.trim() });
    setMinutosManual("");
    setNotaManual("");
  }

  return (
    <Section title="Tiempo trabajado">
      <div className="rounded-2xl border border-border-subtle bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {corriendoAqui ? (
            <button
              onClick={() => stopTimer()}
              className="rounded-full bg-accent-red text-white text-sm font-medium px-4 py-2"
            >
              ■ Detener y registrar
            </button>
          ) : (
            <button
              onClick={() => startTimer(proyectoId)}
              className="rounded-full bg-accent-green text-white text-sm font-medium px-4 py-2"
            >
              ▶ Empezar a trabajar aquí
            </button>
          )}
          {corriendoOtro && (
            <span className="text-xs text-muted">
              Hay un cronómetro corriendo en otro proyecto — al iniciar aquí, aquel se registra solo.
            </span>
          )}
          <div className="ml-auto flex gap-4 text-xs text-muted">
            <span>Hoy: <span className="text-foreground font-medium">{formatMinutos(minHoy)}</span></span>
            <span>Semana: <span className="text-foreground font-medium">{formatMinutos(minSemana)}</span></span>
            <span>Total: <span className="text-foreground font-medium">{formatMinutos(minTotal)}</span></span>
          </div>
        </div>

        <form onSubmit={handleAddManual} className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          <input
            value={minutosManual}
            onChange={(e) => setMinutosManual(e.target.value.replace(/\D/g, ""))}
            placeholder="Minutos"
            inputMode="numeric"
            className="w-24 rounded-lg bg-surface-2 border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
          <input
            value={notaManual}
            onChange={(e) => setNotaManual(e.target.value)}
            placeholder="¿En qué trabajaste? (opcional)"
            className="min-w-0 flex-1 rounded-lg bg-surface-2 border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
          <button
            type="submit"
            disabled={!minutosManual}
            className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm disabled:opacity-40"
          >
            Registrar
          </button>
        </form>

        {registros.length > 0 && (
          <div className="space-y-1.5 border-t border-border-subtle pt-3">
            {registros.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted w-20 shrink-0">{r.fecha}</span>
                <span className="font-medium w-16 shrink-0">{formatMinutos(r.minutos)}</span>
                <span className="text-muted truncate flex-1">{r.descripcion || "Sin nota"}</span>
                <button
                  onClick={() => deleteRegistroTiempo(r.id)}
                  className="text-accent-red shrink-0"
                  aria-label="Eliminar registro"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-sm mt-1.5">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-muted mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted">Sin registros.</p>;
}

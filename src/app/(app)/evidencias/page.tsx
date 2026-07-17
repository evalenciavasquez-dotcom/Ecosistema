"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { EvidenceBadge } from "@/components/ui/badges";
import { Pill } from "@/components/ui/Pill";
import { Evidencia, EvidenciaTipo } from "@/lib/types";
import { proyectoNombre } from "@/lib/selectors";

const TIPOS: EvidenciaTipo[] = [
  "contrato",
  "correo",
  "comprobante",
  "captura",
  "informe",
  "audio",
  "transcripcion",
  "propuesta",
  "archivo",
  "enlace",
];

const TIPO_LABEL: Record<EvidenciaTipo, string> = {
  contrato: "Contrato",
  correo: "Correo",
  comprobante: "Comprobante",
  captura: "Captura",
  informe: "Informe",
  audio: "Audio",
  transcripcion: "Transcripción",
  propuesta: "Propuesta",
  archivo: "Archivo",
  enlace: "Enlace",
};

const VERIFICACION_TONE = {
  verificada: "green",
  pendiente: "amber",
  rechazada: "red",
} as const;

export default function EvidenciasPage() {
  const evidencias = useAppStore((s) => s.evidencias);
  const proyectos = useAppStore((s) => s.proyectos);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2"
        >
          + Nueva evidencia
        </button>
      </div>

      <div className="space-y-3">
        {evidencias.length === 0 && <p className="text-sm text-muted">No hay evidencias registradas.</p>}
        {evidencias.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border-subtle bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-muted">{TIPO_LABEL[e.tipo]}</span>
                <p className="text-sm font-medium leading-snug mt-0.5">{e.afirmacionRespaldada}</p>
              </div>
              <EvidenceBadge level={e.nivelConfiabilidad} />
            </div>
            <div className="text-xs text-muted mt-2">
              {e.fuente} · {proyectoNombre(proyectos, e.proyectoId)} · {e.fecha}
            </div>
            <div className="mt-2">
              <Pill tone={VERIFICACION_TONE[e.estadoVerificacion]}>
                {e.estadoVerificacion === "verificada"
                  ? "Verificada"
                  : e.estadoVerificacion === "pendiente"
                  ? "Verificación pendiente"
                  : "Rechazada"}
              </Pill>
            </div>
          </div>
        ))}
      </div>

      {showNew && <NuevaEvidenciaModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NuevaEvidenciaModal({ onClose }: { onClose: () => void }) {
  const addEvidencia = useAppStore((s) => s.addEvidencia);
  const proyectos = useAppStore((s) => s.proyectos);
  const [tipo, setTipo] = useState<EvidenciaTipo>("correo");
  const [fuente, setFuente] = useState("");
  const [afirmacion, setAfirmacion] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [nivel, setNivel] = useState<Evidencia["nivelConfiabilidad"]>("reportado");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!afirmacion.trim()) return;
    addEvidencia({
      tipo,
      fuente: fuente.trim() || "Sin especificar",
      fecha: new Date().toISOString().slice(0, 10),
      proyectoId: proyectoId || null,
      nivelConfiabilidad: nivel,
      afirmacionRespaldada: afirmacion.trim(),
      estadoVerificacion: "pendiente",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-2 p-6 space-y-4"
      >
        <h3 className="font-semibold">Nueva evidencia</h3>
        <div>
          <label className="block text-xs text-muted mb-1">Qué afirmación respalda</label>
          <input
            autoFocus
            value={afirmacion}
            onChange={(e) => setAfirmacion(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as EvidenciaTipo)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Nivel de confiabilidad</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value as Evidencia["nivelConfiabilidad"])}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
            >
              <option value="verificado">Verificado</option>
              <option value="documentado">Documentado</option>
              <option value="reportado">Reportado</option>
              <option value="interpretacion">Interpretación</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Fuente</label>
          <input
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-sm outline-none focus:border-accent-blue"
          />
        </div>
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
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancelar
          </button>
          <button type="submit" className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

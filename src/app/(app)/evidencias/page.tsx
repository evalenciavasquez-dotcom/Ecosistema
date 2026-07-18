"use client";

import { Suspense, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { EvidenceBadge } from "@/components/ui/badges";
import { Pill } from "@/components/ui/Pill";
import { Evidencia, EvidenciaTipo } from "@/lib/types";
import { proyectoNombre } from "@/lib/selectors";
import { useOpenParam } from "@/lib/useOpenParam";

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

function EvidenciasContent() {
  const evidencias = useAppStore((s) => s.evidencias);
  const proyectos = useAppStore((s) => s.proyectos);
  const openId = useOpenParam();
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!openId) return;
    const t = setTimeout(() => {
      document.getElementById(`evidencia-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [openId]);

  function verArchivo(e: Evidencia) {
    if (!e.archivoDatos || !e.archivoTipo) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(
        e.archivoTipo === "application/pdf"
          ? `<iframe src="data:${e.archivoTipo};base64,${e.archivoDatos}" style="width:100%;height:100%;border:0"></iframe>`
          : `<img src="data:${e.archivoTipo};base64,${e.archivoDatos}" style="max-width:100%" />`
      );
    }
  }

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
          <div
            key={e.id}
            id={`evidencia-${e.id}`}
            className={`rounded-2xl border bg-surface p-4 transition-colors ${
              openId === e.id ? "border-accent-blue" : "border-border-subtle"
            }`}
          >
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
            <div className="mt-2 flex items-center gap-2">
              <Pill tone={VERIFICACION_TONE[e.estadoVerificacion]}>
                {e.estadoVerificacion === "verificada"
                  ? "Verificada"
                  : e.estadoVerificacion === "pendiente"
                  ? "Verificación pendiente"
                  : "Rechazada"}
              </Pill>
              {e.archivoDatos && (
                <button onClick={() => verArchivo(e)} className="text-xs font-medium text-accent-blue">
                  📎 Ver archivo{e.archivoNombre ? ` (${e.archivoNombre})` : ""}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && <NuevaEvidenciaModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

export default function EvidenciasPage() {
  return (
    <Suspense>
      <EvidenciasContent />
    </Suspense>
  );
}

const MAX_ARCHIVO_BYTES = 6 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function NuevaEvidenciaModal({ onClose }: { onClose: () => void }) {
  const addEvidencia = useAppStore((s) => s.addEvidencia);
  const proyectos = useAppStore((s) => s.proyectos);
  const [tipo, setTipo] = useState<EvidenciaTipo>("correo");
  const [fuente, setFuente] = useState("");
  const [afirmacion, setAfirmacion] = useState("");
  const [proyectoId, setProyectoId] = useState<string>(proyectos[0]?.id ?? "");
  const [nivel, setNivel] = useState<Evidencia["nivelConfiabilidad"]>("reportado");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [archivoError, setArchivoError] = useState("");
  const [leyendoArchivo, setLeyendoArchivo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function handleArchivo(file: File | null) {
    setArchivoError("");
    if (file && file.size > MAX_ARCHIVO_BYTES) {
      setArchivoError("El archivo supera el límite de 6 MB.");
      setArchivo(null);
      return;
    }
    setArchivo(file);
  }

  async function handleLeerConIA() {
    if (!archivo) return;
    setLeyendoArchivo(true);
    setArchivoError("");
    try {
      const data = await fileToBase64(archivo);
      const res = await fetch("/api/interpret-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, mediaType: archivo.type }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo leer el archivo");
      setAfirmacion(body.result);
    } catch (err) {
      setArchivoError((err as Error).message);
    }
    setLeyendoArchivo(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!afirmacion.trim() || guardando) return;
    setGuardando(true);
    let archivoDatos: string | undefined;
    if (archivo) {
      try {
        archivoDatos = await fileToBase64(archivo);
      } catch {
        setArchivoError("No se pudo adjuntar el archivo.");
        setGuardando(false);
        return;
      }
    }
    addEvidencia({
      tipo,
      fuente: fuente.trim() || "Sin especificar",
      fecha: new Date().toISOString().slice(0, 10),
      proyectoId: proyectoId || null,
      nivelConfiabilidad: nivel,
      afirmacionRespaldada: afirmacion.trim(),
      estadoVerificacion: "pendiente",
      ...(archivoDatos && archivo
        ? { archivoDatos, archivoTipo: archivo.type, archivoNombre: archivo.name }
        : {}),
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
        <div>
          <label className="block text-xs text-muted mb-1">Adjuntar archivo (foto o PDF, opcional)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => handleArchivo(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs"
          />
          {archivo && (
            <button
              type="button"
              onClick={handleLeerConIA}
              disabled={leyendoArchivo}
              className="mt-2 text-xs font-medium text-accent-blue disabled:opacity-50"
            >
              {leyendoArchivo ? "Leyendo…" : "Usar IA para completar la afirmación desde el archivo"}
            </button>
          )}
          {archivoError && <p className="text-xs text-accent-red mt-1">{archivoError}</p>}
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
          <button
            type="submit"
            disabled={guardando}
            className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

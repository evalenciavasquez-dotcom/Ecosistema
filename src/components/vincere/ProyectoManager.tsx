"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereFase, VincereProyectoTipo } from "@/lib/vincere/types";

const FASES: VincereFase[] = ["Emergente", "Emergente → Consolidación", "Consolidación", "Establecido"];

// Alta, renombrado y baja de proyectos. El store ya soportaba estas
// operaciones desde el inicio; esta es la pantalla que las expone — sin ella
// la plataforma solo podía trabajar los proyectos precargados.
export default function ProyectoManager({ onClose }: { onClose: () => void }) {
  const proyectos = useVincereStore((s) => s.proyectos);
  const selectedId = useVincereStore((s) => s.selectedProyectoId);
  const addProyecto = useVincereStore((s) => s.addProyecto);
  const updateProyectoMeta = useVincereStore((s) => s.updateProyectoMeta);
  const deleteProyecto = useVincereStore((s) => s.deleteProyecto);
  const setCompareProyectoId = useVincereStore((s) => s.setCompareProyectoId);
  const showToast = useVincereStore((s) => s.showToast);

  const [form, setForm] = useState<{ nombre: string; genero: string; fase: VincereFase; tipo: VincereProyectoTipo }>({
    nombre: "",
    genero: "",
    fase: "Emergente",
    tipo: "propio",
  });
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null);

  function crear() {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    const id = addProyecto({ nombre, genero: form.genero.trim(), fase: form.fase, tipo: form.tipo });
    // Una referencia nueva queda lista para comparar de inmediato.
    if (form.tipo === "competencia") setCompareProyectoId(id);
    setForm({ nombre: "", genero: "", fase: "Emergente", tipo: "propio" });
    showToast(`Proyecto "${nombre}" creado`);
    if (form.tipo === "propio") onClose();
  }

  function eliminar(id: string, nombre: string) {
    deleteProyecto(id);
    setConfirmarBorrado(null);
    showToast(`Proyecto "${nombre}" eliminado`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="vin-card w-full max-w-2xl p-6"
        style={{ background: "var(--vin-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="vin-eyebrow mb-1.5">Proyectos</div>
            <h2 className="vin-serif text-xl">Gestionar proyectos</h2>
          </div>
          <button onClick={onClose} className="vin-faint px-2 text-lg leading-none hover:underline" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <section className="mb-6">
          <div className="vin-label mb-3">Nuevo proyecto</div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="Nombre del artista"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && crear()}
              className="vin-input md:col-span-2"
            />
            <input
              placeholder="Género / estilo"
              value={form.genero}
              onChange={(e) => setForm({ ...form, genero: e.target.value })}
              className="vin-input"
            />
            <select
              className="vin-select w-full"
              value={form.fase}
              onChange={(e) => setForm({ ...form, fase: e.target.value as VincereFase })}
              aria-label="Fase de carrera"
            >
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className="vin-select w-full"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as VincereProyectoTipo })}
              aria-label="Tipo de proyecto"
            >
              <option value="propio">Proyecto propio — lo diriges</option>
              <option value="competencia">Referencia de mercado — para comparar</option>
            </select>
            <button onClick={crear} disabled={!form.nombre.trim()} className="vin-btn-primary">
              Crear proyecto
            </button>
          </div>
          <p className="vin-faint mt-2.5 text-xs leading-relaxed">
            Una <span className="vin-muted">referencia de mercado</span> es un artista que no diriges, cargado para
            comparar. Su data suele ser pública o parcial, así que la IA la lee con nivel de evidencia más bajo.
          </p>
        </section>

        <section style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1.25rem" }}>
          <div className="vin-label mb-3">Proyectos cargados</div>
          <div className="space-y-2">
            {proyectos.map((p) => (
              <div key={p.id} className="vin-card p-3.5" style={{ background: "var(--vin-surface-2)" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={p.nombre}
                    onChange={(e) => updateProyectoMeta(p.id, { nombre: e.target.value })}
                    className="vin-input !w-auto flex-1 !py-1.5 !text-sm"
                    aria-label="Nombre"
                  />
                  <select
                    className="vin-select !py-1.5 !text-xs"
                    value={p.fase}
                    onChange={(e) => updateProyectoMeta(p.id, { fase: e.target.value as VincereFase })}
                    aria-label="Fase"
                  >
                    {FASES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px]"
                    style={{
                      color: p.tipo === "propio" ? "var(--vin-accent)" : "var(--vin-muted)",
                      borderColor: p.tipo === "propio" ? "rgba(224,72,58,0.4)" : "var(--vin-border-strong)",
                    }}
                  >
                    {p.tipo === "propio" ? "Propio" : "Referencia"}
                  </span>

                  {confirmarBorrado === p.id ? (
                    <span className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => eliminar(p.id, p.nombre)}
                        className="hover:underline"
                        style={{ color: "var(--vin-accent)" }}
                      >
                        Confirmar
                      </button>
                      <button onClick={() => setConfirmarBorrado(null)} className="vin-faint hover:underline">
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmarBorrado(p.id)}
                      className="vin-faint px-1.5 text-xs hover:underline"
                      title="Eliminar proyecto"
                      disabled={proyectos.length === 1}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                {confirmarBorrado === p.id && (
                  <p className="mt-2 text-xs" style={{ color: "var(--vin-accent)" }}>
                    Se borra toda la data de {p.nombre}: canciones, lecturas de IA e informe. No se puede deshacer.
                  </p>
                )}
                {p.id === selectedId && <div className="vin-faint mt-1.5 text-[11px]">Proyecto abierto ahora</div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

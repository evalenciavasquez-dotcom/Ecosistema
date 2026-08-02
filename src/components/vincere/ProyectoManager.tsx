"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereFase, VincereProyectoTipo } from "@/lib/vincere/types";
import EspacioPanel from "./EspacioPanel";

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
  const vaciarProyecto = useVincereStore((s) => s.vaciarProyecto);
  const empezarDeCero = useVincereStore((s) => s.empezarDeCero);
  const setCompareProyectoId = useVincereStore((s) => s.setCompareProyectoId);
  const showToast = useVincereStore((s) => s.showToast);

  const [form, setForm] = useState<{ nombre: string; genero: string; fase: VincereFase; tipo: VincereProyectoTipo }>({
    nombre: "",
    genero: "",
    fase: "Emergente",
    tipo: "propio",
  });
  const [confirmarBorrado, setConfirmarBorrado] = useState<string | null>(null);
  const [confirmarVaciado, setConfirmarVaciado] = useState<string | null>(null);
  const [confirmarTodo, setConfirmarTodo] = useState(false);

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

  function vaciar(id: string, nombre: string) {
    vaciarProyecto(id);
    setConfirmarVaciado(null);
    showToast(`"${nombre}" quedó en cero. El proyecto sigue; la data no.`);
  }

  function borrarTodo() {
    empezarDeCero();
    setConfirmarTodo(false);
    showToast("Todo borrado. Crea tu primer proyecto.");
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
            <h2 className="vin-serif vin-t-xl">Gestionar proyectos</h2>
          </div>
          <button onClick={onClose} className="vin-faint px-2 vin-t-lg leading-none hover:underline" aria-label="Cerrar">
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
          <p className="vin-faint mt-2.5 vin-t-xs leading-relaxed">
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
                    className="vin-input !w-auto flex-1 !py-1.5 vin-t-sm"
                    aria-label="Nombre"
                  />
                  <select
                    className="vin-select !py-1.5 vin-t-xs"
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
                    className="rounded-full border px-2 py-0.5 vin-t-xs"
                    style={{
                      color: p.tipo === "propio" ? "var(--vin-accent)" : "var(--vin-muted)",
                      borderColor: p.tipo === "propio" ? "rgba(224,72,58,0.4)" : "var(--vin-border-strong)",
                    }}
                  >
                    {p.tipo === "propio" ? "Propio" : "Referencia"}
                  </span>

                </div>

                {/* Las acciones destructivas van en su propia línea y con
                    nombre completo. Antes eran texto gris de 11px al final de
                    una fila con un input, un select y una insignia: existían
                    pero no se encontraban. */}
                {confirmarBorrado === p.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button onClick={() => eliminar(p.id, p.nombre)} className="vin-btn-primary !py-1.5 vin-t-sm">
                      Sí, borrar {p.nombre}
                    </button>
                    <button onClick={() => setConfirmarBorrado(null)} className="vin-faint vin-t-sm hover:underline">
                      Cancelar
                    </button>
                  </div>
                ) : confirmarVaciado === p.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => vaciar(p.id, p.nombre)}
                      className="vin-btn-ghost !py-1.5 vin-t-sm"
                      style={{ color: "var(--vin-warn)", borderColor: "var(--vin-warn)" }}
                    >
                      Sí, vaciar la data
                    </button>
                    <button onClick={() => setConfirmarVaciado(null)} className="vin-faint vin-t-sm hover:underline">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => {
                        setConfirmarBorrado(null);
                        setConfirmarVaciado(p.id);
                      }}
                      className="vin-muted vin-t-sm hover:underline"
                      style={{ textUnderlineOffset: "3px" }}
                    >
                      Vaciar su data
                    </button>
                    <span className="vin-faint vin-t-sm">·</span>
                    <button
                      onClick={() => {
                        setConfirmarVaciado(null);
                        setConfirmarBorrado(p.id);
                      }}
                      className="vin-t-sm hover:underline"
                      style={{ color: "var(--vin-risk)", textUnderlineOffset: "3px" }}
                    >
                      Borrar este proyecto
                    </button>
                    <span className="vin-faint vin-t-sm">
                      Vaciar conserva el proyecto; borrar se lo lleva entero.
                    </span>
                  </div>
                )}
                {confirmarVaciado === p.id && (
                  <p className="mt-2 vin-t-xs leading-relaxed" style={{ color: "#e0a83a" }}>
                    Se borra la data de {p.nombre} —cifras, canciones, shows, lecturas, informes e histórico— pero el
                    proyecto se conserva con su nombre, género y fase. No se puede deshacer.
                  </p>
                )}
                {confirmarBorrado === p.id && (
                  <p className="mt-2 vin-t-xs" style={{ color: "var(--vin-accent)" }}>
                    Se borra toda la data de {p.nombre}: canciones, lecturas de IA e informe. No se puede deshacer.
                  </p>
                )}
                {p.id === selectedId && <div className="vin-faint mt-1.5 vin-t-xs">Proyecto abierto ahora</div>}
              </div>
            ))}
            {proyectos.length === 0 && (
              <p className="vin-muted vin-t-sm leading-relaxed">
                No hay ningún proyecto. Crea el primero arriba.
              </p>
            )}
          </div>
        </section>

        {/* El espacio se mide aquí porque es donde se decide qué borrar. */}
        <section className="mt-6" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1.25rem" }}>
          <EspacioPanel />
        </section>

        {/* Salir de los datos de ejemplo es lo primero que hay que poder hacer
            con data real en la mano. Va al final y con confirmación escrita
            porque borra todo, incluido lo que esté en la base. */}
        {proyectos.length > 0 && (
          <section className="mt-6" style={{ borderTop: "1px solid var(--vin-border)", paddingTop: "1.25rem" }}>
            <div className="vin-label mb-2">Empezar de cero</div>
            {confirmarTodo ? (
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(224,72,58,0.07)", border: "1px solid rgba(224,72,58,0.3)" }}
              >
                <p className="mb-3 vin-t-sm leading-relaxed">
                  Se borran los {proyectos.length} proyectos con toda su data, los casos de triage y las
                  comparaciones. Si tienes base de datos conectada, también se borra allá. No se puede deshacer.
                </p>
                <p className="vin-faint mb-3 vin-t-sm leading-relaxed">
                  Si quieres guardar algo antes, sal de VINCERE y usa C.C.O. → Configuración → «Exportar todos los
                  datos».
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={borrarTodo} className="vin-btn-primary !py-1.5 vin-t-xs">
                    Sí, borrar todo
                  </button>
                  <button onClick={() => setConfirmarTodo(false)} className="vin-faint vin-t-xs hover:underline">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="vin-muted mb-2.5 vin-t-sm leading-relaxed">
                  SETTE y LUNA REBEL vienen cargados como ejemplo para que veas la plataforma funcionando. Cuando
                  tengas data real, esto los saca a todos de una.
                </p>
                <button onClick={() => setConfirmarTodo(true)} className="vin-btn-ghost !py-1.5 vin-t-xs">
                  Borrar todos los proyectos
                </button>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

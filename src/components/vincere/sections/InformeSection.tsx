"use client";

import { useState } from "react";
import {
  VincereInforme,
  VincereInformeBloque,
  VincereInformeOportunidad,
  VincereInformePaso,
  VincereInformeRiesgo,
  VincereNivel,
  VincerePrioridadPaso,
  VincereProyecto,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { buildInformeContext } from "@/lib/vincere/context";
import { fetchInforme, registerNotion } from "@/lib/vincere/ai-client";
import { downloadMarkdown, informeToMarkdown } from "@/lib/vincere/informe-export";
import { SectionHeader, Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const PRIORIDAD_COLOR: Record<VincerePrioridadPaso, string> = {
  Alta: "#e0483a",
  Media: "#e0a83a",
  Baja: "#a39c92",
};
const PRIORIDADES: VincerePrioridadPaso[] = ["Alta", "Media", "Baja"];
const NIVELES: VincereNivel[] = [4, 3, 2, 1];

export default function InformeSection({ proyecto }: { proyecto: VincereProyecto }) {
  const setInforme = useVincereStore((s) => s.setInforme);
  const updateInforme = useVincereStore((s) => s.updateInforme);
  const restaurarArchivado = useVincereStore((s) => s.restaurarInformeArchivado);
  const eliminarArchivado = useVincereStore((s) => s.eliminarInformeArchivado);
  const showToast = useVincereStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const informe = proyecto.informe ?? null;
  const patch = (p: Partial<VincereInforme>) => updateInforme(proyecto.id, p);

  async function generar() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInforme(buildInformeContext(proyecto));
      setInforme(proyecto.id, result);
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo emitir el informe");
    } finally {
      setLoading(false);
    }
  }

  async function archivar() {
    if (!informe || registering) return;
    setRegistering(true);
    const result = await registerNotion({
      proyecto: proyecto.nombre,
      seccion: "Informe Final",
      titulo: informe.titulo,
      detalle: informeToMarkdown(informe, proyecto),
    });
    setRegistering(false);
    if (result.status === "ok") showToast("Informe archivado en Notion");
    else if (result.status === "not_configured") showToast("Notion no está configurado — configúralo para archivar el histórico");
    else showToast(`No se pudo archivar: ${result.error}`);
  }

  return (
    <div>
      <div className="vin-no-print">
        <SectionHeader
          eyebrow="Informe Final"
          title="El entregable"
          subtitle="La lectura consolidada del proyecto. La IA emite el borrador cruzando todos los motores; tú lo trabajas aquí — corriges, añades, marcas lo cumplido — y queda guardado."
        />
      </div>

      <div className="vin-no-print mb-5 flex flex-wrap items-center gap-3">
        <button onClick={generar} disabled={loading} className={informe ? "vin-btn-ghost" : "vin-btn-primary"}>
          {loading ? "Emitiendo informe…" : informe ? "Volver a emitir" : "Emitir informe final"}
        </button>
        {informe && (
          <>
            <button onClick={() => setEditando((v) => !v)} className={editando ? "vin-btn-primary" : "vin-btn-ghost"}>
              {editando ? "Terminar de editar" : "Editar informe"}
            </button>
            <button onClick={() => downloadMarkdown(informe, proyecto)} className="vin-btn-ghost">
              Descargar
            </button>
            <button onClick={() => window.print()} className="vin-btn-ghost">
              Imprimir / PDF
            </button>
            <button onClick={archivar} disabled={registering} className="vin-btn-ghost">
              {registering ? "Archivando…" : "Archivar en Notion"}
            </button>
          </>
        )}
      </div>

      {informe && editando && (
        <p className="vin-no-print vin-faint mb-4 vin-t-xs leading-relaxed">
          Modo edición: toca cualquier texto para corregirlo. Los cambios se guardan solos. «Volver a emitir» genera un
          borrador nuevo y archiva este — lo editado no se pierde, queda en «Informes anteriores».
        </p>
      )}

      {error && (
        <p className="vin-no-print mb-4 vin-t-xs" style={{ color: "var(--vin-accent)" }}>
          {error}
        </p>
      )}

      {loading && !informe && (
        <Panel>
          <p className="vin-muted vin-t-sm">
            Cruzando momentum, catálogo, audiencia, zonas, decisiones y KPIs… El informe tarda más que una lectura de
            sección porque razona sobre todo el proyecto junto.
          </p>
        </Panel>
      )}

      {!informe && !loading && (
        <Panel>
          <p className="vin-muted vin-t-sm">
            Todavía no se ha emitido un informe para {proyecto.nombre}. Cuanta más data y más lecturas VINCERE tengas
            generadas en las secciones, más sólido sale — el informe las integra y las lleva más lejos.
          </p>
        </Panel>
      )}

      {informe && (
        <InformeDocumento informe={informe} proyecto={proyecto} editando={editando} patch={patch} />
      )}

      {(proyecto.informesArchivados?.length ?? 0) > 0 && (
        <div className="vin-no-print mt-5">
          <Panel>
            <PanelLabel>Informes anteriores · {proyecto.informesArchivados!.length}</PanelLabel>
            <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
              Cada vez que emites uno nuevo, el anterior se archiva aquí con lo que hubieras editado. Recuperar uno
              intercambia: el activo pasa al archivo.
            </p>
            <ul className="space-y-2.5">
              {proyecto.informesArchivados!.map((a) => (
                <li
                  key={a.generadoEn}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2.5"
                  style={{ borderColor: "var(--vin-border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="vin-t-base leading-snug">{a.titulo}</div>
                    <div className="vin-faint mt-0.5 vin-t-xs">
                      {new Date(a.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}
                      {a.proximosPasos.filter((p) => p.hecho).length} de {a.proximosPasos.length} pasos cumplidos
                      {a.editadoEn ? " · trabajado a mano" : ""}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-3 vin-t-xs">
                    <button
                      onClick={() => {
                        restaurarArchivado(proyecto.id, a.generadoEn);
                        showToast("Informe recuperado");
                      }}
                      className="hover:underline"
                      style={{ color: "var(--vin-accent)" }}
                    >
                      Recuperar
                    </button>
                    <button
                      onClick={() => eliminarArchivado(proyecto.id, a.generadoEn)}
                      className="vin-faint hover:underline"
                      title="Eliminar del archivo"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

// --- Campos editables -------------------------------------------------------

function Editable({
  value,
  onChange,
  editando,
  className = "",
  placeholder,
  // Ancho aproximado del campo en caracteres — de ahí se calculan las filas
  // para que el texto quepa completo sin recortarse. Los campos angostos
  // (columnas de riesgos, responsable de un paso) necesitan un valor menor.
  charsPorLinea = 90,
  minFilas = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  editando: boolean;
  className?: string;
  placeholder?: string;
  charsPorLinea?: number;
  minFilas?: number;
}) {
  if (!editando) return <span className={className}>{value}</span>;
  const filas = Math.max(minFilas, Math.ceil((value.length || 1) / charsPorLinea));
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={filas}
      className={`vin-input ${className}`}
      style={{ resize: "vertical", lineHeight: "1.6" }}
    />
  );
}

function BotonQuitar({ onClick, label = "Quitar" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="vin-faint shrink-0 px-2 vin-t-xs hover:underline" title={label}>
      ✕
    </button>
  );
}

function BotonAnadir({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="vin-faint vin-no-print mt-2 vin-t-xs hover:underline">
      + {children}
    </button>
  );
}

function SelectorNivel({ nivel, onChange }: { nivel: VincereNivel; onChange: (n: VincereNivel) => void }) {
  return (
    <select
      className="vin-select !py-1 vin-t-xs"
      value={nivel}
      onChange={(e) => onChange(Number(e.target.value) as VincereNivel)}
      aria-label="Nivel de evidencia"
    >
      {NIVELES.map((n) => (
        <option key={n} value={n}>
          Nivel {n}
        </option>
      ))}
    </select>
  );
}

// --- Documento --------------------------------------------------------------

function InformeDocumento({
  informe,
  proyecto,
  editando,
  patch,
}: {
  informe: VincereInforme;
  proyecto: VincereProyecto;
  editando: boolean;
  patch: (p: Partial<VincereInforme>) => void;
}) {
  const fecha = new Date(informe.generadoEn).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const setBloques = (bloques: VincereInformeBloque[]) => patch({ bloques });
  const setRiesgos = (riesgos: VincereInformeRiesgo[]) => patch({ riesgos });
  const setOportunidades = (oportunidades: VincereInformeOportunidad[]) => patch({ oportunidades });
  const setPasos = (proximosPasos: VincereInformePaso[]) => patch({ proximosPasos });

  const pasosHechos = informe.proximosPasos.filter((p) => p.hecho).length;

  // Índice del paso que se está convirtiendo en predicción, si hay alguno.
  const [predDe, setPredDe] = useState<number | null>(null);
  const yaEsPrediccion = (accion: string) =>
    (proyecto.predicciones ?? []).some((p) => p.afirmacion.trim() === accion.trim());

  return (
    <article className="vin-print-area vin-card p-6 md:p-10">
      <header className="mb-8 border-b pb-6" style={{ borderColor: "var(--vin-border)" }}>
        <div className="vin-eyebrow mb-2.5">Informe de dirección · VINCERE</div>
        {editando ? (
          <Editable
            value={informe.titulo}
            onChange={(titulo) => patch({ titulo })}
            editando
            className="vin-serif mb-3 vin-t-xl"
            charsPorLinea={55}
            minFilas={2}
          />
        ) : (
          <h2 className="vin-serif mb-3 vin-t-xl font-medium leading-snug md:vin-t-display">{informe.titulo}</h2>
        )}
        <div className="vin-muted flex flex-wrap items-center gap-x-3 gap-y-1.5 vin-t-sm">
          <span style={{ color: "var(--vin-text)" }}>{proyecto.nombre}</span>
          <span>·</span>
          <span>{proyecto.genero}</span>
          <span>·</span>
          <span>Fase: {proyecto.fase}</span>
          <span>·</span>
          <span>{fecha}</span>
          {editando ? (
            <SelectorNivel nivel={informe.nivelGlobal} onChange={(nivelGlobal) => patch({ nivelGlobal })} />
          ) : (
            <EvidenceTag nivel={informe.nivelGlobal} />
          )}
          {informe.editadoEn && <span className="vin-faint">· trabajado en la plataforma</span>}
        </div>
      </header>

      <section className="mb-8">
        <h3 className="vin-serif mb-3 vin-t-xl">Sinopsis Central</h3>
        <Editable
          value={informe.sinopsis}
          onChange={(sinopsis) => patch({ sinopsis })}
          editando={editando}
          className="vin-t-base leading-[1.75]"
          minFilas={4}
        />
      </section>

      <section
        className="mb-8 rounded-xl p-5"
        style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
      >
        <div className="vin-label mb-2" style={{ color: "var(--vin-accent)" }}>
          Veredicto
        </div>
        <Editable
          value={informe.veredicto}
          onChange={(veredicto) => patch({ veredicto })}
          editando={editando}
          className="vin-t-base leading-relaxed"
          placeholder="La postura: qué se hace con este proyecto ahora y por qué."
        />
      </section>

      {informe.bloques.map((bloque, i) => (
        <section key={i} className="mb-7">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            {editando ? (
              <Editable
                value={bloque.titulo}
                onChange={(titulo) => setBloques(informe.bloques.map((b, j) => (j === i ? { ...b, titulo } : b)))}
                editando
                className="vin-serif flex-1 vin-t-lg"
                charsPorLinea={70}
              />
            ) : (
              <h3 className="vin-serif vin-t-lg">
                {i + 1}. {bloque.titulo}
              </h3>
            )}
            <div className="flex items-center gap-2">
              {editando ? (
                <SelectorNivel
                  nivel={bloque.nivel}
                  onChange={(nivel) => setBloques(informe.bloques.map((b, j) => (j === i ? { ...b, nivel } : b)))}
                />
              ) : (
                <EvidenceTag nivel={bloque.nivel} />
              )}
              {editando && <BotonQuitar onClick={() => setBloques(informe.bloques.filter((_, j) => j !== i))} />}
            </div>
          </div>

          {bloque.parrafos.map((p, k) => (
            <div key={k} className="mb-2.5 flex items-start gap-2">
              <Editable
                value={p}
                onChange={(texto) =>
                  setBloques(
                    informe.bloques.map((b, j) =>
                      j === i ? { ...b, parrafos: b.parrafos.map((q, m) => (m === k ? texto : q)) } : b
                    )
                  )
                }
                editando={editando}
                className="flex-1 vin-t-base leading-[1.7]"
              />
              {editando && bloque.parrafos.length > 1 && (
                <BotonQuitar
                  onClick={() =>
                    setBloques(
                      informe.bloques.map((b, j) =>
                        j === i ? { ...b, parrafos: b.parrafos.filter((_, m) => m !== k) } : b
                      )
                    )
                  }
                />
              )}
            </div>
          ))}

          {editando && (
            <BotonAnadir
              onClick={() =>
                setBloques(
                  informe.bloques.map((b, j) => (j === i ? { ...b, parrafos: [...b.parrafos, ""] } : b))
                )
              }
            >
              párrafo
            </BotonAnadir>
          )}
        </section>
      ))}

      {editando && (
        <BotonAnadir
          onClick={() => setBloques([...informe.bloques, { titulo: "Nuevo bloque", parrafos: [""], nivel: 2 }])}
        >
          bloque
        </BotonAnadir>
      )}

      {(informe.riesgos.length > 0 || informe.oportunidades.length > 0 || editando) && (
        <div className="mb-8 mt-8 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="vin-serif mb-3 vin-t-lg">Riesgos</h3>
            <ul className="space-y-3.5">
              {informe.riesgos.map((r, i) => (
                <li key={i} className="border-l-2 pl-3.5" style={{ borderColor: "var(--vin-accent)" }}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Editable
                      value={r.riesgo}
                      onChange={(riesgo) => setRiesgos(informe.riesgos.map((x, j) => (j === i ? { ...x, riesgo } : x)))}
                      editando={editando}
                      className="flex-1 vin-t-sm font-medium"
                      charsPorLinea={38}
                    />
                    {editando ? (
                      <SelectorNivel
                        nivel={r.nivel}
                        onChange={(nivel) => setRiesgos(informe.riesgos.map((x, j) => (j === i ? { ...x, nivel } : x)))}
                      />
                    ) : (
                      <EvidenceTag nivel={r.nivel} />
                    )}
                    {editando && <BotonQuitar onClick={() => setRiesgos(informe.riesgos.filter((_, j) => j !== i))} />}
                  </div>
                  <Editable
                    value={r.consecuencia}
                    onChange={(consecuencia) =>
                      setRiesgos(informe.riesgos.map((x, j) => (j === i ? { ...x, consecuencia } : x)))
                    }
                    editando={editando}
                    className="vin-muted vin-t-base leading-relaxed"
                    charsPorLinea={44}
                  />
                </li>
              ))}
            </ul>
            {editando && (
              <BotonAnadir
                onClick={() => setRiesgos([...informe.riesgos, { riesgo: "", consecuencia: "", nivel: 2 }])}
              >
                riesgo
              </BotonAnadir>
            )}
          </section>

          <section>
            <h3 className="vin-serif mb-3 vin-t-lg">Oportunidades</h3>
            <ul className="space-y-3.5">
              {informe.oportunidades.map((o, i) => (
                <li key={i} className="border-l-2 pl-3.5" style={{ borderColor: "#5cc98e" }}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Editable
                      value={o.oportunidad}
                      onChange={(oportunidad) =>
                        setOportunidades(informe.oportunidades.map((x, j) => (j === i ? { ...x, oportunidad } : x)))
                      }
                      editando={editando}
                      className="flex-1 vin-t-sm font-medium"
                      charsPorLinea={38}
                    />
                    {editando ? (
                      <SelectorNivel
                        nivel={o.nivel}
                        onChange={(nivel) =>
                          setOportunidades(informe.oportunidades.map((x, j) => (j === i ? { ...x, nivel } : x)))
                        }
                      />
                    ) : (
                      <EvidenceTag nivel={o.nivel} />
                    )}
                    {editando && (
                      <BotonQuitar onClick={() => setOportunidades(informe.oportunidades.filter((_, j) => j !== i))} />
                    )}
                  </div>
                  <Editable
                    value={o.porQue}
                    onChange={(porQue) =>
                      setOportunidades(informe.oportunidades.map((x, j) => (j === i ? { ...x, porQue } : x)))
                    }
                    editando={editando}
                    className="vin-muted vin-t-base leading-relaxed"
                    charsPorLinea={44}
                  />
                </li>
              ))}
            </ul>
            {editando && (
              <BotonAnadir
                onClick={() =>
                  setOportunidades([...informe.oportunidades, { oportunidad: "", porQue: "", nivel: 2 }])
                }
              >
                oportunidad
              </BotonAnadir>
            )}
          </section>
        </div>
      )}

      <section className="border-t pt-6" style={{ borderColor: "var(--vin-border)" }}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="vin-serif vin-t-lg">Próximos Pasos</h3>
          {informe.proximosPasos.length > 0 && (
            <span className="vin-faint vin-t-xs">
              {pasosHechos} de {informe.proximosPasos.length} cumplidos
            </span>
          )}
        </div>

        <ul className="space-y-3">
          {informe.proximosPasos.map((p, i) => (
            <li
              key={i}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-3"
              style={{ borderColor: "var(--vin-border)" }}
            >
              <label
                className="flex flex-1 cursor-pointer items-baseline gap-2.5"
                style={{ minWidth: "min(100%, 18rem)" }}
              >
                <input
                  type="checkbox"
                  checked={!!p.hecho}
                  onChange={(e) =>
                    setPasos(informe.proximosPasos.map((x, j) => (j === i ? { ...x, hecho: e.target.checked } : x)))
                  }
                  className="shrink-0"
                  style={{ accentColor: "var(--vin-accent)" }}
                />
                <Editable
                  value={p.accion}
                  onChange={(accion) =>
                    setPasos(informe.proximosPasos.map((x, j) => (j === i ? { ...x, accion } : x)))
                  }
                  editando={editando}
                  className={`flex-1 vin-t-sm leading-relaxed ${p.hecho && !editando ? "line-through opacity-55" : ""}`}
                  charsPorLinea={52}
                />
              </label>

              <div className="vin-muted flex flex-wrap items-center gap-2 vin-t-xs">
                {editando ? (
                  <>
                    <Editable
                      value={p.responsable}
                      onChange={(responsable) =>
                        setPasos(informe.proximosPasos.map((x, j) => (j === i ? { ...x, responsable } : x)))
                      }
                      editando
                      className="!w-32 !py-1 vin-t-xs"
                      charsPorLinea={16}
                      placeholder="Responsable"
                    />
                    <Editable
                      value={p.plazo}
                      onChange={(plazo) =>
                        setPasos(informe.proximosPasos.map((x, j) => (j === i ? { ...x, plazo } : x)))
                      }
                      editando
                      className="!w-32 !py-1 vin-t-xs"
                      charsPorLinea={16}
                      placeholder="Plazo"
                    />
                    <select
                      className="vin-select !py-1 vin-t-xs"
                      value={p.prioridad}
                      onChange={(e) =>
                        setPasos(
                          informe.proximosPasos.map((x, j) =>
                            j === i ? { ...x, prioridad: e.target.value as VincerePrioridadPaso } : x
                          )
                        )
                      }
                      aria-label="Prioridad"
                    >
                      {PRIORIDADES.map((pr) => (
                        <option key={pr} value={pr}>
                          {pr}
                        </option>
                      ))}
                    </select>
                    <BotonQuitar onClick={() => setPasos(informe.proximosPasos.filter((_, j) => j !== i))} />
                  </>
                ) : (
                  <>
                    <span>{p.responsable}</span>
                    <span>·</span>
                    <span>{p.plazo}</span>
                    <span
                      className="rounded-full border px-2 py-0.5 vin-t-xs font-medium"
                      style={{ color: PRIORIDAD_COLOR[p.prioridad], borderColor: `${PRIORIDAD_COLOR[p.prioridad]}66` }}
                    >
                      {p.prioridad}
                    </span>
                    {yaEsPrediccion(p.accion) ? (
                      <span className="vin-faint vin-no-print vin-t-xs">· ya es predicción</span>
                    ) : (
                      <button
                        onClick={() => setPredDe(predDe === i ? null : i)}
                        className="vin-faint vin-no-print vin-t-xs hover:underline"
                      >
                        · {predDe === i ? "cancelar" : "→ predicción"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {predDe === i && !editando && (
                <PrediccionDesdePaso
                  proyectoId={proyecto.id}
                  paso={p}
                  onListo={() => setPredDe(null)}
                />
              )}
            </li>
          ))}
        </ul>

        {!editando && informe.proximosPasos.length > 0 && (
          <p className="vin-faint vin-no-print mt-3 vin-t-xs leading-relaxed">
            Un paso dice qué vas a hacer. Una predicción dice qué esperas que pase — con fecha y con una forma de
            saber que falló. Sin eso, el informe nunca se puede evaluar.
          </p>
        )}

        {editando && (
          <BotonAnadir
            onClick={() =>
              setPasos([
                ...informe.proximosPasos,
                { accion: "", responsable: "", plazo: "", prioridad: "Media", hecho: false },
              ])
            }
          >
            paso
          </BotonAnadir>
        )}
      </section>

      <footer className="vin-faint mt-8 border-t pt-4 vin-t-xs leading-relaxed" style={{ borderColor: "var(--vin-border)" }}>
        Emitido por VINCERE Intelligence Platform · Cada afirmación lleva nivel de evidencia 1-4 (4 alta evidencia · 3
        evidencia sólida · 2 evidencia parcial · 1 especulativo).
      </footer>
    </article>
  );
}

// --- Del paso a la predicción -----------------------------------------------

function hoyMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// El plazo del informe es texto libre: "30 días", "6 semanas", "2026-03-15".
// Se intenta leer; si no se entiende, quedan 30 días y Eduardo lo corrige.
function fechaDesdePlazo(plazo: string): string {
  const iso = plazo.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const rel = plazo.match(/(\d+)\s*(d[ií]as?|semanas?|meses?)/i);
  if (rel) {
    const n = Number(rel[1]);
    const unidad = rel[2].toLowerCase();
    if (unidad.startsWith("d")) return hoyMas(n);
    if (unidad.startsWith("s")) return hoyMas(n * 7);
    return hoyMas(n * 30);
  }
  return hoyMas(30);
}

function PrediccionDesdePaso({
  proyectoId,
  paso,
  onListo,
}: {
  proyectoId: string;
  paso: VincereInformePaso;
  onListo: () => void;
}) {
  const addPrediccion = useVincereStore((s) => s.addPrediccion);
  const showToast = useVincereStore((s) => s.showToast);

  const [afirmacion, setAfirmacion] = useState(paso.accion);
  const [comoSeVerifica, setComoSeVerifica] = useState("");
  const [venceEn, setVenceEn] = useState(() => fechaDesdePlazo(paso.plazo));
  const [nivel, setNivel] = useState<VincereNivel>(2);

  const listo = afirmacion.trim().length > 0 && comoSeVerifica.trim().length > 0 && venceEn.length === 10;

  function crear() {
    if (!listo) return;
    addPrediccion(proyectoId, {
      motor: "informe",
      afirmacion: afirmacion.trim(),
      comoSeVerifica: comoSeVerifica.trim(),
      venceEn,
      nivelAlEmitir: nivel,
    });
    showToast("Predicción abierta. Vive en Predicciones hasta que se cierre.");
    onListo();
  }

  return (
    <div
      className="vin-no-print mt-3 w-full rounded-xl p-3.5"
      style={{ background: "var(--vin-surface)", border: "1px solid var(--vin-border)" }}
    >
      <p className="vin-faint mb-2.5 vin-t-xs uppercase tracking-[0.08em]">Convertir en predicción</p>

      <div className="grid gap-2.5">
        <textarea
          value={afirmacion}
          onChange={(e) => setAfirmacion(e.target.value)}
          rows={2}
          className="vin-input resize-none vin-t-sm"
          placeholder="Qué esperas que pase"
        />
        <textarea
          value={comoSeVerifica}
          onChange={(e) => setComoSeVerifica(e.target.value)}
          rows={2}
          className="vin-input resize-none vin-t-sm"
          placeholder="Cómo se verifica: qué habría que ver para decir que falló"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={venceEn}
            onChange={(e) => setVenceEn(e.target.value)}
            className="vin-input !w-auto !py-1.5 vin-t-xs"
            aria-label="Vence en"
          />
          <select
            className="vin-select !py-1.5 vin-t-xs"
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value) as VincereNivel)}
            aria-label="Nivel al emitir"
          >
            {NIVELES.map((n) => (
              <option key={n} value={n}>
                Nivel {n}
              </option>
            ))}
          </select>
          <button onClick={crear} disabled={!listo} className="vin-btn-primary !px-3.5 !py-1.5 vin-t-xs">
            Abrir predicción
          </button>
        </div>
        {!comoSeVerifica.trim() && (
          <p className="vin-faint vin-t-xs leading-relaxed">
            Sin &ldquo;cómo se verifica&rdquo; no es una predicción, es una opinión con fecha.
          </p>
        )}
      </div>
    </div>
  );
}

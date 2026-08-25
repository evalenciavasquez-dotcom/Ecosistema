"use client";

import { useMemo, useRef, useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import {
  VincereQAEntry,
  VINCERE_DATA_QUE_SIRVE,
  VINCERE_VINCULO_LABEL,
} from "@/lib/vincere/types";
import { evidenciaDeEntrada, hechosDelProyecto } from "@/lib/vincere/entrada";
import EvidenciaDeEntradaPanel from "../EvidenciaDeEntradaPanel";
import { fetchAsk, fetchResearch, fetchTriage } from "@/lib/vincere/ai-client";
import { genId } from "@/lib/id";
import { SectionHeader, Panel } from "../primitives";
import EvidenceTag from "../EvidenceTag";
import QuestionBox from "../QuestionBox";

const FASES = ["Emergente", "Consolidación", "Establecido", "No lo sé aún"];

function leerArchivo(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve({
        data: result.includes(",") ? result.slice(result.indexOf(",") + 1) : result,
        mediaType: file.type,
      });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

const PRIORIDAD_COLOR: Record<string, string> = {
  Alta: "#e0483a",
  Media: "#e0a83a",
  Baja: "#5cc98e",
};

export default function TriageSection() {
  const triageCasos = useVincereStore((s) => s.triageCasos);
  const addTriageCaso = useVincereStore((s) => s.addTriageCaso);
  const updateVeredicto = useVincereStore((s) => s.updateTriageCasoVeredicto);
  const deleteTriageCaso = useVincereStore((s) => s.deleteTriageCaso);

  const proyectos = useVincereStore((s) => s.proyectos);

  const [form, setForm] = useState<{
    nombre: string;
    genero: string;
    fase: string;
    descripcion: string;
  }>({ nombre: "", genero: "", fase: "Emergente", descripcion: "" });
  const [archivo, setArchivo] = useState<File | null>(null);
  // Cuando el caso es sobre un artista que YA está en el sistema, el veredicto
  // deja de apoyarse en lo que Eduardo recuerde y pasa a leer sus números.
  const [proyectoId, setProyectoId] = useState<string>("");
  // Buscar en la web es parte del ANÁLISIS, no un paso previo. Antes era un
  // botón que había que apretar antes; pero el usuario no quiere hacer una
  // búsqueda, quiere un veredicto — y lo que la web diga es parte del sustento
  // de ese veredicto, no un trámite que se hace aparte y se lee suelto.
  const [conWeb, setConWeb] = useState(true);
  const [fase, setFase] = useState<"" | "buscando" | "analizando">("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaLog, setQaLog] = useState<VincereQAEntry[]>([]);

  const proyectoElegido = proyectos.find((p) => p.id === proyectoId) ?? null;

  // El techo se calcula mientras escribe, con la MISMA función que usa el
  // servidor. Verlo antes de pedir el veredicto es lo que convierte "falta
  // data" en algo accionable: se ve qué sube el techo y cuánto.
  const evidencia = useMemo(
    () =>
      evidenciaDeEntrada({
        descripcion: form.descripcion,
        tieneArchivo: !!archivo,
        // El análisis es atómico: si la casilla está marcada, la búsqueda va a
        // correr, así que el techo que se muestra es el que va a tener.
        investigoWeb: conWeb,
        ...hechosDelProyecto(proyectoElegido),
      }),
    [form.descripcion, archivo, proyectoElegido, conWeb]
  );

  // Lo que el sistema YA sabe del artista, cuando está cargado. Van los
  // números medidos y no el proyecto entero: el veredicto necesita saber
  // cuánto y desde cuándo, no leerse el catálogo completo.
  function datosDelProyecto() {
    if (!proyectoElegido) return null;
    const r = proyectoElegido.resumen;
    const fechas = (proyectoElegido.historial ?? []).map((h) => h.fecha).sort();
    return {
      artista: proyectoElegido.nombre,
      genero: proyectoElegido.genero,
      fase: proyectoElegido.fase,
      streamsMes: r.streamsMes,
      oyentesMes: r.oyentesMes ?? null,
      seguidores: r.seguidores,
      cambioStreamsPct: r.streamsCambioPct,
      canciones: (proyectoElegido.canciones ?? []).length,
      fotosDesde: fechas[0] ?? null,
      fotosHasta: fechas[fechas.length - 1] ?? null,
    };
  }

  async function run() {
    if (loading || !form.nombre.trim() || !evidencia.suficienteParaVeredicto) return;
    setLoading(true);
    setError(null);
    const nombre = form.nombre.trim();
    const id = addTriageCaso({
      nombre: form.nombre.trim(),
      genero: form.genero.trim(),
      fase: form.fase,
      descripcion: form.descripcion.trim(),
      // El campo sigue en el tipo por la data ya guardada; ahora se deriva del
      // techo calculado en vez de pedírselo a nadie.
      dataDisponible: evidencia.techo >= 4 ? "alta" : evidencia.techo === 3 ? "media" : "baja",
    });
    try {
      // La web primero, para que sus hallazgos entren al veredicto. Si falla,
      // el análisis sigue sin ella: quedarse sin veredicto porque la búsqueda
      // no respondió sería perder lo importante por lo accesorio.
      let web: { resumen: string; hallazgos: string[] } | null = null;
      if (conWeb) {
        setFase("buscando");
        try {
          const { investigacion } = await fetchResearch({
            tipo: "artista",
            consulta: `${nombre}${form.genero.trim() ? ` — ${form.genero.trim()}` : ""}: qué se sabe públicamente, qué tan real es su tracción y qué señales hay de su mercado`,
            artista: { nombre, genero: form.genero.trim(), fase: form.fase },
          });
          web = {
            resumen: investigacion.resumen,
            hallazgos: investigacion.hallazgos.map((h) => h.texto),
          };
        } catch {
          // Se anota en el veredicto por su ausencia: el techo baja solo.
          web = null;
        }
      }

      setFase("analizando");
      const adjunto = archivo ? await leerArchivo(archivo) : null;
      const r = await fetchTriage({
        nombre: form.nombre.trim(),
        genero: form.genero.trim(),
        fase: form.fase,
        descripcion: form.descripcion.trim(),
        ...(adjunto ? { data: adjunto.data, mediaType: adjunto.mediaType } : {}),
        ...hechosDelProyecto(proyectoElegido),
        investigoWeb: !!web,
        datosDelProyecto: datosDelProyecto(),
        investigacion: web,
      });
      updateVeredicto(id, { ...r, web });
      setForm({ nombre: "", genero: "", fase: "Emergente", descripcion: "" });
      setArchivo(null);
      setProyectoId("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el caso");
      deleteTriageCaso(id);
    } finally {
      setLoading(false);
      setFase("");
    }
  }

  async function ask(pregunta: string) {
    const contexto = {
      casosRecientes: triageCasos.slice(0, 8).map((c) => ({
        nombre: c.nombre,
        genero: c.genero,
        fase: c.fase,
        descripcion: c.descripcion,
        veredicto: c.veredicto,
        prioridad: c.prioridad,
      })),
    };
    const { respuesta, nivel } = await fetchAsk("Triage VINCERE — casos nuevos", contexto, pregunta);
    setQaLog((prev) => [
      ...prev,
      { id: genId("qa"), pregunta, respuesta, nivel, creadoEn: new Date().toISOString() },
    ]);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Triage"
        title="Triage de casos nuevos"
        subtitle="La puerta de entrada: qué caso vale la pena y por dónde empieza. Lee el material que le adjuntes y, si el artista ya está cargado, sus números — el alcance del veredicto sale de lo que haya de verdad, no de lo que declares."
      />

      <div className="space-y-5">
        <Panel>
          <div className="grid gap-3.5">
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del caso / artista"
              className="vin-input"
            />
            <div className="grid gap-3.5 md:grid-cols-2">
              <input
                value={form.genero}
                onChange={(e) => setForm({ ...form, genero: e.target.value })}
                placeholder="Género / estilo"
                className="vin-input"
              />
              <select value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })} className="vin-input">
                {FASES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción breve del caso…"
              rows={3}
              className="vin-input resize-none"
            />

            {/* El material. Es lo que separa un veredicto de una opinión:
                sin nada adjunto, el motor solo puede juzgar lo que le
                contaron. */}
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer rounded-xl p-4 text-center transition-colors"
              style={{ border: "1px dashed var(--vin-border-strong)" }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
              {archivo ? (
                <>
                  <div className="vin-t-sm">{archivo.name}</div>
                  <div className="vin-faint vin-t-xs mt-1">
                    {Math.round(archivo.size / 1024)} KB · haz clic para cambiarlo
                  </div>
                </>
              ) : (
                <>
                  <div className="vin-t-sm">Adjunta lo que tengas del caso</div>
                  <div className="vin-faint vin-t-xs mt-1">
                    Una captura de Spotify for Artists, un dossier, un PDF. Sube el techo del veredicto de 1 a 3.
                  </div>
                </>
              )}
            </div>

            {/* Si el artista ya está en el sistema, el veredicto lee sus
                números en vez de pedirle a nadie que los recuerde. */}
            {proyectos.length > 0 && (
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-xs uppercase tracking-[0.08em]">
                  ¿Es un artista que ya está en el sistema?
                </span>
                <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="vin-input">
                  <option value="">No — es un caso nuevo</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* La búsqueda web es una OPCIÓN DEL ANÁLISIS, no un paso previo.
                Nadie quiere hacer una búsqueda: quiere un veredicto. Lo que la
                web diga entra como sustento de ese veredicto y se guarda con
                él. Viene marcada porque es lo más barato que sube el techo. */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={conWeb}
                onChange={(e) => setConWeb(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="vin-t-sm">Buscar también en la web al analizar</span>
                <span className="vin-faint vin-t-xs mt-0.5 block leading-relaxed">
                  Es la única fuente de un caso nuevo que no viene del interesado, y por eso vale un nivel entero de
                  evidencia. Si la búsqueda falla, el veredicto sale igual — sin ella y con el techo más bajo.
                </span>
              </span>
            </label>

            <EvidenciaDeEntradaPanel evidencia={evidencia} />

            <details className="rounded-xl" style={{ border: "1px solid var(--vin-border)" }}>
              <summary className="vin-muted cursor-pointer px-3 py-2 vin-t-sm">
                Qué data hace un análisis más completo
              </summary>
              <ul className="space-y-1.5 px-3 pb-3">
                {VINCERE_DATA_QUE_SIRVE.map((d, i) => (
                  <li key={i} className="vin-faint vin-t-sm leading-relaxed">
                    · {d}
                  </li>
                ))}
              </ul>
              <p className="vin-faint px-3 pb-3 vin-t-xs leading-relaxed">
                Pídela antes de decir que sí. Después del primer análisis, pedirla se ve como que no sabías.
              </p>
            </details>

            {error && (
              <p className="vin-t-sm leading-relaxed" style={{ maxWidth: "70ch", color: "var(--vin-risk)" }}>
                {error}
              </p>
            )}
            {/* Sin nombre o sin nada que leer no se puede emitir veredicto, y
                el botón lo dice en vez de fallar después. */}
            <button
              onClick={run}
              disabled={loading || !form.nombre.trim() || !evidencia.suficienteParaVeredicto}
              className="vin-btn-primary justify-self-start"
              style={
                loading || !form.nombre.trim() || !evidencia.suficienteParaVeredicto
                  ? { opacity: 0.45, cursor: "not-allowed" }
                  : undefined
              }
            >
              {fase === "buscando"
                ? "Buscando en la web…"
                : fase === "analizando"
                  ? "Leyendo el caso…"
                  : loading
                ? "Leyendo el caso…"
                : !form.nombre.trim()
                  ? "Falta el nombre"
                  : !evidencia.suficienteParaVeredicto
                    ? "Falta material que leer"
                    : "Analizar caso"}
            </button>
          </div>
        </Panel>

        {triageCasos.length > 0 && (
          <div className="space-y-3">
            {triageCasos.map((c) => (
              <div key={c.id} className="vin-accent-card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="vin-t-base font-medium">{c.nombre}</span>
                    {c.genero && <span className="vin-faint ml-2 vin-t-xs">{c.genero}</span>}
                    <span className="vin-faint ml-2 vin-t-xs">· {c.fase}</span>
                    {c.nivel != null && (
                      <span className="vin-faint ml-2 vin-t-xs">· nivel {c.nivel}</span>
                    )}
                  </div>
                  <button onClick={() => deleteTriageCaso(c.id)} className="vin-faint vin-t-xs hover:underline">
                    ✕
                  </button>
                </div>
                {c.veredicto ? (
                  <>
                    <div className="mb-2.5 flex flex-wrap items-center gap-2">
                      {c.prioridad && (
                        <span
                          className="rounded-full border px-2 py-0.5 vin-t-xs font-medium"
                          style={{ color: PRIORIDAD_COLOR[c.prioridad], borderColor: `${PRIORIDAD_COLOR[c.prioridad]}66` }}
                        >
                          Prioridad {c.prioridad}
                        </span>
                      )}
                      {c.motorRecomendado && (
                        <span className="vin-muted rounded-full px-2 py-0.5 vin-t-xs" style={{ background: "var(--vin-surface-2)" }}>
                          Entrada: {c.motorRecomendado}
                        </span>
                      )}
                      {c.nivel && <EvidenceTag nivel={c.nivel} />}
                    </div>
                    <p className="vin-t-sm leading-relaxed">{c.veredicto}</p>

                    {/* Lo que la web aportó, DENTRO del veredicto. Separarlo
                        dejaría el veredicto sin la mitad de su sustento cuando
                        se relea en un mes y nadie recuerde qué se consultó. */}
                    {c.web && (
                      <div
                        className="mt-3 rounded-xl p-3"
                        style={{ border: "1px solid var(--vin-border)", background: "var(--vin-surface-2)" }}
                      >
                        <div className="vin-faint vin-t-xs mb-1.5 uppercase tracking-[0.08em]">
                          Lo que dice la web · fuente externa
                        </div>
                        <p className="vin-t-sm leading-relaxed">{c.web.resumen}</p>
                        {c.web.hallazgos.length > 0 && (
                          <ul className="mt-1.5 space-y-1">
                            {c.web.hallazgos.slice(0, 4).map((h, i) => (
                              <li key={i} className="vin-muted vin-t-sm leading-relaxed">
                                · {h}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* El encuadre comercial: cómo entrar y qué cuesta en
                        tiempo. Es una propuesta para confirmar, no un acuerdo. */}
                    {(c.vinculoSugerido || c.comoCobrarlo || c.horasSemanalesEstimadas != null) && (
                      <div
                        className="mt-3 rounded-xl p-3"
                        style={{ background: "var(--vin-surface)", border: "1px solid var(--vin-border)" }}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="vin-faint vin-t-xs uppercase tracking-[0.08em]">Encuadre sugerido</span>
                          {c.vinculoSugerido && (
                            <span
                              className="rounded-full border px-2 py-0.5 vin-t-xs"
                              style={{ color: "var(--vin-muted)", borderColor: "var(--vin-border-strong)" }}
                            >
                              {VINCERE_VINCULO_LABEL[c.vinculoSugerido]}
                            </span>
                          )}
                          {c.horasSemanalesEstimadas != null && (
                            <span className="vin-faint vin-t-sm tabular-nums">
                              ~{c.horasSemanalesEstimadas}h/semana
                            </span>
                          )}
                        </div>
                        {c.comoCobrarlo && <p className="vin-muted vin-t-sm leading-relaxed">{c.comoCobrarlo}</p>}
                        <p className="vin-faint mt-2 vin-t-xs leading-relaxed">
                          Es una propuesta para que la confirmes, no un acuerdo. Al crear el proyecto, defínela en
                          Oportunidad → Tu vínculo.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="vin-muted vin-t-sm">Analizando…</p>
                )}
              </div>
            ))}
          </div>
        )}

        <QuestionBox log={qaLog} onAsk={ask} placeholder="¿Este caso encaja con lo que dirige VINCERE?…" />
      </div>
    </div>
  );
}

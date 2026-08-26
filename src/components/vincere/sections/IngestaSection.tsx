"use client";

import { useEffect, useRef, useState } from "react";
import {
  VincereIngestaPropuesta,
  VincereIngestaResultado,
  VincereProyecto,
  VINCERE_SECCION_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { useIaConfigurada } from "@/lib/vincere/useIaConfigurada";
import { fetchIngest } from "@/lib/vincere/ai-client";
import { leerArchivo } from "@/lib/vincere/archivo";
import { formatStreams, formatNumero, metaSignificativa, valorConUnidad } from "@/lib/vincere/format";
import {
  cambiosDeResumen,
  cambiosDeDiagnostico,
  resumirLista,
  tituloDelBloque,
  type Cambio,
} from "@/lib/vincere/cambios";
import { SectionHeader, Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";
import AlertasPanel, { SeveridadTag } from "../AlertasPanel";
import CasoNuevoForm from "../CasoNuevoForm";
import TriageCasoCard from "../TriageCasoCard";

type BloqueKey = keyof VincereIngestaPropuesta;

// A dónde va el material que se acaba de soltar. Es la pregunta que faltaba.
//
// Había dos pantallas que pedían un archivo —Cargar data y Triage— y ninguna
// decía en qué se diferenciaban. Quien tenía un PDF en la mano no tenía forma
// de saber cuál era la suya, así que probaba las dos. La diferencia real nunca
// fue de pantalla sino de destino: o el material alimenta a un artista que ya
// está dentro, o sirve para decidir si un artista entra. Preguntarlo una vez,
// acá, reemplaza las dos puertas por una.
type Destino = "proyecto" | "triage";

const BLOQUE_DESTINO: Record<BloqueKey, string> = {
  resumen: VINCERE_SECCION_LABEL.resumen,
  diagnostico: VINCERE_SECCION_LABEL.diagnostico,
  canciones: VINCERE_SECCION_LABEL.song,
  audiencia: VINCERE_SECCION_LABEL.audiencia,
  zonasCalor: VINCERE_SECCION_LABEL.calor,
  kpis: VINCERE_SECCION_LABEL.kpis,
};

export default function IngestaSection({ proyecto }: { proyecto: VincereProyecto | null }) {
  const proyectos = useVincereStore((s) => s.proyectos);
  const aplicarIngesta = useVincereStore((s) => s.aplicarIngesta);
  const addAlertas = useVincereStore((s) => s.addAlertas);
  const capturarSnapshot = useVincereStore((s) => s.capturarSnapshot);
  const selectProyecto = useVincereStore((s) => s.selectProyecto);
  const showToast = useVincereStore((s) => s.showToast);
  const triageCasos = useVincereStore((s) => s.triageCasos);

  // El material
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  // El destino. Sin proyectos cargados solo existe un camino posible, y
  // ofrecer el otro sería ofrecer un callejón.
  const [destino, setDestino] = useState<Destino>(proyectos.length ? "proyecto" : "triage");
  const [destinoId, setDestinoId] = useState<string>(proyecto?.id ?? proyectos[0]?.id ?? "");

  // El selector de proyecto de la cabecera está a la vista y es la forma
  // obvia de cambiar de artista. Si no se siguiera desde acá, la cabecera
  // diría LUNA REBEL mientras el material se cargaría a SETTE — y eso se
  // descubre después de aprobar, que es tarde. Se ajusta durante el render y
  // no en un efecto: es un cambio derivado de una prop, no una sincronización
  // con nada externo.
  const [ultimoGlobal, setUltimoGlobal] = useState(proyecto?.id ?? "");
  if (proyecto && proyecto.id !== ultimoGlobal) {
    setUltimoGlobal(proyecto.id);
    setDestinoId(proyecto.id);
  }

  const destinoProyecto = proyectos.find((p) => p.id === destinoId) ?? proyecto ?? null;

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La propuesta vive en el store y no acá: salir de la pantalla borraba una
  // lectura que costó una llamada a la API. Ahora sobrevive a navegar y a
  // recargar, hasta que se aplique o se descarte a propósito.
  const pendiente = useVincereStore((s) => (destinoProyecto ? s.ingestaPendiente[destinoProyecto.id] ?? null : null));
  const guardarPendiente = useVincereStore((s) => s.guardarIngestaPendiente);
  const descartarPendiente = useVincereStore((s) => s.descartarIngestaPendiente);
  // Se guarda lo RECHAZADO, no lo aceptado.
  //
  // Al revés era un bug callado. La lectura pendiente vive en el store para
  // sobrevivir a navegar y a recargar; la lista de marcados vivía solo en el
  // componente. Así que al volver a la pantalla la lectura seguía ahí pero con
  // todo desmarcado y el botón decía «Aplicar solo alertas»: se conservaba la
  // llamada que costó plata y se perdía en silencio lo que había traído.
  //
  // Invertirlo lo arregla sin efectos ni sincronización: la lista vacía —que es
  // como arranca siempre— significa «todo entra», que además es la intención
  // por defecto. Desmarcar es la excepción.
  const [rechazados, setRechazados] = useState<Record<string, boolean>>({});
  const [aplicado, setAplicado] = useState<{ bloques: number } | null>(null);
  const [casoNuevoId, setCasoNuevoId] = useState<string | null>(null);
  const ia = useIaConfigurada();
  const sinLlave = ia !== null && !ia.configurada;
  const inputRef = useRef<HTMLInputElement>(null);
  // El paso 3 puede estar bloqueado por un hueco del paso 1, y en una pantalla
  // de tres bloques eso queda fuera de la vista. La referencia es para poder
  // llevar el ojo hasta allá en vez de solo nombrarlo.
  const zonaMaterialRef = useRef<HTMLDivElement>(null);

  const casoNuevo = triageCasos.find((c) => c.id === casoNuevoId) ?? null;
  const hayMaterial = !!archivo || texto.trim().length > 0;
  // Para un caso nuevo, lo pegado ES la descripción del caso: no hay razón
  // para pedir dos veces la misma prosa en la misma pantalla.
  const descripcionDelCaso = [texto.trim(), nota.trim()].filter(Boolean).join("\n\n");

  function limpiarMaterial() {
    setArchivo(null);
    setTexto("");
    setNota("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function leer() {
    if (cargando || !hayMaterial || !destinoProyecto) return;
    setCargando(true);
    setError(null);
    setAplicado(null);
    setRechazados({});
    descartarPendiente(destinoProyecto.id);
    try {
      const payload: Parameters<typeof fetchIngest>[0] = {
        artista: {
          nombre: destinoProyecto.nombre,
          genero: destinoProyecto.genero,
          fase: destinoProyecto.fase,
          cancionesConocidas: destinoProyecto.canciones.map((c) => c.nombre),
          ciudadesConocidas: destinoProyecto.zonasCalor.map((z) => z.ciudad),
        },
        nota,
        texto,
      };
      if (archivo) {
        const { data, mediaType } = await leerArchivo(archivo);
        payload.data = data;
        payload.mediaType = mediaType;
      }
      const r = await fetchIngest(payload);
      guardarPendiente(destinoProyecto.id, r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el material");
    } finally {
      setCargando(false);
    }
  }

  function aplicar() {
    const resultado = pendiente;
    if (!resultado || !destinoProyecto) return;
    const filtrada: VincereIngestaPropuesta = {};
    (Object.keys(resultado.propuesta) as BloqueKey[]).forEach((k) => {
      if (!rechazados[k] && resultado.propuesta[k]) {
        // El tipo por clave ya coincide con el de la propuesta; el filtrado
        // solo decide qué bloques pasan.
        (filtrada as Record<string, unknown>)[k] = resultado.propuesta[k];
      }
    });

    const bloques = Object.keys(filtrada).length;
    if (bloques > 0) {
      aplicarIngesta(destinoProyecto.id, filtrada);
      // Entrada de data nueva es el momento natural de dejar constancia:
      // así el histórico se construye solo, sin que haya que acordarse.
      capturarSnapshot(destinoProyecto.id, resultado.fuente);
    }
    if (resultado.alertas.length) {
      addAlertas(
        destinoProyecto.id,
        resultado.alertas.map((a) => ({ ...a, origen: resultado.fuente }))
      );
    }

    // El material se cargó a este proyecto: es el que hay que estar mirando
    // cuando la pantalla siguiente diga "corre los motores".
    selectProyecto(destinoProyecto.id);
    showToast(
      bloques > 0
        ? `Data aplicada a ${bloques} ${bloques === 1 ? "motor" : "motores"}${resultado.alertas.length ? ` · ${resultado.alertas.length} alerta(s)` : ""}`
        : "No se aplicó ningún motor"
    );

    descartarPendiente(destinoProyecto.id);
    limpiarMaterial();
    setRechazados({});
    setAplicado({ bloques });
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Paso 1"
        title="Cargar data"
        subtitle="Todo entra por acá. Suelta una captura, un PDF o pega el texto, y decide a dónde va: a un artista que ya está dentro, o a Triage para decidir si entra. Nada se escribe sin que lo apruebes."
      />

      <div className="space-y-5">
        {/* Arriba de todo y antes de cargar nada. Sin llave el sistema no está
            roto —los indicadores se calculan igual— pero esta pantalla no
            puede funcionar, y decirlo antes ahorra subir un archivo para nada. */}
        {sinLlave && (
          <div
            className="rounded-xl px-5 py-4"
            style={{
              color: "var(--vin-warn)",
              background: "var(--vin-warn-wash)",
              border: "1px solid var(--vin-warn-line)",
            }}
          >
            <div className="vin-t-base font-medium">La IA no está configurada en este despliegue</div>
            <p className="vin-t-sm mt-1.5 leading-relaxed" style={{ maxWidth: "72ch" }}>
              Falta la variable <code>ANTHROPIC_API_KEY</code>. Sin ella esta pantalla no puede leer archivos y
              tampoco se pueden generar las lecturas. Todo lo que el sistema <em>calcula</em> —cuello de botella, fan
              rate, concentración del catálogo, plazas, presupuesto— sigue funcionando: eso no pasa por la IA. La data
              se puede cargar a mano mientras tanto, en «Editar data» dentro de Resumen.
            </p>
            {/* Dónde corre y dónde se toca. Sin esto, el mismo aviso en local y
                en producción manda a arreglar en el lugar equivocado. */}
            <p className="vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "72ch", opacity: 0.85 }}>
              {ia.comoSeArregla}
            </p>
          </div>
        )}

        {pendiente && destinoProyecto ? (
          <Revision
            resultado={pendiente}
            proyecto={destinoProyecto}
            rechazados={rechazados}
            onToggle={(k) => setRechazados((r) => ({ ...r, [k]: !r[k] }))}
            onAplicar={aplicar}
            onDescartar={() => {
              descartarPendiente(destinoProyecto.id);
              setRechazados({});
            }}
          />
        ) : casoNuevo ? (
          <CasoAnalizado caso={casoNuevo} onOtro={() => setCasoNuevoId(null)} />
        ) : aplicado ? (
          <DataAplicada
            bloques={aplicado.bloques}
            proyecto={destinoProyecto}
            onOtro={() => setAplicado(null)}
          />
        ) : (
          <>
            {/* ── Paso A: el material ───────────────────────────────────── */}
            <Bloque numero={1} titulo="El material" innerRef={zonaMaterialRef}>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setArchivo(f);
                }}
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-xl p-8 text-center transition-colors"
                style={{
                  border: `1px dashed ${arrastrando ? "var(--vin-accent)" : "var(--vin-border-strong)"}`,
                  background: arrastrando ? "var(--vin-accent-soft)" : "var(--vin-surface-2)",
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
                {archivo ? (
                  <>
                    <p className="vin-t-base font-medium">{archivo.name}</p>
                    <p className="vin-faint mt-1 vin-t-sm">
                      {(archivo.size / 1024).toFixed(0)} KB · haz clic para cambiarlo
                    </p>
                  </>
                ) : (
                  <>
                    <p className="vin-t-base">Suelta aquí una captura o un PDF, o haz clic para elegirlo</p>
                    <p className="vin-faint mt-1.5 vin-t-sm leading-relaxed">
                      Capturas de Spotify for Artists, Instagram, YouTube Studio · PDF de informes, dossiers o
                      contratos
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4">
                <PanelLabel>
                  {destino === "triage" ? "O cuéntalo con tus palabras" : "O pega el texto"}
                </PanelLabel>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                  placeholder={
                    destino === "triage"
                      ? "Quién te lo presentó, qué pide, qué has visto de él, por qué te llamó la atención…"
                      : "Pega aquí una exportación CSV, una tabla, notas de una reunión o cualquier texto con data…"
                  }
                  className="vin-input mb-3.5"
                  style={{ resize: "vertical", lineHeight: "1.6" }}
                />
                <PanelLabel>Nota para la lectura (opcional)</PanelLabel>
                <input
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej. «esto es del último trimestre», «solo mira los países»"
                  className="vin-input"
                />
              </div>

              {hayMaterial && (
                <button onClick={limpiarMaterial} className="vin-faint mt-3 vin-t-sm hover:underline">
                  Limpiar el material
                </button>
              )}
            </Bloque>

            {/* ── Paso B: a dónde va ────────────────────────────────────── */}
            <Bloque numero={2} titulo="A dónde va">
              <div className="grid gap-2.5 md:grid-cols-2">
                <OpcionDestino
                  activa={destino === "proyecto"}
                  deshabilitada={proyectos.length === 0}
                  titulo="A un artista que ya está dentro"
                  detalle="Los números se reparten a sus motores y quedan comparados contra lo que ya había."
                  onClick={() => proyectos.length > 0 && setDestino("proyecto")}
                />
                <OpcionDestino
                  activa={destino === "triage"}
                  titulo="A Triage, como caso nuevo"
                  detalle="Todavía no hay proyecto: lo que se pide es un veredicto de si vale la pena entrar."
                  onClick={() => setDestino("triage")}
                />
              </div>

              {destino === "proyecto" &&
                (proyectos.length === 0 ? (
                  <p className="vin-muted mt-4 vin-t-sm leading-relaxed">
                    No hay ningún proyecto todavía. Manda el material a Triage y, si el veredicto dice que sí, desde
                    ahí se le abre proyecto.
                  </p>
                ) : (
                  <div className="mt-4">
                    <PanelLabel>Proyecto</PanelLabel>
                    <select
                      value={destinoId}
                      onChange={(e) => {
                        setDestinoId(e.target.value);
                        // Elegir destino ES cambiar de artista: si no moviera
                        // también el selector de la cabecera habría dos
                        // verdades sobre a quién se le está cargando data, y
                        // «Correr los motores» llevaría al proyecto de al lado.
                        selectProyecto(e.target.value);
                        // Lo desmarcado pertenecía a la lectura del proyecto
                        // anterior; arrastrarlo al siguiente descartaría
                        // bloques que nadie miró.
                        setRechazados({});
                      }}
                      className="vin-input"
                    >
                      {proyectos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                          {p.tipo === "competencia" ? " · competencia" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

              {destino === "triage" && (
                <div className="mt-5">
                  <CasoNuevoForm
                    archivo={archivo}
                    descripcion={descripcionDelCaso}
                    onListo={(id) => {
                      setCasoNuevoId(id);
                      limpiarMaterial();
                    }}
                  />
                </div>
              )}
            </Bloque>

            {/* ── Paso C: leer ──────────────────────────────────────────── */}
            {destino === "proyecto" && destinoProyecto && (
              <Bloque numero={3} titulo="Leer el material">
                <p className="vin-muted mb-4 vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
                  La IA lo lee y propone qué escribir en {destinoProyecto.nombre}. Vas a ver cada número contra el que
                  reemplaza antes de aprobar nada.
                </p>

                {/* El botón dice lo que HACE, siempre.
                    Antes se convertía en «Falta el material», que es un parte
                    de estado disfrazado de botón: no dice qué falta, ni dónde,
                    ni qué hacer — y aparece en el paso 3 cuando el hueco está
                    en el paso 1, dos pantallazos más arriba. */}
                {!hayMaterial && (
                  <div
                    className="mb-4 rounded-xl px-4 py-3.5"
                    style={{ background: "var(--vin-warn-wash)", border: "1px solid var(--vin-warn-line)" }}
                  >
                    <p className="vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
                      Todavía no has soltado ningún archivo ni pegado texto. Eso va arriba, en el paso 1.
                    </p>
                    <button
                      onClick={() => zonaMaterialRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                      className="mt-2 vin-t-sm hover:underline"
                      style={{ color: "var(--vin-accent)", textUnderlineOffset: "3px" }}
                    >
                      Ir al paso 1 ↑
                    </button>
                  </div>
                )}

                <button onClick={leer} disabled={cargando || !hayMaterial} className="vin-btn-primary">
                  {cargando ? "Leyendo el material…" : `Leer y extraer para ${destinoProyecto.nombre}`}
                </button>

                {/* Un fallo acá es el final del camino para quien viene a
                    cargar data: si no se lee, no pasa nada más. Estaba en letra
                    diminuta y debajo del pliegue, así que el sistema se veía
                    mudo en vez de roto — que es peor, porque no da qué hacer. */}
                {error && (
                  <div
                    className="mt-4 rounded-xl px-4 py-3.5"
                    style={{
                      color: "var(--vin-risk)",
                      background: "var(--vin-risk-wash)",
                      border: "1px solid var(--vin-risk-line)",
                    }}
                  >
                    <div className="vin-t-sm font-medium">No se pudo leer el material</div>
                    <p className="vin-t-sm mt-1 leading-relaxed" style={{ maxWidth: "70ch" }}>
                      {error}
                    </p>
                  </div>
                )}
              </Bloque>
            )}

            {/* Lo que quedó pendiente de mirar en el proyecto de destino. Va
                al final: es contexto, no el trabajo de esta pantalla. */}
            {destino === "proyecto" && destinoProyecto && <AlertasPanel proyecto={destinoProyecto} />}
          </>
        )}
      </div>
    </div>
  );
}

// Un paso del flujo, numerado.
//
// El número no es decorativo: esta pantalla hace tres cosas en orden y antes
// se veían como tres cajas sueltas del mismo peso, así que no había forma de
// saber que la de abajo dependía de la de arriba.
function Bloque({
  numero,
  titulo,
  children,
  innerRef,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section ref={innerRef} className="vin-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full vin-t-xs font-medium tabular-nums"
          style={{ background: "var(--vin-accent-soft)", color: "var(--vin-accent)" }}
        >
          {numero}
        </span>
        <h2 className="vin-t-lg font-medium">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function OpcionDestino({
  activa,
  deshabilitada = false,
  titulo,
  detalle,
  onClick,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  titulo: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={deshabilitada}
      className="rounded-xl p-4 text-left transition-colors"
      style={{
        border: `1px solid ${activa ? "var(--vin-accent-glow)" : "var(--vin-border-strong)"}`,
        background: activa ? "var(--vin-accent-soft)" : "var(--vin-surface-2)",
        opacity: deshabilitada ? 0.4 : 1,
        cursor: deshabilitada ? "not-allowed" : "pointer",
      }}
    >
      <span className="flex items-start gap-2.5">
        <span
          className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
          style={{ border: `1px solid ${activa ? "var(--vin-accent)" : "var(--vin-border-strong)"}` }}
        >
          {activa && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />}
        </span>
        <span>
          <span className="vin-t-base block font-medium">{titulo}</span>
          <span className="vin-muted vin-t-sm mt-1 block leading-relaxed">{detalle}</span>
        </span>
      </span>
    </button>
  );
}

// La confirmación de que algo pasó, donde estaba el botón que se apretó.
//
// Vivía arriba de la pantalla mientras el botón «Aplicar N motores» estaba
// abajo del todo. Eduardo hizo clic, no se movió nada en su campo de visión, y
// concluyó —con razón— que no había funcionado. Ahora aparece en el sitio del
// botón y se trae a la vista.
function DataAplicada({
  bloques,
  proyecto,
  onOtro,
}: {
  bloques: number;
  proyecto: VincereProyecto | null;
  onOtro: () => void;
}) {
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-xl p-6"
      style={{ background: "var(--vin-ok-wash)", border: "1px solid var(--vin-ok-line)" }}
    >
      <div className="vin-t-lg font-medium" style={{ color: "var(--vin-ok)" }}>
        {bloques > 0
          ? `Data aplicada a ${bloques} ${bloques === 1 ? "motor" : "motores"}${proyecto ? ` de ${proyecto.nombre}` : ""}`
          : "Se guardaron las alertas, sin cambiar ningún motor"}
      </div>
      <p className="vin-muted mb-5 mt-2 vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
        {bloques > 0
          ? "Ya está repartida por sus motores, pero todavía nadie la ha interpretado. El paso siguiente es correr los motores que quedaron con data."
          : "No había nada marcado para escribir. El material sigue disponible para volver a leerlo."}
      </p>
      <div className="flex flex-wrap gap-3">
        {bloques > 0 && (
          <button onClick={() => setSeccion("resumen")} className="vin-btn-primary">
            Correr los motores →
          </button>
        )}
        <button onClick={onOtro} className="vin-btn-ghost">
          Cargar más material
        </button>
      </div>
    </div>
  );
}

// El veredicto recién emitido, en la misma pantalla donde se pidió.
function CasoAnalizado({
  caso,
  onOtro,
}: {
  caso: Parameters<typeof TriageCasoCard>[0]["caso"];
  onOtro: () => void;
}) {
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const decidirTriageCaso = useVincereStore((s) => s.decidirTriageCaso);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div ref={ref} className="space-y-4">
      {/* Las mismas tres salidas que en el expediente: decidir en caliente,
          recién leído el veredicto, es cuando más barato sale hacerlo. Abrir
          proyecto se hace desde Triage, que es donde vive el caso. */}
      <TriageCasoCard
        caso={caso}
        onEntrar={() => {
          decidirTriageCaso(caso.id, "entramos");
          setSeccion("triage");
        }}
        onDecidir={(d) => decidirTriageCaso(caso.id, d)}
      />
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setSeccion("triage")} className="vin-btn-ghost">
          Ver todos los casos →
        </button>
        <button onClick={onOtro} className="vin-btn-ghost">
          Cargar otro caso
        </button>
      </div>
    </div>
  );
}

function Revision({
  resultado,
  proyecto,
  rechazados,
  onToggle,
  onAplicar,
  onDescartar,
}: {
  resultado: VincereIngestaResultado;
  proyecto: VincereProyecto;
  rechazados: Record<string, boolean>;
  onToggle: (k: BloqueKey) => void;
  onAplicar: () => void;
  onDescartar: () => void;
}) {
  const bloques = (Object.keys(resultado.propuesta) as BloqueKey[]).filter((k) => resultado.propuesta[k]);
  const seleccionados = bloques.filter((k) => !rechazados[k]).length;

  return (
    <>
      <div className="vin-accent-card p-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
            <span className="vin-eyebrow">Lectura del material · {proyecto.nombre}</span>
          </div>
          <EvidenceTag nivel={resultado.confianza} />
        </div>
        <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "68ch" }}>
          {resultado.lectura}
        </p>
        <p className="vin-faint vin-t-sm mt-2.5">{resultado.fuente}</p>
      </div>

      {bloques.length === 0 ? (
        <Panel>
          <p className="vin-muted vin-t-base leading-relaxed">
            No se pudo extraer data estructurada de este material. Revisa lo que quedó anotado abajo, o cárgalo a mano
            en la sección correspondiente.
          </p>
        </Panel>
      ) : (
        <div className="space-y-2.5">
          {bloques.map((k) => (
            <BloquePropuesto
              key={k}
              clave={k}
              propuesta={resultado.propuesta}
              proyecto={proyecto}
              aceptado={!rechazados[k]}
              onToggle={() => onToggle(k)}
            />
          ))}
        </div>
      )}

      {resultado.alertas.length > 0 && (
        <Panel>
          <PanelLabel>Alertas que levantó ({resultado.alertas.length})</PanelLabel>
          <ul className="space-y-3.5">
            {resultado.alertas.map((a, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <p className="vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
                  {a.texto}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <SeveridadTag severidad={a.severidad} />
                  <EvidenceTag nivel={a.nivel} />
                  {a.seccion && <span className="vin-faint vin-t-sm">{VINCERE_SECCION_LABEL[a.seccion]}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="vin-faint mt-3.5 vin-t-sm">Se guardan al aplicar, y quedan visibles hasta que las descartes.</p>
        </Panel>
      )}

      {resultado.faltante.length > 0 && (
        <Panel>
          <PanelLabel>Lo que no se pudo leer</PanelLabel>
          <ul className="space-y-1.5">
            {resultado.faltante.map((f, i) => (
              <li key={i} className="vin-muted flex gap-2 vin-t-base leading-relaxed">
                <span style={{ color: "var(--vin-accent)" }}>—</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="vin-faint mt-3.5 vin-t-sm">Complétalo a mano en su sección después de aplicar.</p>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onAplicar} className="vin-btn-primary">
          Aplicar {seleccionados > 0 ? `${seleccionados} ${seleccionados === 1 ? "motor" : "motores"}` : "solo alertas"}
        </button>
        <button onClick={onDescartar} className="vin-btn-ghost">
          Descartar lectura
        </button>
      </div>
    </>
  );
}

function BloquePropuesto({
  clave,
  propuesta,
  proyecto,
  aceptado,
  onToggle,
}: {
  clave: BloqueKey;
  propuesta: VincereIngestaPropuesta;
  proyecto: VincereProyecto;
  aceptado: boolean;
  onToggle: () => void;
}) {
  // Para las listas, cuántas de esas entradas ya existían. "12 canciones" es
  // otra cosa muy distinta si cinco de ellas ya están en el catálogo: no está
  // agregando doce, está reescribiendo cinco y agregando siete.
  const subtitulo = (() => {
    if (clave === "canciones" && propuesta.canciones) {
      return tituloDelBloque("canciones", resumirLista(propuesta.canciones, proyecto.canciones ?? []));
    }
    if (clave === "zonasCalor" && propuesta.zonasCalor) {
      return tituloDelBloque("zonasCalor", resumirLista(propuesta.zonasCalor, proyecto.zonasCalor ?? []));
    }
    if (clave === "kpis" && propuesta.kpis) {
      return tituloDelBloque("kpis", resumirLista(propuesta.kpis, proyecto.kpis ?? []));
    }
    return null;
  })();

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: `1px solid ${aceptado ? "var(--vin-accent-glow)" : "var(--vin-border)"}`,
        background: aceptado ? "var(--vin-accent-soft)" : "var(--vin-surface)",
      }}
    >
      <label className="flex cursor-pointer flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={onToggle}
          style={{ accentColor: "var(--vin-accent)" }}
        />
        <span className="vin-t-base font-medium">{BLOQUE_DESTINO[clave]}</span>
        {subtitulo && <span className="vin-faint vin-t-sm">· {subtitulo}</span>}
      </label>
      <div className="mt-3.5 md:pl-7">
        <DetalleBloque clave={clave} propuesta={propuesta} proyecto={proyecto} />
      </div>
    </div>
  );
}

// Una fila de dato: nombre a la izquierda en gris, cifra a la derecha en el
// color del texto y con separadores de miles.
//
// Lo que había era todo del mismo gris y del mismo tamaño, en una sola línea
// corrida, con las cifras sin agrupar: "Chartmetric Artist Rank 795444 de
// 795444". Ahí no hay nada que guíe al ojo, y por eso la pantalla se lee como
// un volcado y no como información.
function Dato({ nombre, valor, detalle }: { nombre: string; valor: string; detalle?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
      <span className="vin-muted vin-t-sm">{nombre}</span>
      <span className="flex items-baseline gap-2">
        <span className="vin-t-base tabular-nums">{valor}</span>
        {detalle && <span className="vin-faint vin-t-sm tabular-nums">{detalle}</span>}
      </span>
    </div>
  );
}

function ListaDeDatos({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ borderTop: "1px solid var(--vin-border)" }}>
      {children}
    </div>
  );
}

function DetalleBloque({
  clave,
  propuesta,
  proyecto,
}: {
  clave: BloqueKey;
  propuesta: VincereIngestaPropuesta;
  proyecto: VincereProyecto;
}) {
  // Los dos bloques que PISAN valores existentes muestran contra qué. Antes
  // solo se veía el valor propuesto, así que se aprobaba a ciegas: un número
  // mal leído de una tabla no se delataba hasta tres pantallas después.
  if (clave === "resumen" && propuesta.resumen) {
    return <TablaDeCambios cambios={cambiosDeResumen(proyecto, propuesta.resumen)} />;
  }

  if (clave === "diagnostico" && propuesta.diagnostico) {
    return <TablaDeCambios cambios={cambiosDeDiagnostico(proyecto, propuesta.diagnostico)} />;
  }

  if (clave === "canciones" && propuesta.canciones) {
    return (
      <ListaDeDatos>
        {propuesta.canciones.map((c, i) => (
          <Dato
            key={i}
            nombre={c.nombre}
            valor={formatStreams(c.streams)}
            detalle={
              [
                c.retencionPct ? `ret. ${c.retencionPct}%` : null,
                c.skipPct ? `skip ${c.skipPct}%` : null,
                c.playlistAdds ? `${formatNumero(c.playlistAdds)} adds` : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
            }
          />
        ))}
      </ListaDeDatos>
    );
  }

  if (clave === "audiencia" && propuesta.audiencia) {
    const grupos: [string, { label: string; pct: number }[] | undefined][] = [
      ["Edad", propuesta.audiencia.edad],
      ["Plataformas", propuesta.audiencia.plataformas],
      ["Países", propuesta.audiencia.paises],
    ];
    return (
      <div className="space-y-3.5">
        {grupos
          .filter(([, v]) => v?.length)
          .map(([nombre, v]) => (
            <div key={nombre}>
              <div className="vin-faint vin-t-sm mb-1">{nombre}</div>
              <ListaDeDatos>
                {v!.map((s) => (
                  <Dato key={s.label} nombre={s.label} valor={`${s.pct}%`} />
                ))}
              </ListaDeDatos>
            </div>
          ))}
      </div>
    );
  }

  if (clave === "zonasCalor" && propuesta.zonasCalor) {
    return (
      <ListaDeDatos>
        {propuesta.zonasCalor.map((z) => (
          <Dato key={z.ciudad} nombre={z.ciudad} valor={String(z.calor)} />
        ))}
      </ListaDeDatos>
    );
  }

  if (clave === "kpis" && propuesta.kpis) {
    return (
      <ListaDeDatos>
        {propuesta.kpis.map((k, i) => (
          <Dato
            key={i}
            nombre={k.label}
            valor={valorConUnidad(k.actual, k.unidad)}
            // Una meta igual al valor actual —o en cero— no es una meta: es un
            // hueco que el lector rellenó copiando la cifra. Mostrarla como
            // "795.444 de 795.444" hace que todos los indicadores se vean
            // cumplidos y que ninguno diga nada.
            detalle={metaSignificativa(k.actual, k.meta) ? `meta ${valorConUnidad(k.meta, k.unidad)}` : null}
          />
        ))}
      </ListaDeDatos>
    );
  }

  return null;
}

// Antes → después, con la variación.
//
// Es lo que separa aprobar de aprobar a ciegas. Un número mal leído de una
// tabla se delata solo cuando se ve al lado del que reemplaza: "3,10M" no dice
// nada, pero "2.43M → 3.10M · +27,6%" hace saltar el error sin buscarlo.
//
// Los tres casos se ven distintos a propósito. Un dato nuevo no es un
// reemplazo —no hay nada que perder al aceptarlo—, y un valor idéntico no es
// un cambio: mostrarlos iguales obliga a leer los tres con la misma atención.
function TablaDeCambios({ cambios }: { cambios: Cambio[] }) {
  if (!cambios.length) return null;
  return (
    <div className="flex flex-col" style={{ borderTop: "1px solid var(--vin-border)" }}>
      {cambios.map((c) => (
        <div key={c.campo} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
          <span className="vin-muted vin-t-sm">{c.campo}</span>

          {c.tipo === "nuevo" ? (
            <span className="flex items-baseline gap-2">
              <span className="vin-t-base tabular-nums">{c.despues}</span>
              <span className="vin-faint vin-t-sm">dato nuevo</span>
            </span>
          ) : c.tipo === "igual" ? (
            <span className="flex items-baseline gap-2">
              <span className="vin-faint vin-t-base tabular-nums">{c.despues}</span>
              <span className="vin-faint vin-t-sm">sin cambio</span>
            </span>
          ) : (
            <span className="flex items-baseline gap-2">
              <span className="vin-faint vin-t-sm tabular-nums" style={{ textDecoration: "line-through" }}>
                {c.antes}
              </span>
              <span className="vin-faint vin-t-sm">→</span>
              <span className="vin-t-base tabular-nums">{c.despues}</span>
              {c.variacionPct != null && (
                <span
                  className="vin-t-sm tabular-nums"
                  style={{ color: c.variacionPct >= 0 ? "var(--vin-ok)" : "var(--vin-risk)" }}
                >
                  {c.variacionPct >= 0 ? "+" : ""}
                  {c.variacionPct}%
                </span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

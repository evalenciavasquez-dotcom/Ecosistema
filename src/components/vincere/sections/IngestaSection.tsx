"use client";

import { useRef, useState } from "react";
import {
  VincereIngestaPropuesta,
  VincereIngestaResultado,
  VincereProyecto,
  VINCERE_SECCION_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { useIaConfigurada } from "@/lib/vincere/useIaConfigurada";
import { fetchIngest } from "@/lib/vincere/ai-client";
import { formatStreams } from "@/lib/vincere/format";
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

type BloqueKey = keyof VincereIngestaPropuesta;

const BLOQUE_DESTINO: Record<BloqueKey, string> = {
  resumen: VINCERE_SECCION_LABEL.resumen,
  diagnostico: VINCERE_SECCION_LABEL.diagnostico,
  canciones: VINCERE_SECCION_LABEL.song,
  audiencia: VINCERE_SECCION_LABEL.audiencia,
  zonasCalor: VINCERE_SECCION_LABEL.calor,
  kpis: VINCERE_SECCION_LABEL.kpis,
};

// Las etiquetas de resumen y diagnóstico se fueron a cambios.ts, junto con la
// comparación contra lo que ya hay: tenerlas acá dejaba dos listas de nombres
// que había que acordarse de mantener iguales.

function leerArchivo(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      resolve({ data: base64, mediaType: file.type });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function IngestaSection({ proyecto }: { proyecto: VincereProyecto }) {
  const aplicarIngesta = useVincereStore((s) => s.aplicarIngesta);
  const addAlertas = useVincereStore((s) => s.addAlertas);
  const capturarSnapshot = useVincereStore((s) => s.capturarSnapshot);
  const showToast = useVincereStore((s) => s.showToast);

  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La propuesta vive en el store y no acá: salir de la pantalla borraba una
  // lectura que costó una llamada a la API. Ahora sobrevive a navegar y a
  // recargar, hasta que se aplique o se descarte a propósito.
  const pendiente = useVincereStore((s) => s.ingestaPendiente[proyecto.id] ?? null);
  const guardarPendiente = useVincereStore((s) => s.guardarIngestaPendiente);
  const descartarPendiente = useVincereStore((s) => s.descartarIngestaPendiente);
  const [aceptados, setAceptados] = useState<Record<string, boolean>>({});
  const [acabaDeAplicar, setAcabaDeAplicar] = useState(false);
  const ia = useIaConfigurada();
  const sinLlave = ia !== null && !ia.configurada;
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const inputRef = useRef<HTMLInputElement>(null);

  const contexto = {
    nombre: proyecto.nombre,
    genero: proyecto.genero,
    fase: proyecto.fase,
    cancionesConocidas: proyecto.canciones.map((c) => c.nombre),
    ciudadesConocidas: proyecto.zonasCalor.map((z) => z.ciudad),
  };

  async function leer() {
    if (cargando || (!archivo && !texto.trim())) return;
    setCargando(true);
    setError(null);
    descartarPendiente(proyecto.id);
    try {
      const payload: Parameters<typeof fetchIngest>[0] = { artista: contexto, nota, texto };
      if (archivo) {
        const { data, mediaType } = await leerArchivo(archivo);
        payload.data = data;
        payload.mediaType = mediaType;
      }
      const r = await fetchIngest(payload);
      guardarPendiente(proyecto.id, r);
      // Todo lo que trajo llega marcado para aplicar; se desmarca lo que no sirva.
      const marcados: Record<string, boolean> = {};
      (Object.keys(r.propuesta) as BloqueKey[]).forEach((k) => {
        if (r.propuesta[k]) marcados[k] = true;
      });
      setAceptados(marcados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el material");
    } finally {
      setCargando(false);
    }
  }

  function aplicar() {
    const resultado = pendiente;
    if (!resultado) return;
    const filtrada: VincereIngestaPropuesta = {};
    (Object.keys(resultado.propuesta) as BloqueKey[]).forEach((k) => {
      if (aceptados[k] && resultado.propuesta[k]) {
        // El tipo por clave ya coincide con el de la propuesta; el filtrado
        // solo decide qué bloques pasan.
        (filtrada as Record<string, unknown>)[k] = resultado.propuesta[k];
      }
    });

    const bloques = Object.keys(filtrada).length;
    if (bloques > 0) {
      aplicarIngesta(proyecto.id, filtrada);
      // Entrada de data nueva es el momento natural de dejar constancia:
      // así el histórico se construye solo, sin que haya que acordarse.
      capturarSnapshot(proyecto.id, resultado.fuente);
    }
    if (resultado.alertas.length) {
      addAlertas(
        proyecto.id,
        resultado.alertas.map((a) => ({ ...a, origen: resultado.fuente }))
      );
    }

    showToast(
      bloques > 0
        ? `Data aplicada a ${bloques} ${bloques === 1 ? "motor" : "motores"}${resultado.alertas.length ? ` · ${resultado.alertas.length} alerta(s)` : ""}`
        : "No se aplicó ningún motor"
    );

    descartarPendiente(proyecto.id);
    setArchivo(null);
    setTexto("");
    setNota("");
    if (inputRef.current) inputRef.current.value = "";
    // Cargar y no interpretar deja la data muerta. El paso siguiente se ofrece
    // aquí porque es el momento en que tiene sentido, no en un menú.
    if (bloques > 0) setAcabaDeAplicar(true);
  }

  const hayMaterial = !!archivo || texto.trim().length > 0;

  return (
    <div>
      <SectionHeader
        eyebrow="Cargar data"
        title="Ingesta"
        subtitle="Suelta una captura, un PDF o pega el texto. La IA lo lee, reparte los números al motor que les corresponde y marca lo que merece atención. Nada se escribe sin que lo apruebes."
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
              background: "rgba(229,169,60,0.09)",
              border: "1px solid rgba(229,169,60,0.28)",
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

        <AlertasPanel proyecto={proyecto} />

        {/* Cargar sin interpretar deja la data muerta. El siguiente paso se
            ofrece justo después de aplicar, que es cuando tiene sentido. */}
        {acabaDeAplicar && !pendiente && (
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(92,201,142,0.06)", border: "1px solid rgba(92,201,142,0.3)" }}
          >
            <PanelLabel>
              <span style={{ color: "#5cc98e" }}>Data aplicada</span>
            </PanelLabel>
            <p className="vin-muted mb-3 vin-t-base leading-relaxed">
              Ya está repartida por sus motores, pero todavía nadie la ha interpretado. El siguiente paso es correr los
              motores que quedaron con data.
            </p>
            <button
              onClick={() => {
                setAcabaDeAplicar(false);
                setSeccion("resumen");
              }}
              className="vin-btn-primary"
            >
              Correr los motores →
            </button>
          </div>
        )}

        {!pendiente && (
          <>
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
                background: arrastrando ? "rgba(224,72,58,0.06)" : "var(--vin-surface)",
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
                  <p className="vin-t-sm">{archivo.name}</p>
                  <p className="vin-faint mt-1 vin-t-xs">
                    {(archivo.size / 1024).toFixed(0)} KB · haz clic para cambiarlo
                  </p>
                </>
              ) : (
                <>
                  <p className="vin-t-sm">Suelta aquí una captura o un PDF, o haz clic para elegirlo</p>
                  <p className="vin-faint mt-1.5 vin-t-xs leading-relaxed">
                    Capturas de Spotify for Artists, Instagram, YouTube Studio · PDF de informes o contratos
                  </p>
                </>
              )}
            </div>

            <Panel>
              <PanelLabel>O pega el texto</PanelLabel>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={5}
                placeholder="Pega aquí una exportación CSV, una tabla, notas de una reunión o cualquier texto con data…"
                className="vin-input mb-3"
                style={{ resize: "vertical", lineHeight: "1.6" }}
              />
              <PanelLabel>Nota para la lectura (opcional)</PanelLabel>
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. «esto es del último trimestre», «solo mira los países»"
                className="vin-input"
              />
            </Panel>

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={leer} disabled={cargando || !hayMaterial} className="vin-btn-primary">
                {cargando ? "Leyendo el material…" : "Leer y extraer"}
              </button>
              {(archivo || texto) && !cargando && (
                <button
                  onClick={() => {
                    setArchivo(null);
                    setTexto("");
                    setNota("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="vin-faint vin-t-xs hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Un fallo acá es el final del camino para quien viene a cargar
                data: si no se lee, no pasa nada más. Estaba en letra diminuta y
                debajo del pliegue, así que el sistema se veía mudo en vez de
                roto — que es peor, porque no da nada que hacer. */}
            {error && (
              <div
                className="rounded-xl px-4 py-3.5"
                style={{
                  color: "var(--vin-risk)",
                  background: "rgba(240,90,72,0.09)",
                  border: "1px solid rgba(240,90,72,0.3)",
                }}
              >
                <div className="vin-t-sm font-medium">No se pudo leer el material</div>
                <p className="vin-t-sm mt-1 leading-relaxed" style={{ maxWidth: "70ch" }}>
                  {error}
                </p>
              </div>
            )}
          </>
        )}

        {pendiente && (
          <Revision
            resultado={pendiente}
            proyecto={proyecto}
            aceptados={aceptados}
            onToggle={(k) => setAceptados((a) => ({ ...a, [k]: !a[k] }))}
            onAplicar={aplicar}
            onDescartar={() => descartarPendiente(proyecto.id)}
          />
        )}
      </div>
    </div>
  );
}

function Revision({
  resultado,
  proyecto,
  aceptados,
  onToggle,
  onAplicar,
  onDescartar,
}: {
  resultado: VincereIngestaResultado;
  proyecto: VincereProyecto;
  aceptados: Record<string, boolean>;
  onToggle: (k: BloqueKey) => void;
  onAplicar: () => void;
  onDescartar: () => void;
}) {
  const bloques = (Object.keys(resultado.propuesta) as BloqueKey[]).filter((k) => resultado.propuesta[k]);
  const seleccionados = bloques.filter((k) => aceptados[k]).length;

  return (
    <>
      <div className="vin-accent-card p-5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--vin-accent)" }} />
            <span className="vin-eyebrow">Lectura del material</span>
          </div>
          <EvidenceTag nivel={resultado.confianza} />
        </div>
        <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "70ch" }}>
          {resultado.lectura}
        </p>
        <p className="vin-faint vin-t-sm mt-2.5">{resultado.fuente}</p>
      </div>

      {bloques.length === 0 ? (
        <Panel>
          <p className="vin-muted vin-t-sm">
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
              aceptado={!!aceptados[k]}
              onToggle={() => onToggle(k)}
            />
          ))}
        </div>
      )}

      {resultado.alertas.length > 0 && (
        <Panel>
          <PanelLabel>Alertas que levantó ({resultado.alertas.length})</PanelLabel>
          <ul className="space-y-3">
            {resultado.alertas.map((a, i) => (
              <li key={i} className="flex flex-col gap-1.5">
                <p className="vin-t-sm leading-relaxed">{a.texto}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <SeveridadTag severidad={a.severidad} />
                  <EvidenceTag nivel={a.nivel} />
                  {a.seccion && <span className="vin-faint vin-t-xs">{VINCERE_SECCION_LABEL[a.seccion]}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="vin-faint mt-3 vin-t-xs">Se guardan al aplicar, y quedan visibles hasta que las descartes.</p>
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
          <p className="vin-faint mt-3 vin-t-xs">Complétalo a mano en su sección después de aplicar.</p>
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
        border: `1px solid ${aceptado ? "rgba(224,72,58,0.35)" : "var(--vin-border)"}`,
        background: aceptado ? "rgba(224,72,58,0.05)" : "var(--vin-surface)",
      }}
    >
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={aceptado}
          onChange={onToggle}
          style={{ accentColor: "var(--vin-accent)" }}
        />
        <span className="vin-t-base font-medium">{BLOQUE_DESTINO[clave]}</span>
        {subtitulo && <span className="vin-faint vin-t-sm">· {subtitulo}</span>}
      </label>
      <div className="mt-3 pl-7">
        <DetalleBloque clave={clave} propuesta={propuesta} proyecto={proyecto} />
      </div>
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
  const fila = "flex flex-wrap gap-x-2 vin-t-sm leading-relaxed";

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
      <ul className="space-y-1">
        {propuesta.canciones.map((c, i) => (
          <li key={i} className={fila}>
            <span>{c.nombre}</span>
            <span className="vin-faint">
              {formatStreams(c.streams)}
              {c.retencionPct ? ` · ret. ${c.retencionPct}%` : ""}
              {c.skipPct ? ` · skip ${c.skipPct}%` : ""}
              {c.playlistAdds ? ` · ${c.playlistAdds} adds` : ""}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (clave === "audiencia" && propuesta.audiencia) {
    const grupos: [string, { label: string; pct: number }[] | undefined][] = [
      ["Edad", propuesta.audiencia.edad],
      ["Plataformas", propuesta.audiencia.plataformas],
      ["Países", propuesta.audiencia.paises],
    ];
    return (
      <div className="space-y-1">
        {grupos
          .filter(([, v]) => v?.length)
          .map(([nombre, v]) => (
            <div key={nombre} className={fila}>
              <span className="vin-faint">{nombre}:</span>
              <span>{v!.map((s) => `${s.label} ${s.pct}%`).join(" · ")}</span>
            </div>
          ))}
      </div>
    );
  }

  if (clave === "zonasCalor" && propuesta.zonasCalor) {
    return (
      <p className="vin-t-sm leading-relaxed">
        {propuesta.zonasCalor.map((z) => `${z.ciudad} ${z.calor}`).join(" · ")}
      </p>
    );
  }

  if (clave === "kpis" && propuesta.kpis) {
    return (
      <ul className="space-y-1">
        {propuesta.kpis.map((k, i) => (
          <li key={i} className={fila}>
            <span>{k.label}</span>
            <span className="vin-faint">
              {k.actual}
              {k.unidad} de {k.meta}
              {k.unidad}
            </span>
          </li>
        ))}
      </ul>
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
    <div className="flex flex-col gap-2">
      {cambios.map((c) => (
        <div key={c.campo} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span className="vin-faint vin-t-sm" style={{ minWidth: "11rem" }}>
            {c.campo}
          </span>

          {c.tipo === "nuevo" ? (
            <>
              <span className="vin-t-base tabular-nums">{c.despues}</span>
              <span className="vin-faint vin-t-xs">dato nuevo</span>
            </>
          ) : c.tipo === "igual" ? (
            <>
              <span className="vin-muted vin-t-base tabular-nums">{c.despues}</span>
              <span className="vin-faint vin-t-xs">sin cambio</span>
            </>
          ) : (
            <>
              <span
                className="vin-faint vin-t-sm tabular-nums"
                style={{ textDecoration: "line-through" }}
              >
                {c.antes}
              </span>
              <span className="vin-faint vin-t-xs">→</span>
              <span className="vin-t-base tabular-nums">{c.despues}</span>
              {c.variacionPct != null && (
                <span
                  className="vin-t-xs tabular-nums"
                  style={{ color: c.variacionPct >= 0 ? "var(--vin-ok)" : "var(--vin-risk)" }}
                >
                  {c.variacionPct >= 0 ? "+" : ""}
                  {c.variacionPct}%
                </span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

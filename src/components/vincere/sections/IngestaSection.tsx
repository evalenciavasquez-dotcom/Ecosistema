"use client";

import { useRef, useState } from "react";
import {
  VincereIngestaPropuesta,
  VincereIngestaResultado,
  VincereProyecto,
  VINCERE_SECCION_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchIngest } from "@/lib/vincere/ai-client";
import { formatStreams } from "@/lib/vincere/format";
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

const RESUMEN_ETIQUETA: Record<string, string> = {
  streamsMes: "Streams/mes",
  streamsCambioPct: "Cambio streams",
  seguidores: "Seguidores",
  seguidoresCambioPct: "Cambio seguidores",
  momentumIndex: "Momentum Index",
  serie: "Serie histórica",
};

const DIAGNOSTICO_ETIQUETA: Record<string, string> = {
  faseActual: "Fase actual",
  fortalezaNucleo: "Fortaleza núcleo",
  riesgoPrincipal: "Riesgo principal",
  prioridad: "Prioridad #1",
};

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
  const [resultado, setResultado] = useState<VincereIngestaResultado | null>(null);
  const [aceptados, setAceptados] = useState<Record<string, boolean>>({});
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
    setResultado(null);
    try {
      const payload: Parameters<typeof fetchIngest>[0] = { artista: contexto, nota, texto };
      if (archivo) {
        const { data, mediaType } = await leerArchivo(archivo);
        payload.data = data;
        payload.mediaType = mediaType;
      }
      const r = await fetchIngest(payload);
      setResultado(r);
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

    setResultado(null);
    setArchivo(null);
    setTexto("");
    setNota("");
    if (inputRef.current) inputRef.current.value = "";
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
        <AlertasPanel proyecto={proyecto} />

        {!resultado && (
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
              className="cursor-pointer rounded-sm p-8 text-center transition-colors"
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
                  <p className="text-sm">{archivo.name}</p>
                  <p className="vin-faint mt-1 text-xs">
                    {(archivo.size / 1024).toFixed(0)} KB · haz clic para cambiarlo
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm">Suelta aquí una captura o un PDF, o haz clic para elegirlo</p>
                  <p className="vin-faint mt-1.5 text-xs leading-relaxed">
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
                  className="vin-faint text-xs hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>

            {error && (
              <p className="text-xs" style={{ color: "var(--vin-accent)" }}>
                {error}
              </p>
            )}
          </>
        )}

        {resultado && (
          <Revision
            resultado={resultado}
            aceptados={aceptados}
            onToggle={(k) => setAceptados((a) => ({ ...a, [k]: !a[k] }))}
            onAplicar={aplicar}
            onDescartar={() => setResultado(null)}
          />
        )}
      </div>
    </div>
  );
}

function Revision({
  resultado,
  aceptados,
  onToggle,
  onAplicar,
  onDescartar,
}: {
  resultado: VincereIngestaResultado;
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
            <span className="vin-eyebrow">Esto entendí</span>
          </div>
          <EvidenceTag nivel={resultado.confianza} />
        </div>
        <p className="mb-1.5 text-[15px] leading-relaxed">{resultado.lectura}</p>
        <p className="vin-faint text-xs">Fuente reconocida: {resultado.fuente}</p>
      </div>

      {bloques.length === 0 ? (
        <Panel>
          <p className="vin-muted text-sm">
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
                <p className="text-sm leading-relaxed">{a.texto}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <SeveridadTag severidad={a.severidad} />
                  <EvidenceTag nivel={a.nivel} />
                  {a.seccion && <span className="vin-faint text-[11px]">{VINCERE_SECCION_LABEL[a.seccion]}</span>}
                </div>
              </li>
            ))}
          </ul>
          <p className="vin-faint mt-3 text-xs">Se guardan al aplicar, y quedan visibles hasta que las descartes.</p>
        </Panel>
      )}

      {resultado.faltante.length > 0 && (
        <Panel>
          <PanelLabel>Lo que no se pudo leer</PanelLabel>
          <ul className="space-y-1.5">
            {resultado.faltante.map((f, i) => (
              <li key={i} className="vin-muted flex gap-2 text-[13.5px] leading-relaxed">
                <span style={{ color: "var(--vin-accent)" }}>—</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="vin-faint mt-3 text-xs">Complétalo a mano en su sección después de aplicar.</p>
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
  aceptado,
  onToggle,
}: {
  clave: BloqueKey;
  propuesta: VincereIngestaPropuesta;
  aceptado: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-sm p-4"
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
        <span className="text-[14.5px] font-medium">→ {BLOQUE_DESTINO[clave]}</span>
      </label>
      <div className="mt-2.5 pl-7">
        <DetalleBloque clave={clave} propuesta={propuesta} />
      </div>
    </div>
  );
}

function DetalleBloque({ clave, propuesta }: { clave: BloqueKey; propuesta: VincereIngestaPropuesta }) {
  const fila = "flex flex-wrap gap-x-2 text-[13px] leading-relaxed";

  if (clave === "resumen" && propuesta.resumen) {
    return (
      <dl className="space-y-1">
        {Object.entries(propuesta.resumen).map(([k, v]) => (
          <div key={k} className={fila}>
            <dt className="vin-faint">{RESUMEN_ETIQUETA[k] ?? k}:</dt>
            <dd>
              {k === "serie" && Array.isArray(v)
                ? `${v.length} meses`
                : k === "streamsMes"
                  ? formatStreams(Number(v))
                  : String(v)}
              {k.endsWith("CambioPct") ? "%" : ""}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (clave === "diagnostico" && propuesta.diagnostico) {
    return (
      <dl className="space-y-1">
        {Object.entries(propuesta.diagnostico).map(([k, v]) => (
          <div key={k} className={fila}>
            <dt className="vin-faint">{DIAGNOSTICO_ETIQUETA[k] ?? k}:</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>
    );
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
      <p className="text-[13px] leading-relaxed">
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

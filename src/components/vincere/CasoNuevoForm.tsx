"use client";

import { useMemo, useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { evidenciaDeEntrada, hechosDelProyecto } from "@/lib/vincere/entrada";
import { leerArchivo } from "@/lib/vincere/archivo";
import { fetchResearch, fetchTriage } from "@/lib/vincere/ai-client";
import EvidenciaDeEntradaPanel from "./EvidenciaDeEntradaPanel";
import { PanelLabel } from "./primitives";

// La ficha de un caso nuevo: quién es y con qué se lo va a juzgar.
//
// Vivía dentro de Triage, con su propio adjuntador de archivos. Eso creaba dos
// puertas para el mismo gesto —«tengo material de un artista»— y Eduardo se
// topó con las dos: subió el archivo a Cargar data, y después volvió a subirlo
// a Triage porque no era evidente que fueran el mismo camino.
//
// Ahora el material entra en un solo sitio y este formulario recibe lo que ya
// se cargó. No pide archivo: pide lo único que el material no puede decir por
// sí mismo, que es de quién estamos hablando.

const FASES = ["Emergente", "Consolidación", "Establecido", "No lo sé aún"];

export default function CasoNuevoForm({
  archivo,
  descripcion,
  onListo,
}: {
  archivo: File | null;
  // El texto que se pegó arriba, ya unido con la nota. Para un caso nuevo, eso
  // ES la descripción: no hay razón para pedirla dos veces en la misma pantalla.
  descripcion: string;
  onListo: (casoId: string) => void;
}) {
  const proyectos = useVincereStore((s) => s.proyectos);
  const addTriageCaso = useVincereStore((s) => s.addTriageCaso);
  const updateVeredicto = useVincereStore((s) => s.updateTriageCasoVeredicto);
  const deleteTriageCaso = useVincereStore((s) => s.deleteTriageCaso);

  const [nombre, setNombre] = useState("");
  const [genero, setGenero] = useState("");
  const [fase, setFase] = useState(FASES[0]);
  // Buscar en la web es una opción del análisis, no un paso previo: nadie
  // quiere hacer una búsqueda, quiere un veredicto. Viene marcada porque es lo
  // más barato que sube el techo de evidencia.
  const [conWeb, setConWeb] = useState(true);
  // Cuando el caso es sobre un artista que YA está cargado, el veredicto deja
  // de apoyarse en lo que alguien recuerde y pasa a leer sus números.
  const [proyectoId, setProyectoId] = useState("");
  const [paso, setPaso] = useState<"" | "buscando" | "analizando">("");
  const [error, setError] = useState<string | null>(null);

  const proyectoElegido = proyectos.find((p) => p.id === proyectoId) ?? null;
  const cargando = paso !== "";

  // El techo se calcula mientras escribe, con la MISMA función que usa el
  // servidor. Verlo antes de pedir el veredicto es lo que convierte «falta
  // data» en algo accionable: se ve qué lo sube y cuánto.
  const evidencia = useMemo(
    () =>
      evidenciaDeEntrada({
        descripcion,
        tieneArchivo: !!archivo,
        investigoWeb: conWeb,
        ...hechosDelProyecto(proyectoElegido),
      }),
    [descripcion, archivo, proyectoElegido, conWeb]
  );

  // Los números medidos y no el proyecto entero: el veredicto necesita saber
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

  const listo = !cargando && nombre.trim().length > 0 && evidencia.suficienteParaVeredicto;

  async function run() {
    if (!listo) return;
    setError(null);
    const limpio = nombre.trim();
    const id = addTriageCaso({
      nombre: limpio,
      genero: genero.trim(),
      fase,
      descripcion,
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
        setPaso("buscando");
        try {
          const { investigacion } = await fetchResearch({
            tipo: "artista",
            consulta: `${limpio}${genero.trim() ? ` — ${genero.trim()}` : ""}: qué se sabe públicamente, qué tan real es su tracción y qué señales hay de su mercado`,
            artista: { nombre: limpio, genero: genero.trim(), fase },
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

      setPaso("analizando");
      const adjunto = archivo ? await leerArchivo(archivo) : null;
      const r = await fetchTriage({
        nombre: limpio,
        genero: genero.trim(),
        fase,
        descripcion,
        ...(adjunto ? { data: adjunto.data, mediaType: adjunto.mediaType } : {}),
        ...hechosDelProyecto(proyectoElegido),
        investigoWeb: !!web,
        datosDelProyecto: datosDelProyecto(),
        investigacion: web,
      });
      updateVeredicto(id, { ...r, web });
      setNombre("");
      setGenero("");
      setFase(FASES[0]);
      setProyectoId("");
      onListo(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el caso");
      deleteTriageCaso(id);
    } finally {
      setPaso("");
    }
  }

  return (
    <div className="grid gap-3.5">
      <div>
        <PanelLabel>De quién es este caso</PanelLabel>
        <div className="grid gap-3">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del artista"
            className="vin-input"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              placeholder="Género / estilo"
              className="vin-input"
            />
            <select value={fase} onChange={(e) => setFase(e.target.value)} className="vin-input">
              {FASES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {proyectos.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="vin-muted vin-t-sm font-medium">Vincularlo a un proyecto ya cargado (opcional)</span>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="vin-input">
            <option value="">No — es un artista que el sistema no conoce</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <span className="vin-faint vin-t-xs leading-relaxed">
            Si ya está cargado, el veredicto lee sus números medidos en vez de fiarse de la descripción.
          </span>
        </label>
      )}

      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" checked={conWeb} onChange={(e) => setConWeb(e.target.checked)} className="mt-1" />
        <span>
          <span className="vin-t-sm">Buscar también en la web al analizar</span>
          <span className="vin-faint vin-t-xs mt-0.5 block leading-relaxed">
            Es la única fuente de un caso nuevo que no viene del interesado, y por eso vale un nivel entero de
            evidencia. Si la búsqueda falla, el veredicto sale igual — sin ella y con el techo más bajo.
          </span>
        </span>
      </label>

      <EvidenciaDeEntradaPanel evidencia={evidencia} />

      {error && (
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            color: "var(--vin-risk)",
            background: "var(--vin-risk-wash)",
            border: "1px solid var(--vin-risk-line)",
          }}
        >
          <div className="vin-t-sm font-medium">No se pudo analizar el caso</div>
          <p className="vin-t-sm mt-1 leading-relaxed" style={{ maxWidth: "70ch" }}>
            {error}
          </p>
        </div>
      )}

      {/* Sin nombre o sin nada que leer no se puede emitir veredicto, y el
          botón lo dice en vez de fallar después. */}
      <button onClick={run} disabled={!listo} className="vin-btn-primary justify-self-start">
        {paso === "buscando"
          ? "Buscando en la web…"
          : paso === "analizando"
            ? "Leyendo el caso…"
            : !nombre.trim()
              ? "Falta el nombre del artista"
              : !evidencia.suficienteParaVeredicto
                ? "Falta material que leer"
                : "Analizar el caso"}
      </button>
    </div>
  );
}

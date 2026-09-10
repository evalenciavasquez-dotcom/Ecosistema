"use client";

import { useRef, useState } from "react";
import { VincereNivel, VincereTriageCaso } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchTriage } from "@/lib/vincere/ai-client";
import { claseDeArchivo, leerArchivo, leerComoTexto, TOPE_TEXTO } from "@/lib/vincere/archivo";

// Sumarle data a un caso ya analizado, y volver a leerlo.
//
// Faltaba el bucle. Un caso se analizaba UNA vez, con el material que hubiera
// en ese momento, y ahí se quedaba: si a los tres días llegaba la captura de
// Spotify no había dónde meterla. La única salida era abrir otro caso del
// mismo artista, que parte el expediente en dos y deja dos veredictos
// compitiendo sobre la misma persona.
//
// Eso empujaba a esperar antes de decidir —«mejor pido todo primero»—, que es
// justo lo contrario de lo que este sistema defiende: se decide con lo que
// hay, diciendo con cuánto respaldo, y se corrige cuando llega más. El techo
// de evidencia existe para poder avanzar sin fingir certeza, no para bloquear.
//
// Tres cosas que no son obvias y que hacen que esto funcione:
//
// 1. EL MATERIAL SE ACUMULA. Lo nuevo se pega a la descripción anterior en vez
//    de reemplazarla. Si cada relectura borrara lo previo, sumar la tercera
//    cosa perdería las dos primeras y el veredicto empeoraría al mejorar la
//    data.
//
// 2. LA INVESTIGACIÓN WEB SE ARRASTRA. Si el análisis original consultó la
//    web, la relectura lo declara de nuevo. Sin esto el techo BAJARÍA al
//    sumar data —de 2 a 1 por perder el contraste externo—, que es el peor
//    resultado posible de un botón que promete mejorar la lectura.
//
// 3. LA DECISIÓN SOBREVIVE. Volver a leer actualiza el veredicto, no lo que
//    Eduardo decidió. Cambiar de opinión es un gesto aparte y explícito.
export default function SumarDataCaso({ caso }: { caso: VincereTriageCaso }) {
  const updateVeredicto = useVincereStore((s) => s.updateTriageCasoVeredicto);
  const showToast = useVincereStore((s) => s.showToast);

  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subio, setSubio] = useState<{ de: VincereNivel | null; a: VincereNivel } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hayMaterial = !!archivo || texto.trim().length > 0;

  // Mismo criterio que en «Cargar data»: lo que es texto se vuelca al cuadro,
  // lo que no se puede leer se dice en el acto.
  async function recibirArchivo(f: File | null) {
    setAviso(null);
    if (!f) return setArchivo(null);
    const clase = claseDeArchivo(f);
    if (clase === "texto") {
      const { texto: contenido, cortado } = await leerComoTexto(f);
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setTexto((previo) => (previo.trim() ? `${previo.trim()}\n\n${contenido}` : contenido));
      setAviso(
        cortado
          ? `«${f.name}» entró como texto, cortado a los primeros ${Math.round(TOPE_TEXTO / 1000)} mil caracteres.`
          : `«${f.name}» entró como texto. Puedes editarlo antes de leer.`
      );
      return;
    }
    if (clase === "noSoportado") {
      setArchivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setAviso(
        `«${f.name}» no se puede leer directo. Van imágenes, PDF y texto plano. Si es un Word o un Excel, copia el contenido y pégalo abajo.`
      );
      return;
    }
    setArchivo(f);
  }

  async function releer() {
    if (leyendo || !hayMaterial) return;
    setLeyendo(true);
    setError(null);
    setSubio(null);
    try {
      const adjunto = archivo ? await leerArchivo(archivo) : null;
      // Acumulado, no reemplazo: el caso conserva todo sobre lo que se ha
      // decidido, y la próxima relectura sigue teniéndolo.
      const descripcion = [caso.descripcion.trim(), texto.trim()].filter(Boolean).join("\n\n");
      const r = await fetchTriage({
        nombre: caso.nombre,
        genero: caso.genero,
        fase: caso.fase,
        descripcion,
        ...(adjunto ? { data: adjunto.data, mediaType: adjunto.mediaType } : {}),
        // Lo que ya se había investigado sigue contando.
        investigoWeb: !!caso.web,
        investigacion: caso.web,
      });
      const antes = caso.nivel;
      updateVeredicto(caso.id, { ...r, descripcion, web: caso.web });
      setSubio({ de: antes, a: r.nivel });
      setTexto("");
      setArchivo(null);
      setAviso(null);
      if (inputRef.current) inputRef.current.value = "";
      showToast(
        antes && r.nivel > antes
          ? `${caso.nombre}: la lectura subió a nivel ${r.nivel}`
          : `${caso.nombre}: lectura actualizada`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo volver a leer el caso");
    } finally {
      setLeyendo(false);
    }
  }

  if (!abierto) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={() => setAbierto(true)} className="vin-btn-ghost !py-1.5 vin-t-sm">
          + Sumar data y volver a leer
        </button>
        {/* Lo que se gana, dicho antes de abrir nada: si no se ve qué cambia,
            el botón parece trabajo extra en vez de una mejora. */}
        <span className="vin-faint vin-t-sm">
          {caso.nivel && caso.nivel < 4
            ? `Cada cosa que sumes puede subir el techo desde el nivel ${caso.nivel}.`
            : "La lectura se rehace con el material nuevo."}
        </span>
        {subio && (
          <span className="vin-t-sm" style={{ color: "var(--vin-ok)" }}>
            {subio.de && subio.a > subio.de
              ? `Subió de nivel ${subio.de} a ${subio.a}`
              : `Releído · nivel ${subio.a}`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-3 rounded-xl p-4"
      style={{ background: "var(--vin-tinte-datos)", border: "1px solid var(--vin-tinte-datos-linea)" }}
    >
      <div className="vin-block-title mb-3" style={{ borderBottomColor: "var(--vin-tinte-datos-linea)" }}>
        <span>Sumar data a este caso</span>
      </div>

      <p className="vin-muted mb-3 vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
        Lo que sumes se guarda junto a lo que ya había y el veredicto se rehace con todo. Tu decisión no se toca.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => inputRef.current?.click()} className="vin-btn-ghost !py-1.5 vin-t-sm">
          {archivo ? archivo.name : "Adjuntar captura, PDF o CSV"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/csv,text/plain,.csv,.tsv,.txt,.json,.md"
          className="hidden"
          onChange={(e) => void recibirArchivo(e.target.files?.[0] ?? null)}
        />
        <span className="vin-faint vin-t-sm">Una captura de Spotify for Artists sube el techo a 3.</span>
      </div>

      {aviso && (
        <p className="vin-muted mt-3 vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
          {aviso}
        </p>
      )}

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="O pega lo que tengas: cifras, notas de una llamada, lo que te mandó el manager…"
        className="vin-input mt-3"
        style={{ resize: "vertical", lineHeight: "1.6" }}
      />

      {error && (
        <p
          className="vin-t-sm mt-3 rounded-xl px-3.5 py-2.5 leading-relaxed"
          style={{
            color: "var(--vin-risk)",
            background: "var(--vin-risk-wash)",
            border: "1px solid var(--vin-risk-line)",
          }}
        >
          {error}
        </p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <button onClick={releer} disabled={!hayMaterial || leyendo} className="vin-btn-primary !py-1.5 vin-t-sm">
          {leyendo ? "Leyendo…" : "Volver a leer el caso"}
        </button>
        <button
          onClick={() => {
            setAbierto(false);
            setTexto("");
            setArchivo(null);
            setAviso(null);
            setError(null);
          }}
          className="vin-faint vin-t-sm hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

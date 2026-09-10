"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import {
  VincereQAEntry,
  VincereFase,
  VINCERE_DATA_QUE_SIRVE,
  mensajeDeDataQueSirve,
} from "@/lib/vincere/types";
import { fetchAsk } from "@/lib/vincere/ai-client";
import { genId } from "@/lib/id";
import { SectionHeader, Panel, PanelLabel, BloqueTintado, Exigencia } from "../primitives";
import TriageCasoCard from "../TriageCasoCard";
import QuestionBox from "../QuestionBox";

// Triage ya no tiene formulario de entrada.
//
// Tenía uno propio, con su propio adjuntador de archivos, y al lado existía
// «Cargar data» con otro. Dos puertas para el mismo gesto —«tengo material de
// un artista»—, y el resultado previsible: Eduardo subió el archivo a Cargar
// data, no vio a dónde había ido a parar, y lo volvió a subir acá.
//
// Ahora el material entra por un solo sitio y ahí se elige a dónde va. Esta
// pantalla es lo que Triage siempre debió ser: el expediente de las decisiones
// de entrada, no el trámite para pedirlas.

// Fases del formulario de caso → fases de proyecto. "No lo sé aún" no es una
// fase: cuando no se sabe, el proyecto entra como emergente, que es la
// suposición barata de corregir.
const FASE_DE_PROYECTO: Record<string, VincereFase> = {
  Emergente: "Emergente",
  Consolidación: "Consolidación",
  Establecido: "Establecido",
  "No lo sé aún": "Emergente",
};

export default function TriageSection() {
  const triageCasos = useVincereStore((s) => s.triageCasos);
  const deleteTriageCaso = useVincereStore((s) => s.deleteTriageCaso);
  const decidirTriageCaso = useVincereStore((s) => s.decidirTriageCaso);
  const proyectos = useVincereStore((s) => s.proyectos);
  const addProyecto = useVincereStore((s) => s.addProyecto);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const showToast = useVincereStore((s) => s.showToast);
  const [qaLog, setQaLog] = useState<VincereQAEntry[]>([]);
  const [copiado, setCopiado] = useState(false);

  // El pedido, redactado y al portapapeles. Si el navegador no deja copiar
  // —permiso denegado, contexto no seguro— se dice, en vez de fingir que sí.
  async function copiarPedido() {
    // El nombre solo cuando no hay ambigüedad. Este bloque vive al pie de la
    // sección, no dentro de un caso, así que con varios abiertos no hay forma
    // de saber por cuál se está preguntando — y mandarle a alguien un mensaje
    // que nombra al artista equivocado es peor que uno genérico.
    const unico = triageCasos.length === 1 ? triageCasos[0].nombre : undefined;
    try {
      await navigator.clipboard.writeText(mensajeDeDataQueSirve(unico));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      showToast("El navegador no dejó copiar. Selecciona el texto a mano.");
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

  // Un veredicto que dice «entrar» y no deja entrar no sirve de nada. El paso
  // siguiente de un caso aprobado es abrirle proyecto, y se hace desde acá.
  function abrirProyecto(nombre: string, genero: string, fase: string) {
    const yaExiste = proyectos.find((p) => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
    if (yaExiste) {
      useVincereStore.getState().selectProyecto(yaExiste.id);
      showToast(`${yaExiste.nombre} ya estaba en el sistema`);
    } else {
      addProyecto({ nombre, genero, fase: FASE_DE_PROYECTO[fase] ?? "Emergente", tipo: "propio" });
      showToast(`Proyecto creado: ${nombre}`);
    }
    setSeccion("ingesta");
  }

  return (
    <div>
      <SectionHeader
        eyebrow="¿Entro al caso?"
        title="Triage de casos"
        subtitle="Las decisiones de entrada, con el material sobre el que se tomaron. Un caso nuevo se abre soltando su material en «Cargar data» y marcando ahí que va a Triage."
      />

      <div className="space-y-5">
        {triageCasos.length === 0 ? (
          <Panel>
            <PanelLabel>Todavía no hay casos</PanelLabel>
            <p className="vin-muted mb-4 vin-t-base leading-relaxed" style={{ maxWidth: "68ch" }}>
              Un caso entra por su material, no por un formulario. Ve a «Cargar data», suelta lo que tengas del
              artista —una captura de Spotify for Artists, un dossier, un PDF— y marca que va a Triage como caso
              nuevo.
            </p>
            <button onClick={() => setSeccion("ingesta")} className="vin-btn-primary">
              Cargar el material de un caso →
            </button>
          </Panel>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="vin-muted vin-t-sm">
                {triageCasos.length} {triageCasos.length === 1 ? "caso analizado" : "casos analizados"}
              </span>
              <button onClick={() => setSeccion("ingesta")} className="vin-btn-ghost">
                + Caso nuevo
              </button>
            </div>

            <div className="space-y-3">
              {triageCasos.map((c) => (
                <TriageCasoCard
                  key={c.id}
                  caso={c}
                  onEliminar={() => deleteTriageCaso(c.id)}
                  onEntrar={() => {
                    decidirTriageCaso(c.id, "entramos");
                    abrirProyecto(c.nombre, c.genero, c.fase);
                  }}
                  onDecidir={(d) => decidirTriageCaso(c.id, d)}
                />
              ))}
            </div>
          </>
        )}

        {/* Es la herramienta más usable que hay acá: se copia y se manda tal
            cual. Dos cosas la tenían atascada.

            UNA, estaba escrita como puerta —«pídela ANTES de decir que sí»—, y
            este sistema no tiene puertas: no bloquea la decisión, dice con
            cuánto respaldo se está tomando. Se puede entrar a un caso sin nada
            de esto. Ahora eso está dicho, y con el botón para hacerlo.

            DOS, las seis iban del mismo peso, cuando solo dos mueven el techo
            del veredicto de entrada. Las otras cuatro encienden motores para
            después. Separarlas es lo que deja elegir qué pedir primero. */}
        <BloqueTintado tipo="accion" rotulo="Si quieres más respaldo" titulo="Qué data pedir">
          <div className="vin-block-title mb-3" style={{ borderBottomColor: "var(--vin-tinte-accion-linea)" }}>
            <span>Sube el techo del veredicto</span>
          </div>
          <ul className="flex flex-col gap-3">
            {VINCERE_DATA_QUE_SIRVE.filter((d) => d.grupo === "decidir").map((d, i) => (
              <Exigencia key={i} porQue={d.porQue} etiqueta={d.desbloquea}>
                {d.pide}
              </Exigencia>
            ))}
          </ul>

          <div
            className="vin-block-title mb-3 mt-6"
            style={{ borderBottomColor: "var(--vin-tinte-accion-linea)" }}
          >
            <span>Enciende motores una vez esté dentro</span>
          </div>
          <ul className="flex flex-col gap-3">
            {VINCERE_DATA_QUE_SIRVE.filter((d) => d.grupo === "trabajar").map((d, i) => (
              <Exigencia key={i} porQue={d.porQue} etiqueta={d.desbloquea}>
                {d.pide}
              </Exigencia>
            ))}
          </ul>

          <div
            className="mt-5 flex flex-wrap items-center gap-3"
            style={{ borderTop: "1px solid var(--vin-tinte-accion-linea)", paddingTop: "1rem" }}
          >
            <button onClick={copiarPedido} className="vin-btn-primary !py-1.5 vin-t-xs">
              {copiado ? "Copiado" : "Copiar para mandar"}
            </button>
            <span className="vin-muted vin-t-sm">Queda redactado y listo para pegar.</span>
          </div>

          {/* La salida. Sin esto la lista se lee como un requisito, y no lo es:
              decidir con poco es legítimo mientras el veredicto lo diga. */}
          <p className="vin-muted mt-3 vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
            No hace falta nada de esto para decidir. Puedes entrar, descartar o dejarlo en espera con lo que ya
            tienes — el veredicto sale igual, solo que con el techo de evidencia que le corresponda, y eso queda
            escrito en la tarjeta. Pedir data sube el techo; no es un permiso para avanzar.
          </p>
        </BloqueTintado>

        <QuestionBox log={qaLog} onAsk={ask} placeholder="¿Este caso encaja con lo que dirige VINCERE?…" />
      </div>
    </div>
  );
}

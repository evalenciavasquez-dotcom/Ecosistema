"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereQAEntry, VincereFase, VINCERE_DATA_QUE_SIRVE } from "@/lib/vincere/types";
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

        {/* Esto no es una nota al pie: es la lista de lo que se le exige a un
            artista antes de comprometerse. Vivía plegada dentro de un
            desplegable gris idéntico a los otros dos de la pantalla, así que
            se leía como letra chica — cuando en realidad es la herramienta más
            usable que hay acá: se copia y se manda tal cual. */}
        <BloqueTintado tipo="accion" rotulo="Antes de decir que sí" titulo="Qué data pedir">
          <ul className="flex flex-col gap-2.5">
            {VINCERE_DATA_QUE_SIRVE.map((d, i) => (
              <Exigencia key={i}>{d}</Exigencia>
            ))}
          </ul>
          <p
            className="vin-muted mt-4 vin-t-sm leading-relaxed"
            style={{ maxWidth: "64ch", borderTop: "1px solid var(--vin-tinte-accion-linea)", paddingTop: "0.9rem" }}
          >
            Pídela <strong>antes</strong> de decir que sí. Después del primer análisis, pedirla se ve como que no
            sabías.
          </p>
        </BloqueTintado>

        <QuestionBox log={qaLog} onAsk={ask} placeholder="¿Este caso encaja con lo que dirige VINCERE?…" />
      </div>
    </div>
  );
}

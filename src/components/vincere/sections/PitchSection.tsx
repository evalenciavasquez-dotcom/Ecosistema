"use client";

import { useState } from "react";
import {
  temperaturaDe,
  VincerePitch,
  VincerePitchDestino,
  VincereProyecto,
  VINCERE_PITCH_DESTINO_DESC,
  VINCERE_PITCH_DESTINO_LABEL,
  VINCERE_TEMPERATURA_COLOR,
  VINCERE_TEMPERATURA_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { useAppStore } from "@/lib/store";
import { fetchPitch } from "@/lib/vincere/ai-client";
import { buildPitchContext, ContactoPuente } from "@/lib/vincere/context";
import { genId } from "@/lib/id";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const DESTINOS: VincerePitchDestino[] = ["dsp", "disquera", "marca", "promotor"];

const OBJETIVO_PLACEHOLDER: Record<VincerePitchDestino, string> = {
  dsp: "Ej. «considerar Otra Vida para playlists de pop urbano en el lanzamiento del 12 de septiembre»",
  disquera: "Ej. «un deal de distribución con adelanto para el próximo EP», «label services sin ceder máster»",
  marca: "Ej. «activación con una marca de bebidas para la gira de otoño»",
  promotor: "Ej. «una fecha en noviembre en sala mediana, garantía más puerta»",
};

export default function PitchSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addPitch = useVincereStore((s) => s.addPitch);
  const deletePitch = useVincereStore((s) => s.deletePitch);
  const showToast = useVincereStore((s) => s.showToast);
  // Los contactos viven en el C.C.O.: es el único punto donde VINCERE mira
  // hacia el otro sistema, y solo para reconocer puentes reales.
  const personas = useAppStore((s) => s.personas);

  const [destino, setDestino] = useState<VincerePitchDestino>("disquera");
  const [plaza, setPlaza] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const pitches = proyecto.pitches ?? [];
  const activo = pitches.find((x) => x.id === abierto) ?? pitches[0] ?? null;

  // Las plazas se ofrecen ordenadas por calor: la primera de la lista es
  // literalmente donde hay más demanda que reforzar, que es para lo que sirve
  // el mapa de calor.
  const plazasPorCalor = [...proyecto.zonasCalor].sort((a, b) => b.calor - a.calor);
  const faltaPlaza = destino === "promotor" && !plaza.trim();

  async function generar() {
    if (cargando || faltaPlaza) return;
    setCargando(true);
    setError(null);
    try {
      const contactos: ContactoPuente[] = personas.map((p) => ({
        nombre: p.nombre,
        empresa: p.empresaProyecto,
        rol: p.rol,
        relacion: p.relacion,
        influencia: p.nivelInfluencia,
        ultimoContacto: p.ultimoContacto,
      }));
      const laPlaza = destino === "promotor" ? plaza.trim() : null;
      const r = await fetchPitch({
        artista: buildPitchContext(proyecto, contactos, laPlaza),
        destino,
        objetivo,
        plaza: laPlaza,
      });
      const conId: VincerePitch = { ...r, id: genId("pitch") };
      addPitch(proyecto.id, conId);
      setAbierto(conId.id);
      setObjetivo("");
      showToast(
        laPlaza
          ? `Pitch generado para un promotor de ${laPlaza}`
          : `Pitch generado para ${VINCERE_PITCH_DESTINO_LABEL[destino]}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el pitch");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="pitch"
      eyebrow="Pitch y Presentación"
      title="Cómo se presenta este artista"
      subtitle="Cuatro destinos, cuatro documentos distintos. Y una decisión que los separa de cualquier otro pitch: declaramos nuestro propio riesgo y el nivel de evidencia de cada dato — en una sala donde todos llevan números buenos, es lo único que hace que te crean el resto."
      aiTitle="Lectura VINCERE — Pitch"
    >
      <Panel>
        <PanelLabel>A quién se lo presentamos</PanelLabel>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DESTINOS.map((d) => (
            <button
              key={d}
              onClick={() => setDestino(d)}
              className="rounded-sm p-3 text-left transition-colors"
              style={{
                border: `1px solid ${destino === d ? "var(--vin-accent)" : "var(--vin-border)"}`,
                background: destino === d ? "rgba(224,72,58,0.08)" : "transparent",
              }}
            >
              <div
                className="mb-1 text-[13.5px] font-medium"
                style={{ color: destino === d ? "var(--vin-text)" : "var(--vin-muted)" }}
              >
                {VINCERE_PITCH_DESTINO_LABEL[d]}
              </div>
              <div className="vin-faint text-[11.5px] leading-relaxed">{VINCERE_PITCH_DESTINO_DESC[d]}</div>
            </button>
          ))}
        </div>

        {destino === "promotor" && (
          <div className="mb-3">
            <PanelLabel>En qué plaza</PanelLabel>
            <p className="vin-faint mb-2 text-[11.5px] leading-relaxed">
              Ordenadas por calor: arriba está donde hay más demanda que reforzar. Un empresario no compra la audiencia
              nacional del artista — compra la suya.
            </p>
            {plazasPorCalor.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {plazasPorCalor.map((z) => {
                  const t = temperaturaDe(z.calor);
                  const sel = plaza.trim().toLocaleLowerCase("es") === z.ciudad.toLocaleLowerCase("es");
                  return (
                    <button
                      key={z.id}
                      onClick={() => setPlaza(z.ciudad)}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition-colors"
                      style={{
                        border: `1px solid ${sel ? VINCERE_TEMPERATURA_COLOR[t] : "var(--vin-border)"}`,
                        color: sel ? "var(--vin-text)" : "var(--vin-muted)",
                        background: sel ? `${VINCERE_TEMPERATURA_COLOR[t]}1f` : "transparent",
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: VINCERE_TEMPERATURA_COLOR[t] }} />
                      {z.ciudad}
                      <span className="vin-faint tabular-nums">{z.calor}</span>
                      <span className="vin-faint" style={{ color: VINCERE_TEMPERATURA_COLOR[t] }}>
                        {VINCERE_TEMPERATURA_LABEL[t]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="vin-faint mb-2 text-[11.5px] leading-relaxed">
                No hay zonas de calor cargadas. Puedes escribir la ciudad igual, pero el pitch va a ir sin medida de
                demanda local y lo va a decir.
              </p>
            )}
            <input
              value={plaza}
              onChange={(e) => setPlaza(e.target.value)}
              placeholder="Ciudad de la fecha"
              className="vin-input"
            />
          </div>
        )}

        <PanelLabel>Qué quieres conseguir</PanelLabel>
        <input
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder={OBJETIVO_PLACEHOLDER[destino]}
          className="vin-input mb-3"
        />

        {destino !== "dsp" && (
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            {personas.length > 0
              ? `Se van a revisar tus ${personas.length} contactos del C.C.O. para ver si alguno sirve de puente hacia el destinatario.`
              : "No tienes contactos cargados en el C.C.O., así que el pitch no va a proponer puentes personales. Cárgalos en Personas si quieres que los use."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generar} disabled={cargando || faltaPlaza} className="vin-btn-primary">
            {cargando ? "Escribiendo el pitch…" : "Generar pitch"}
          </button>
          {faltaPlaza && !cargando && (
            <span className="vin-faint text-xs">Elige la ciudad: sin plaza saldría el pitch genérico que esto evita.</span>
          )}
          {cargando && <span className="vin-faint text-xs">Sale como texto final, listo para mandar.</span>}
        </div>
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {pitches.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {pitches.map((x) => (
            <button
              key={x.id}
              onClick={() => setAbierto(x.id)}
              className="rounded-sm px-2.5 py-1 text-[11.5px] transition-colors"
              style={{
                background: activo?.id === x.id ? "rgba(224,72,58,0.14)" : "transparent",
                color: activo?.id === x.id ? "var(--vin-text)" : "var(--vin-muted)",
                border: `1px solid ${activo?.id === x.id ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
              }}
            >
              {VINCERE_PITCH_DESTINO_LABEL[x.destino]}
              {x.plaza ? ` · ${x.plaza}` : ""} · {x.generadoEn.slice(0, 10)}
            </button>
          ))}
        </div>
      )}

      {activo && (
        <PitchRender
          pitch={activo}
          onEliminar={() => {
            deletePitch(proyecto.id, activo.id);
            setAbierto(null);
          }}
        />
      )}
    </SectionShell>
  );
}

function PitchRender({ pitch, onEliminar }: { pitch: VincerePitch; onEliminar: () => void }) {
  const [copiado, setCopiado] = useState(false);

  async function copiarCorto() {
    if (!pitch.pitchCorto) return;
    await navigator.clipboard.writeText(pitch.pitchCorto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="vin-eyebrow">
            {VINCERE_PITCH_DESTINO_LABEL[pitch.destino]}
            {pitch.plaza && ` · ${pitch.plaza}`}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={pitch.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 text-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <h2 className="vin-serif mb-3 text-2xl leading-snug">{pitch.titular}</h2>
        <p className="text-[15px] leading-relaxed">{pitch.apertura}</p>
        {pitch.objetivo && <p className="vin-faint mt-3 text-xs">Objetivo declarado: {pitch.objetivo}</p>}
      </div>

      {/* Solo DSP: el texto literal, con su contador y su botón de copiar. */}
      {pitch.pitchCorto && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.3)" }}
        >
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <PanelLabel>
              <span style={{ color: "#2dd4bf" }}>Para pegar en Spotify for Artists</span>
            </PanelLabel>
            <div className="flex items-center gap-3">
              <span
                className="vin-faint text-[11px] tabular-nums"
                style={{ color: pitch.pitchCorto.length > 480 ? "#e0a83a" : undefined }}
              >
                {pitch.pitchCorto.length}/500
              </span>
              <button onClick={copiarCorto} className="vin-btn-ghost vin-no-print px-3 py-1 text-[11.5px]">
                {copiado ? "Copiado ✓" : "Copiar"}
              </button>
            </div>
          </div>
          <p className="text-[14px] leading-relaxed">{pitch.pitchCorto}</p>
        </div>
      )}

      {pitch.etiquetas.length > 0 && (
        <Panel>
          <PanelLabel>Etiquetas</PanelLabel>
          <div className="flex flex-wrap gap-1.5">
            {pitch.etiquetas.map((e) => (
              <span
                key={e}
                className="rounded-full px-2.5 py-1 text-[12px]"
                style={{ border: "1px solid var(--vin-border-strong)", color: "var(--vin-muted)" }}
              >
                {e}
              </span>
            ))}
          </div>
        </Panel>
      )}

      {/* Solo promotor. Va destacado porque de todo el documento es el único
          número que puede quemar la plaza para el próximo año: una sala de 600
          con 310 adentro se ve peor que una de 300 llena. */}
      {pitch.aforoSugerido != null && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(224,168,58,0.07)", border: "1px solid rgba(224,168,58,0.3)" }}
        >
          <PanelLabel>
            <span style={{ color: "#e0a83a" }}>Aforo que aguanta esta plaza hoy</span>
          </PanelLabel>
          <p className="vin-serif mb-2 text-3xl tabular-nums leading-none">
            {pitch.aforoSugerido.toLocaleString("es-CO")}
            <span className="vin-faint ml-2 align-middle text-[13px]">personas</span>
          </p>
          {pitch.porQueEseAforo && (
            <p className="text-[14px] leading-relaxed">{pitch.porQueEseAforo}</p>
          )}
          <p className="vin-faint mt-2.5 text-[11.5px] leading-relaxed">
            Es deliberadamente conservador. Quedarse corto se arregla subiendo de sala; pasarse deja media sala vacía y
            un empresario que no vuelve a llamar.
          </p>
        </div>
      )}

      {pitch.bloques.map((b, i) => (
        <Panel key={i}>
          <PanelLabel>{b.titulo}</PanelLabel>
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{b.contenido}</p>
        </Panel>
      ))}

      {pitch.evidencia.length > 0 && (
        <section>
          <PanelLabel>La evidencia, con su nivel</PanelLabel>
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            Va declarada a propósito. Marcar qué dato es sólido y cuál es parcial es lo que separa esto de una lista de
            números buenos.
          </p>
          <div className="space-y-2">
            {pitch.evidencia.map((e, i) => (
              <div key={i} className="vin-card flex flex-wrap items-start justify-between gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-relaxed">{e.dato}</p>
                  <p className="vin-faint mt-1 text-[11.5px]">{e.deDondeSale}</p>
                </div>
                <EvidenceTag nivel={e.nivel} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div
        className="rounded-sm p-5"
        style={{ background: "rgba(224,72,58,0.07)", border: "1px solid rgba(224,72,58,0.28)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>El riesgo, dicho por nosotros</span>
        </PanelLabel>
        <p className="mb-3 text-[15px] leading-relaxed">{pitch.riesgoQueNombramos}</p>
        <div className="border-t pt-3" style={{ borderColor: "rgba(224,72,58,0.22)" }}>
          <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">Y por qué igual funciona</div>
          <p className="text-[14.5px] leading-relaxed">{pitch.porQueIgualFunciona}</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <PanelLabel>El pedido</PanelLabel>
          <p className="text-[14.5px] leading-relaxed">{pitch.elPedido}</p>
        </Panel>
        <Panel>
          <PanelLabel>Qué damos a cambio</PanelLabel>
          <p className="text-[14.5px] leading-relaxed">{pitch.queDamosACambio}</p>
        </Panel>
      </div>

      {(pitch.destinatarioSugerido || pitch.contactosRelevantes.length > 0) && (
        <Panel>
          {pitch.destinatarioSugerido && (
            <>
              <PanelLabel>A quién llevarlo</PanelLabel>
              <p className="mb-2 text-[14.5px] leading-relaxed">{pitch.destinatarioSugerido}</p>
              {pitch.porQueEseDestinatario && (
                <p className="vin-muted mb-3 text-[13.5px] leading-relaxed">{pitch.porQueEseDestinatario}</p>
              )}
            </>
          )}
          {pitch.contactosRelevantes.length > 0 && (
            <>
              <div className="vin-faint mb-2 text-[10.5px] uppercase tracking-[0.08em]">Puentes que ya tienes</div>
              <ul className="space-y-1.5">
                {pitch.contactosRelevantes.map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                    <span className="vin-faint">→</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      )}

      {pitch.queNoDecir.length > 0 && (
        <Panel className="vin-no-print">
          <PanelLabel>Qué no decir en esta sala</PanelLabel>
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            No es ocultar el riesgo — ese va declarado arriba. Es no debilitarse con información que no aporta a esta
            conversación. Esta nota es para ti; no va en el documento.
          </p>
          <ul className="space-y-2">
            {pitch.queNoDecir.map((q, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="vin-faint">—</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {pitch.siguientePaso && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(92,201,142,0.06)", border: "1px solid rgba(92,201,142,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "#5cc98e" }}>Siguiente paso</span>
          </PanelLabel>
          <p className="text-[15px] leading-relaxed">{pitch.siguientePaso}</p>
        </div>
      )}

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

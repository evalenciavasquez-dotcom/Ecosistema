"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  VincereCancion,
  VincerePotencialCancion,
  VincereProyecto,
  VINCERE_POTENCIAL_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchSongAnalysis } from "@/lib/vincere/ai-client";
import { investigacionExterna } from "@/lib/vincere/context";
import { analizarLetra } from "@/lib/vincere/metrica";
import { formatStreams } from "@/lib/vincere/format";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import { AudioPanel, MetricaPanel, NotasProduccionPanel } from "../AudioPanel";
import EvidenceTag from "../EvidenceTag";

const POTENCIAL_COLOR: Record<VincerePotencialCancion, string> = {
  single: "#5cc98e",
  album: "#2dd4bf",
  relleno: "#e0483a",
  incierto: "#a39c92",
};

function PotencialBadge({ tipo }: { tipo: VincerePotencialCancion }) {
  const color = POTENCIAL_COLOR[tipo];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide"
      style={{ color, borderColor: `${color}66` }}
    >
      {VINCERE_POTENCIAL_LABEL[tipo]}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="vin-label mb-1.5">{label}</div>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export default function SongSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addCancion = useVincereStore((s) => s.addCancion);
  const deleteCancion = useVincereStore((s) => s.deleteCancion);
  const setCancionLetra = useVincereStore((s) => s.setCancionLetra);
  const setCancionAnalisis = useVincereStore((s) => s.setCancionAnalisis);
  const setCancionAudio = useVincereStore((s) => s.setCancionAudio);
  const setNotasProduccion = useVincereStore((s) => s.setCancionNotasProduccion);
  const addAlertas = useVincereStore((s) => s.addAlertas);
  const abrirInvestigacion = useVincereStore((s) => s.abrirInvestigacion);

  const songs = proyecto.canciones;
  const [selectedId, setSelectedId] = useState<string | null>(songs[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ nombre: "", streams: "", retencionPct: "", skipPct: "", playlistAdds: "" });

  // Selección derivada en el render: si la canción elegida desaparece (borrada),
  // cae sola en la primera disponible sin necesidad de un efecto de sincronía.
  const selected = songs.find((s) => s.id === selectedId) ?? songs[0] ?? null;
  const maxStreams = Math.max(1, ...songs.map((s) => s.streams));

  function submit() {
    if (!form.nombre.trim()) return;
    addCancion(proyecto.id, {
      nombre: form.nombre.trim(),
      streams: Number(form.streams) || 0,
      retencionPct: Number(form.retencionPct) || 0,
      skipPct: Number(form.skipPct) || 0,
      playlistAdds: Number(form.playlistAdds) || 0,
    });
    setForm({ nombre: "", streams: "", retencionPct: "", skipPct: "", playlistAdds: "" });
    setAdding(false);
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="song"
      eyebrow="Song Intelligence"
      title="Canciones"
      subtitle="El catálogo con sus métricas, y la lectura profunda de cada canción como obra: su letra, su tema y qué hacer con ella."
      aiTitle="Lectura VINCERE — Catálogo"
      emptyHint={
        songs.length === 0
          ? "Agrega canciones con su data para que la IA interprete el catálogo."
          : "Genera la lectura para interpretar qué canción es el motor del momentum y cuál está subestimada."
      }
    >
      <div className="flex justify-end">
        <button className="vin-faint text-xs hover:underline" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancelar" : "+ Agregar canción"}
        </button>
      </div>

      {adding && (
        <Panel>
          <div className="grid gap-3 md:grid-cols-5">
            <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="vin-input md:col-span-5" />
            <input placeholder="Streams" type="number" value={form.streams} onChange={(e) => setForm({ ...form, streams: e.target.value })} className="vin-input" />
            <input placeholder="Retención %" type="number" value={form.retencionPct} onChange={(e) => setForm({ ...form, retencionPct: e.target.value })} className="vin-input" />
            <input placeholder="Skip %" type="number" value={form.skipPct} onChange={(e) => setForm({ ...form, skipPct: e.target.value })} className="vin-input" />
            <input placeholder="Playlist adds" type="number" value={form.playlistAdds} onChange={(e) => setForm({ ...form, playlistAdds: e.target.value })} className="vin-input" />
            <button onClick={submit} className="vin-btn-primary">Añadir</button>
          </div>
        </Panel>
      )}

      {songs.length === 0 ? (
        <Panel>
          <p className="vin-muted text-sm">Sin canciones cargadas. Agrega la primera para activar esta sección.</p>
        </Panel>
      ) : (
        <div className="space-y-2.5">
          {songs.map((song) => {
            const active = song.id === selected?.id;
            return (
              <div
                key={song.id}
                onClick={() => setSelectedId(song.id)}
                className="grid cursor-pointer grid-cols-2 items-center gap-3 rounded-sm p-4 md:grid-cols-[1.4fr_2fr_0.7fr_0.7fr_0.7fr_0.9fr_auto]"
                style={{
                  background: active ? "rgba(224,72,58,0.08)" : "transparent",
                  border: `1px solid ${active ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
                }}
              >
                <div className="flex items-center gap-2 text-[15px]">
                  {song.analisis && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "var(--vin-accent)" }}
                      title="Canción con lectura VINCERE"
                    />
                  )}
                  {song.nombre}
                </div>
                <div className="vin-bar-track hidden h-2 md:block">
                  <div className="vin-bar-fill h-full" style={{ width: `${(song.streams / maxStreams) * 100}%` }} />
                </div>
                <div className="vin-muted text-[13px]">{formatStreams(song.streams)}</div>
                <div className="vin-muted text-[13px]">ret. {song.retencionPct}%</div>
                <div className="vin-muted text-[13px]">skip {song.skipPct}%</div>
                <div className="vin-muted text-[13px]">{song.playlistAdds} adds</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCancion(proyecto.id, song.id);
                  }}
                  className="vin-faint justify-self-end px-2 text-xs hover:underline"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <SongDetail
          key={selected.id}
          proyecto={proyecto}
          song={selected}
          onSaveLetra={(letra) => setCancionLetra(proyecto.id, selected.id, letra)}
          onAnalisis={(a) => setCancionAnalisis(proyecto.id, selected.id, a)}
          onAudio={(a) => {
            setCancionAudio(proyecto.id, selected.id, a);
            // El aviso solo tiene sentido si falta lo que no medimos, y solo
            // una vez por canción: un recordatorio que salta siempre se vuelve
            // invisible, y entonces no recuerda nada.
            const origen = `Audio · ${selected.nombre}`;
            const yaAvisado = (proyecto.alertas ?? []).some((x) => x.origen === origen);
            if (a && !selected.notasProduccion?.trim() && !yaAvisado) {
              addAlertas(proyecto.id, [
                {
                  texto: `«${selected.nombre}» ya tiene tempo, estructura y gancho medidos, pero falta lo que la plataforma no puede medir: instrumentos, mood y artistas similares. Trae el análisis externo (Cyanite o similar) y pégalo en las notas de producción de la canción.`,
                  severidad: "oportunidad",
                  seccion: "song",
                  nivel: 3,
                  origen,
                },
              ]);
            }
          }}
          onNotasProduccion={(v) => setNotasProduccion(proyecto.id, selected.id, v)}
          onInvestigar={(consulta) =>
            abrirInvestigacion(
              `Artistas similares a «${selected.nombre}» de ${proyecto.nombre}. Según el análisis de producción: ${consulta}. Quiénes son, en qué fase están, qué plazas pisan y dónde hay hueco frente a ellos.`
            )
          }
          fetchAnalysis={fetchSongAnalysis}
        />
      )}
    </SectionShell>
  );
}

function SongDetail({
  proyecto,
  song,
  onSaveLetra,
  onAnalisis,
  onAudio,
  onNotasProduccion,
  onInvestigar,
  fetchAnalysis,
}: {
  proyecto: VincereProyecto;
  song: VincereCancion;
  onSaveLetra: (letra: string) => void;
  onAnalisis: (a: NonNullable<VincereCancion["analisis"]>) => void;
  onAudio: (a: NonNullable<VincereCancion["audio"]> | null) => void;
  onNotasProduccion: (v: string) => void;
  onInvestigar: (consulta: string) => void;
  fetchAnalysis: typeof fetchSongAnalysis;
}) {
  const [letra, setLetra] = useState(song.letra ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contexto del artista para que la IA juzgue audiencia, marca y fase — no solo
  // la letra en el vacío. Es lo que convierte el análisis en lectura de director.
  const artista = useMemo(
    () => ({
      nombre: proyecto.nombre,
      genero: proyecto.genero,
      fase: proyecto.fase,
      audiencia: proyecto.audiencia,
      diagnostico: proyecto.diagnostico,
      catalogo: proyecto.canciones.map((c) => ({
        nombre: c.nombre,
        streams: c.streams,
        retencionPct: c.retencionPct,
        skipPct: c.skipPct,
        playlistAdds: c.playlistAdds,
      })),
      // Lo que se investigó afuera: sirve para juzgar si el tema se parece a
      // lo que ya está saturando el mercado o si abre un carril libre.
      investigacionExterna: investigacionExterna(proyecto, "catalogo", 2),
    }),
    [proyecto]
  );

  const analisis = song.analisis ?? null;

  async function analizar() {
    if (loading || !letra.trim()) return;
    onSaveLetra(letra);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalysis({
        cancion: {
          nombre: song.nombre,
          streams: song.streams,
          retencionPct: song.retencionPct,
          skipPct: song.skipPct,
          playlistAdds: song.playlistAdds,
        },
        letra,
        artista,
        audio: song.audio ?? undefined,
        // La métrica del estado puede estar desfasada si acaba de editar la
        // letra: se recalcula sobre lo que se está mandando de verdad.
        metrica: analizarLetra(letra) ?? undefined,
        notasProduccion: song.notasProduccion?.trim() || undefined,
      });
      onAnalisis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la canción");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="vin-serif text-xl">{song.nombre}</span>
          {analisis && <PotencialBadge tipo={analisis.clasificacionPotencial} />}
        </div>
        <span className="vin-faint text-xs">
          {song.streams > 0 ? `${formatStreams(song.streams)} · ret. ${song.retencionPct}% · skip ${song.skipPct}%` : "sin métricas"}
        </span>
      </div>

      <PanelLabel>Letra</PanelLabel>
      <textarea
        value={letra}
        onChange={(e) => setLetra(e.target.value)}
        onBlur={() => onSaveLetra(letra)}
        placeholder="Pega aquí la letra de la canción…"
        rows={8}
        className="vin-input mb-3"
        style={{ resize: "vertical", minHeight: "150px", lineHeight: "1.6" }}
      />

      {song.metrica && <MetricaPanel metrica={song.metrica} />}

      <div className="mt-4 flex items-center gap-3">
        <button onClick={analizar} disabled={loading || !letra.trim()} className="vin-btn-primary">
          {loading ? "Analizando la letra…" : analisis ? "Volver a analizar" : "Analizar canción con VINCERE"}
        </button>
        {analisis && (
          <span className="vin-faint text-xs">
            Analizada el {new Date(analisis.generadoEn).toLocaleDateString("es", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
          {error}
        </p>
      )}

      <AudioPanel audio={song.audio ?? null} onAnalizado={onAudio} onQuitar={() => onAudio(null)} />

      <NotasProduccionPanel
        key={song.id}
        notas={song.notasProduccion ?? ""}
        onGuardar={onNotasProduccion}
        onInvestigar={onInvestigar}
      />

      {analisis && (
        <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--vin-border)" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="vin-eyebrow">Lectura VINCERE — La canción</div>
            <EvidenceTag nivel={analisis.nivel} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="De qué habla de verdad">{analisis.tema}</Field>
            <Field label="Arco emocional">{analisis.arcoEmocional}</Field>
            <Field label="El gancho">{analisis.gancho}</Field>
            <Field label="A qué audiencia le habla">{analisis.audiencia}</Field>
            <Field label="Fit con la marca">{analisis.fitMarca}</Field>
            <Field label="Potencial">{analisis.potencial}</Field>
            {analisis.sonido && (
              <div className="md:col-span-2">
                <Field label="Cómo está construida sonoramente">{analisis.sonido}</Field>
              </div>
            )}
          </div>

          {analisis.reescrituras.length > 0 && (
            <div className="mt-4">
              <div className="vin-label mb-1.5">Qué reescribiría</div>
              <ul className="space-y-1.5">
                {analisis.reescrituras.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span style={{ color: "var(--vin-accent)" }}>—</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="mt-4 rounded-sm p-4"
            style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.25)" }}
          >
            <div className="vin-label mb-1.5" style={{ color: "var(--vin-accent)" }}>
              La decisión
            </div>
            <p className="text-sm leading-relaxed">{analisis.decision}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}

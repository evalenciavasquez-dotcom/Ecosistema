"use client";

import { useState } from "react";
import { VincereProyecto } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { formatStreams } from "@/lib/vincere/format";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

export default function SongSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addCancion = useVincereStore((s) => s.addCancion);
  const deleteCancion = useVincereStore((s) => s.deleteCancion);
  const [selected, setSelected] = useState(0);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ nombre: "", streams: "", retencionPct: "", skipPct: "", playlistAdds: "" });

  const songs = proyecto.canciones;
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
      subtitle="Catálogo con streams, retención, skip y playlist adds. La lectura VINCERE interpreta el catálogo completo."
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
          {songs.map((song, i) => {
            const active = i === selected;
            return (
              <div
                key={song.id}
                onClick={() => setSelected(i)}
                className="grid cursor-pointer grid-cols-2 items-center gap-3 rounded-sm p-4 md:grid-cols-[1.4fr_2fr_0.7fr_0.7fr_0.7fr_0.9fr_auto]"
                style={{
                  background: active ? "rgba(224,72,58,0.08)" : "transparent",
                  border: `1px solid ${active ? "rgba(224,72,58,0.4)" : "var(--vin-border)"}`,
                }}
              >
                <div className="text-[15px]">{song.nombre}</div>
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
    </SectionShell>
  );
}

"use client";

import { useRef, useState } from "react";
import { VincereAudioAnalisis, VincereLetraMetrica } from "@/lib/vincere/types";
import { analizarAudio, describirTextura } from "@/lib/vincere/audio";
import { PanelLabel } from "./primitives";

function mmss(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Dato({ valor, etiqueta, nota }: { valor: string; etiqueta: string; nota?: string }) {
  return (
    <div>
      <div className="vin-serif text-xl leading-none">{valor}</div>
      <div className="vin-faint mt-1.5 text-[10.5px] uppercase tracking-wide">{etiqueta}</div>
      {nota && <div className="vin-faint mt-0.5 text-[10.5px]">{nota}</div>}
    </div>
  );
}

// La curva de energía con las fronteras de sección y el gancho marcado. Es la
// forma de la canción vista de un golpe: dónde arranca floja, dónde levanta y
// si el momento fuerte llega tarde.
function CurvaEnergia({ audio }: { audio: VincereAudioAnalisis }) {
  const puntos = audio.curvaEnergia;
  const ancho = 100;
  const alto = 100;
  const paso = puntos.length > 1 ? ancho / (puntos.length - 1) : ancho;
  const linea = puntos.map((v, i) => `${(i * paso).toFixed(2)},${(alto - v).toFixed(2)}`).join(" ");
  const area = `0,${alto} ${linea} ${ancho},${alto}`;
  const pct = (seg: number) => Math.max(0, Math.min(100, (seg / Math.max(1, audio.duracionSeg)) * 100));

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" className="h-24 w-full" aria-hidden>
        <polygon points={area} fill="rgba(224,72,58,0.16)" />
        <polyline points={linea} fill="none" stroke="var(--vin-accent)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {audio.secciones.slice(1).map((s) => (
          <line
            key={s.inicioSeg}
            x1={pct(s.inicioSeg)}
            x2={pct(s.inicioSeg)}
            y1="0"
            y2={alto}
            stroke="var(--vin-border-strong)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {audio.ganchoSeg !== null && (
          <line
            x1={pct(audio.ganchoSeg)}
            x2={pct(audio.ganchoSeg)}
            y1="0"
            y2={alto}
            stroke="#5cc98e"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="vin-faint mt-1 flex justify-between text-[10.5px] tabular-nums">
        <span>0:00</span>
        {audio.ganchoSeg !== null && (
          <span style={{ color: "#5cc98e" }}>gancho en {mmss(audio.ganchoSeg)}</span>
        )}
        <span>{mmss(audio.duracionSeg)}</span>
      </div>
    </div>
  );
}

export function AudioPanel({
  audio,
  onAnalizado,
  onQuitar,
}: {
  audio: VincereAudioAnalisis | null;
  onAnalizado: (a: VincereAudioAnalisis) => void;
  onQuitar: () => void;
}) {
  const [etapa, setEtapa] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function procesar(archivo: File) {
    setError(null);
    setEtapa("Preparando…");
    try {
      // El archivo se decodifica y se mide aquí mismo: nunca se sube.
      const resultado = await analizarAudio(archivo, setEtapa);
      onAnalizado(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar el audio");
    } finally {
      setEtapa(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--vin-border)" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <PanelLabel>Audio</PanelLabel>
        {audio && (
          <button onClick={onQuitar} className="vin-faint text-xs hover:underline">
            Quitar análisis
          </button>
        )}
      </div>

      {!audio && !etapa && (
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
            if (f) procesar(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-sm p-5 text-center transition-colors"
          style={{
            border: `1px dashed ${arrastrando ? "var(--vin-accent)" : "var(--vin-border-strong)"}`,
            background: arrastrando ? "rgba(224,72,58,0.06)" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) procesar(f);
            }}
          />
          <p className="vin-muted text-sm">Suelta aquí el MP3 o WAV de la canción, o haz clic para elegirlo</p>
          <p className="vin-faint mt-1.5 text-xs">
            Se analiza en tu navegador y el archivo no se sube a ningún servidor.
          </p>
        </div>
      )}

      {etapa && (
        <div className="rounded-sm p-5 text-center" style={{ border: "1px dashed var(--vin-border-strong)" }}>
          <p className="text-sm">{etapa}</p>
          <p className="vin-faint mt-1.5 text-xs">Un tema de tres minutos tarda unos segundos.</p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
          {error}
        </p>
      )}

      {audio && !etapa && (
        <div className="space-y-4">
          <CurvaEnergia audio={audio} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Dato
              valor={audio.bpm > 0 ? String(Math.round(audio.bpm)) : "—"}
              etiqueta="BPM"
              nota={
                audio.bpm > 0
                  ? audio.bpmConfianza >= 0.6
                    ? "pulso claro"
                    : audio.bpmConfianza >= 0.3
                      ? "pulso irregular"
                      : "poco fiable"
                  : "sin pulso detectable"
              }
            />
            <Dato valor={audio.tonalidad ?? "—"} etiqueta="Tonalidad" nota={audio.tonalidad ? undefined : "no concluyente"} />
            <Dato
              valor={audio.ganchoSeg !== null ? mmss(audio.ganchoSeg) : "—"}
              etiqueta="Entra el gancho"
              nota={audio.ganchoSeg !== null ? `de ${mmss(audio.duracionSeg)}` : "sin pico claro"}
            />
            <Dato valor={`${audio.rangoDinamico} dB`} etiqueta="Rango dinámico" nota={`${audio.secciones.length} secciones`} />
          </div>

          <div>
            <div className="vin-label mb-1.5">Textura</div>
            <p className="vin-muted text-[13.5px] leading-relaxed">{describirTextura(audio)}</p>
          </div>

          {/* Lo que la medición no alcanza, dicho donde importa: justo después
              de ver el resultado, no escondido en la documentación. */}
          <div
            className="rounded-sm p-4"
            style={{ background: "rgba(224,168,58,0.07)", border: "1px solid rgba(224,168,58,0.28)" }}
          >
            <div className="vin-label mb-1.5" style={{ color: "#e0a83a" }}>
              Lo que esto no mide
            </div>
            <p className="text-[13px] leading-relaxed">
              La textura describe el espectro, no reconoce instrumentos: el sistema puede decir que el tema es oscuro
              y con base pesada, no que haya una guitarra. Tampoco da mood, género ni artistas similares.
            </p>
            <p className="vin-muted mt-2 text-[12.5px] leading-relaxed">
              Si tienes el análisis de un servicio externo (Cyanite, Music.ai) o las notas del productor, pégalas
              abajo: la lectura de la canción las cruzará con lo medido aquí.
            </p>
          </div>

          <p className="vin-faint text-[11px]">
            {audio.archivo} · analizado el{" "}
            {new Date(audio.analizadoEn).toLocaleDateString("es", { day: "numeric", month: "short" })}
          </p>
        </div>
      )}
    </div>
  );
}

// Lo que el análisis propio no puede medir y llega de fuera. No se distingue
// entre servicio y oído humano a propósito: para el sistema ambas son
// observación externa, y ambas se marcan como tales frente a lo medido.
export function NotasProduccionPanel({
  notas,
  onGuardar,
  onInvestigar,
}: {
  notas: string;
  onGuardar: (v: string) => void;
  onInvestigar: (consulta: string) => void;
}) {
  const [valor, setValor] = useState(notas);

  return (
    <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--vin-border)" }}>
      <PanelLabel>Análisis externo y notas de producción</PanelLabel>
      <textarea
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => onGuardar(valor)}
        rows={4}
        placeholder="Instrumentos, mood, género, artistas similares… lo que traigas de Cyanite, de Music.ai o del productor."
        className="vin-input"
        style={{ resize: "vertical", lineHeight: "1.6" }}
      />
      <p className="vin-faint mt-2 text-[11.5px] leading-relaxed">
        Entra a la lectura marcado como observación externa, nunca como algo medido por la plataforma.
      </p>
      {valor.trim().length > 8 && (
        <button
          onClick={() => onInvestigar(valor.trim())}
          className="vin-btn-ghost mt-3"
          style={{ padding: "5px 11px", fontSize: "12px" }}
        >
          Investigar los artistas similares →
        </button>
      )}
    </div>
  );
}

// La métrica no tiene botón: se calcula sola al guardar la letra, porque
// contar sílabas es una regla y no una interpretación.
export function MetricaPanel({ metrica }: { metrica: VincereLetraMetrica }) {
  const TIPO: Record<VincereLetraMetrica["tipoRima"], string> = {
    consonante: "Rima consonante",
    asonante: "Rima asonante",
    mixta: "Rima mixta",
    libre: "Verso libre",
  };

  return (
    <div className="mt-4 rounded-sm p-4" style={{ border: "1px solid var(--vin-border)" }}>
      <PanelLabel>Métrica de la letra</PanelLabel>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dato
          valor={metrica.metricaDominante ? String(metrica.metricaDominante) : "—"}
          etiqueta="Sílabas por verso"
          nota={`media ${metrica.silabasMedia}`}
        />
        <Dato
          valor={`${metrica.regularidad}%`}
          etiqueta="Regularidad"
          nota={metrica.regularidad >= 70 ? "métrica firme" : metrica.regularidad >= 45 ? "métrica flexible" : "métrica libre"}
        />
        <Dato valor={metrica.esquemaRima.slice(0, 8) || "—"} etiqueta="Esquema" nota={TIPO[metrica.tipoRima]} />
        <Dato
          valor={`${metrica.densidadLexica}%`}
          etiqueta="Densidad léxica"
          nota={metrica.densidadLexica <= 40 ? "muy repetitiva" : metrica.densidadLexica >= 60 ? "narrativa" : "equilibrada"}
        />
      </div>
      {metrica.repeticiones.length > 0 && (
        <p className="vin-faint mt-3 text-[11.5px] leading-relaxed">
          Verso más repetido: «{metrica.repeticiones[0].texto}» ×{metrica.repeticiones[0].veces} · {metrica.versos} versos,{" "}
          {metrica.palabrasTotal} palabras
        </p>
      )}
    </div>
  );
}

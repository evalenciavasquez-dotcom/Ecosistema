"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CaptureBar() {
  const pathname = usePathname();
  const addBandejaItem = useAppStore((s) => s.addBandejaItem);

  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  // La Bandeja ya tiene su propio cuadro de captura grande.
  if (pathname.startsWith("/bandeja")) return null;

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  }

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Este navegador no soporta dictado por voz. Prueba con Chrome.");
      setTimeout(() => setError(null), 3500);
      return;
    }
    baseTextRef.current = texto ? texto + " " : "";
    rec.lang = "es-CO";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setTexto(baseTextRef.current + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const nota = texto.trim();

    if (file) {
      setBusy(true);
      try {
        const data = await fileToBase64(file);
        const res = await fetch("/api/interpret-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, mediaType: file.type, nota: nota || undefined }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body.error ?? "No se pudo leer el archivo");
          setBusy(false);
          return;
        }
        const resumen = `[${file.name}] ${body.result}`;
        addBandejaItem(nota ? `${nota}\n${resumen}` : resumen);
        showFeedback("Archivo leído y enviado a la Bandeja");
      } catch {
        setError("No se pudo leer el archivo");
        setBusy(false);
        return;
      }
      setBusy(false);
      setFile(null);
      setTexto("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!nota) return;
    addBandejaItem(nota);
    setTexto("");
    showFeedback("Enviado a la Bandeja para análisis");
  }

  return (
    <div
      className="border-t border-border-subtle bg-surface px-3 py-2.5 md:px-5"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      {(feedback || error) && (
        <div className={`mb-2 text-xs ${error ? "text-accent-red" : "text-accent-green"}`}>
          {error ?? feedback}
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-surface-2 border border-border-subtle px-3 py-1 truncate max-w-60">
            📎 {file.name}
          </span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-accent-red"
          >
            Quitar
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 border border-border-subtle text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Adjuntar foto o PDF"
          title="Adjuntar foto o PDF"
        >
          📎
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={listening ? "Escuchando…" : "Escribe, pega o dicta cualquier novedad…"}
          disabled={busy}
          className="min-w-0 flex-1 rounded-full bg-surface-2 border border-border-subtle px-4 py-2.5 text-sm outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={toggleVoice}
          disabled={busy}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border disabled:opacity-40 ${
            listening
              ? "bg-accent-red text-white border-accent-red animate-pulse"
              : "bg-surface-2 border-border-subtle text-muted hover:text-foreground"
          }`}
          aria-label={listening ? "Detener dictado" : "Dictar por voz"}
          title={listening ? "Detener dictado" : "Dictar por voz"}
        >
          🎤
        </button>
        <button
          type="submit"
          disabled={busy || (!texto.trim() && !file)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue text-white disabled:opacity-40"
          aria-label="Enviar a la Bandeja"
          title="Enviar a la Bandeja"
        >
          {busy ? "…" : "→"}
        </button>
      </form>
    </div>
  );
}

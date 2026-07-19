"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { BandejaEstadoBadge } from "@/components/ui/badges";
import { BANDEJA_DESTINO_LABEL, BandejaDestino, BandejaItem } from "@/lib/types";
import { proyectoNombre } from "@/lib/selectors";

const ESTADOS_ORDEN = ["Nuevo", "En análisis", "Necesita confirmación", "Procesado", "Descartado"] as const;

function BandejaContent() {
  const params = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Share target de la PWA: texto compartido desde otra app (p. ej. WhatsApp)
  // llega como ?text=...&title=...&url=... — se precarga en el cuadro para que
  // Eduardo lo revise y lo envíe, nunca se registra solo.
  const [texto, setTexto] = useState(() =>
    [params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n").trim()
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("Todos");

  const bandeja = useAppStore((s) => s.bandeja);
  const proyectos = useAppStore((s) => s.proyectos);
  const addBandejaItem = useAppStore((s) => s.addBandejaItem);
  const approveBandejaItem = useAppStore((s) => s.approveBandejaItem);
  const discardBandejaItem = useAppStore((s) => s.discardBandejaItem);
  const reclassifyBandejaItem = useAppStore((s) => s.reclassifyBandejaItem);

  useEffect(() => {
    if (params.get("focus") === "1") textareaRef.current?.focus();
  }, [params]);

  useEffect(() => {
    if (params.get("text") || params.get("title") || params.get("url")) {
      textareaRef.current?.focus();
      window.history.replaceState(null, "", "/bandeja");
    }
  }, [params]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = texto.trim();
    if (!trimmed) return;
    addBandejaItem(trimmed);
    setTexto("");
  }

  const items = bandeja.filter((b) => filtro === "Todos" || b.estado === filtro);

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border-subtle bg-surface p-4">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cuéntale al sistema qué pasó — una idea, un pago, una novedad de un proyecto..."
          rows={3}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!texto.trim()}
            className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-40 transition-opacity"
          >
            Enviar a análisis
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {["Todos", ...ESTADOS_ORDEN].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              filtro === f
                ? "bg-surface-2 border-accent-blue text-foreground"
                : "border-border-subtle text-muted hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted">No hay elementos en este estado.</p>}
        {items.map((item) => (
          <BandejaCard
            key={item.id}
            item={item}
            proyectoLabel={proyectoNombre(proyectos, item.clasificacion.proyectoId)}
            editing={editingId === item.id}
            onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
            onApprove={() => approveBandejaItem(item.id)}
            onDiscard={() => discardBandejaItem(item.id)}
            onReclassify={(destino) => {
              reclassifyBandejaItem(item.id, { destino });
              setEditingId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BandejaCard({
  item,
  proyectoLabel,
  editing,
  onToggleEdit,
  onApprove,
  onDiscard,
  onReclassify,
}: {
  item: BandejaItem;
  proyectoLabel: string;
  editing: boolean;
  onToggleEdit: () => void;
  onApprove: () => void;
  onDiscard: () => void;
  onReclassify: (destino: BandejaDestino) => void;
}) {
  const procesado = item.estado === "Procesado" || item.estado === "Descartado";
  const c = item.clasificacion;
  const previewEconomia =
    c.destino === "economia" && !procesado
      ? c.monto
        ? `Se registrará: ${c.tipoMovimiento === "gasto" ? "gasto" : "ingreso"} de ${c.monto.toLocaleString("es-CO")} ${c.moneda ?? "USD"}${c.cuenta ? ` · ${c.cuenta}` : ""}`
        : "No se detectó un monto claro — quedará en $0, corrígelo en Economía después de aprobar"
      : null;
  const previewEvento =
    c.destino === "evento" && !procesado
      ? `Se registrará en agenda${c.fechaEvento ? ` · ${c.fechaEvento}` : ""}${c.horaEvento ? ` ${c.horaEvento}` : ""}`
      : null;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug">{item.texto}</p>
        <BandejaEstadoBadge estado={item.estado} />
      </div>
      <div className="text-xs text-muted mt-2">
        IA: {BANDEJA_DESTINO_LABEL[item.clasificacion.destino]} — {item.clasificacion.razon}
        {proyectoLabel !== "Sin proyecto" && <> · {proyectoLabel}</>}
      </div>
      {previewEconomia && (
        <div className={`text-xs mt-1 ${c.monto ? "text-muted" : "text-accent-amber"}`}>{previewEconomia}</div>
      )}
      {previewEvento && <div className="text-xs text-muted mt-1">{previewEvento}</div>}
      {item.resultadoLabel && <div className="text-xs text-accent-green mt-1">{item.resultadoLabel}</div>}

      {editing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(BANDEJA_DESTINO_LABEL) as BandejaDestino[]).map((destino) => (
            <button
              key={destino}
              onClick={() => onReclassify(destino)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                item.clasificacion.destino === destino
                  ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {BANDEJA_DESTINO_LABEL[destino]}
            </button>
          ))}
        </div>
      )}

      {!procesado && (
        <div className="flex items-center gap-4 mt-3">
          <button onClick={onApprove} className="text-xs font-medium text-accent-blue">
            Aprobar
          </button>
          <button onClick={onToggleEdit} className="text-xs font-medium text-muted hover:text-foreground">
            Corregir clasificación
          </button>
          <button onClick={onDiscard} className="text-xs font-medium text-accent-red ml-auto">
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}

export default function BandejaPage() {
  return (
    <Suspense>
      <BandejaContent />
    </Suspense>
  );
}

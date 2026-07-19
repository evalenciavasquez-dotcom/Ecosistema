"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { BandejaEstadoBadge } from "@/components/ui/badges";
import { BANDEJA_DESTINO_LABEL, BandejaDestino, BandejaItem, ClasificacionSugerida, Proyecto } from "@/lib/types";
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
  const [dividiendo, setDividiendo] = useState(false);
  const [errorDividir, setErrorDividir] = useState("");

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

  async function handleBulkSubmit() {
    const trimmed = texto.trim();
    if (!trimmed) return;
    setDividiendo(true);
    setErrorDividir("");
    try {
      const res = await fetch("/api/split-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorDividir(body.error ?? "No se pudo dividir el texto");
        return;
      }
      const fragmentos: string[] = body.result?.fragmentos ?? [];
      if (fragmentos.length === 0) {
        setErrorDividir("No se encontraron novedades separables en el texto");
        return;
      }
      fragmentos.forEach((f) => addBandejaItem(f));
      setTexto("");
    } catch {
      setErrorDividir("Error de conexión al dividir el texto");
    } finally {
      setDividiendo(false);
    }
  }

  const items = bandeja.filter((b) => filtro === "Todos" || b.estado === filtro);

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border-subtle bg-surface p-4">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cuéntale al sistema qué pasó — una idea, un pago, una novedad de un proyecto... o pega un resumen largo con varias novedades de golpe."
          rows={4}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
        />
        {errorDividir && <div className="text-xs text-accent-red mt-1">{errorDividir}</div>}
        <div className="flex justify-end items-center gap-3 mt-1">
          {texto.trim().length > 150 && (
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={dividiendo}
              className="text-xs font-medium text-muted hover:text-foreground disabled:opacity-40"
            >
              {dividiendo ? "Dividiendo…" : "Dividir en varios ítems"}
            </button>
          )}
          <button
            type="submit"
            disabled={!texto.trim() || dividiendo}
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
            proyectos={proyectos}
            proyectoLabel={proyectoNombre(proyectos, item.clasificacion.proyectoId)}
            editing={editingId === item.id}
            onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
            onApprove={() => approveBandejaItem(item.id)}
            onDiscard={() => discardBandejaItem(item.id)}
            onReclassify={(patch) => {
              reclassifyBandejaItem(item.id, patch);
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
  proyectos,
  proyectoLabel,
  editing,
  onToggleEdit,
  onApprove,
  onDiscard,
  onReclassify,
}: {
  item: BandejaItem;
  proyectos: Proyecto[];
  proyectoLabel: string;
  editing: boolean;
  onToggleEdit: () => void;
  onApprove: () => void;
  onDiscard: () => void;
  onReclassify: (patch: Partial<ClasificacionSugerida>) => void;
}) {
  const procesado = item.estado === "Procesado" || item.estado === "Descartado";
  const clasificando = item.estado === "En análisis";
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
        <CorreccionForm item={item} proyectos={proyectos} onSave={onReclassify} onCancel={onToggleEdit} />
      )}

      {!procesado && clasificando && (
        <div className="text-xs text-muted mt-3 italic">
          Clasificando con IA — espera un momento antes de aprobar, para que no se te escape un dato real.
        </div>
      )}

      {!procesado && !clasificando && (
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

function CorreccionForm({
  item,
  proyectos,
  onSave,
  onCancel,
}: {
  item: BandejaItem;
  proyectos: Proyecto[];
  onSave: (patch: Partial<ClasificacionSugerida>) => void;
  onCancel: () => void;
}) {
  const c = item.clasificacion;
  const [destino, setDestino] = useState<BandejaDestino>(c.destino);
  const [proyectoId, setProyectoId] = useState<string>(c.proyectoId ?? "");
  const [monto, setMonto] = useState(c.monto ? String(c.monto) : "");
  const [moneda, setMoneda] = useState(c.moneda ?? "USD");
  const [cuenta, setCuenta] = useState(c.cuenta ?? "");
  const [tipoMovimiento, setTipoMovimiento] = useState<"ingreso" | "gasto">(c.tipoMovimiento ?? "ingreso");
  const [fechaEvento, setFechaEvento] = useState(c.fechaEvento ?? "");
  const [horaEvento, setHoraEvento] = useState(c.horaEvento ?? "");

  function handleSave() {
    const patch: Partial<ClasificacionSugerida> = { destino, proyectoId: proyectoId || null };
    if (destino === "economia") {
      patch.monto = monto ? Number(monto) : null;
      patch.moneda = moneda;
      patch.cuenta = cuenta || null;
      patch.tipoMovimiento = tipoMovimiento;
    }
    if (destino === "evento") {
      patch.fechaEvento = fechaEvento || null;
      patch.horaEvento = horaEvento || null;
    }
    onSave(patch);
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-surface-2 p-3">
      <div>
        <div className="text-[11px] text-muted mb-1.5">Tipo</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BANDEJA_DESTINO_LABEL) as BandejaDestino[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDestino(d)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                destino === d
                  ? "bg-accent-blue/20 border-accent-blue text-accent-blue"
                  : "border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {BANDEJA_DESTINO_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] text-muted mb-1.5">Proyecto</div>
        <select
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
          className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
        >
          <option value="">Sin proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {destino === "economia" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] text-muted mb-1.5">Monto</div>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1.5">Moneda</div>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
            >
              <option value="USD">USD</option>
              <option value="COP">COP</option>
            </select>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1.5">Tipo de movimiento</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoMovimiento("ingreso")}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  tipoMovimiento === "ingreso"
                    ? "bg-accent-green/15 border-accent-green text-accent-green"
                    : "border-border-subtle text-muted"
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setTipoMovimiento("gasto")}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                  tipoMovimiento === "gasto"
                    ? "bg-accent-red/15 border-accent-red text-accent-red"
                    : "border-border-subtle text-muted"
                }`}
              >
                Gasto
              </button>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1.5">Cuenta</div>
            <input
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value)}
              placeholder="Ej. Cuenta bancaria"
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
            />
          </div>
        </div>
      )}

      {destino === "evento" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] text-muted mb-1.5">Fecha</div>
            <input
              type="date"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1.5">Hora</div>
            <input
              type="time"
              value={horaEvento}
              onChange={(e) => setHoraEvento(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border-subtle px-3 py-2 text-xs outline-none focus:border-accent-blue"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="text-xs text-muted">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-accent-blue text-white text-xs font-medium px-3 py-1.5"
        >
          Guardar
        </button>
      </div>
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

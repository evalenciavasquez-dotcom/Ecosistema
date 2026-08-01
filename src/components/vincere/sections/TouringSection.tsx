"use client";

import { useState } from "react";
import {
  VincereProyecto,
  VincereShow,
  VincereTouringDiagnostico,
  VincereVeredictoPlaza,
  VINCERE_VEREDICTO_PLAZA_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchTouring } from "@/lib/vincere/ai-client";
import { buildTouringContext } from "@/lib/vincere/context";
import { monedaDe } from "@/lib/vincere/dinero";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const VEREDICTO_COLOR: Record<VincereVeredictoPlaza, string> = {
  ir: "#5cc98e",
  probar: "#2dd4bf",
  esperar: "#e0a83a",
  no: "#e0483a",
};

// Media sala llena se ve peor que una sala chica agotada, y el umbral donde
// eso empieza a notarse está alrededor del 70%.
function conversionColor(pct: number): string {
  if (pct >= 90) return "#5cc98e";
  if (pct >= 70) return "#2dd4bf";
  if (pct >= 50) return "#e0a83a";
  return "#e0483a";
}

const HOY = new Date().toISOString().slice(0, 10);

export default function TouringSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addShow = useVincereStore((s) => s.addShow);
  const updateShow = useVincereStore((s) => s.updateShow);
  const deleteShow = useVincereStore((s) => s.deleteShow);
  const setDiagnostico = useVincereStore((s) => s.setTouringDiagnostico);
  const showToast = useVincereStore((s) => s.showToast);

  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  const shows = proyecto.shows ?? [];
  const diag = proyecto.touringDiagnostico;

  async function analizar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchTouring({ artista: buildTouringContext(proyecto), nota });
      setDiagnostico(proyecto.id, r);
      setNota("");
      showToast("Diagnóstico de plazas generado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar las plazas");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="touring"
      eyebrow="Shows y Touring"
      title="Dónde conviene tocar"
      subtitle="Zonas de Calor dice dónde te escuchan. Este motor responde lo que esa data insinúa y no contesta: dónde conviene tocar — y dónde sería un error. Escuchar es gratis; una entrada no."
      aiTitle="Lectura VINCERE — Touring"
    >
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <PanelLabel>Shows realizados</PanelLabel>
          <button onClick={() => setAgregando((v) => !v)} className="vin-faint text-xs hover:underline">
            {agregando ? "Cancelar" : "+ Registrar show"}
          </button>
        </div>
        <p className="vin-faint mb-3 text-xs leading-relaxed">
          La única evidencia dura de convocatoria. Un millón de reproducciones no dice cuánta gente cruza la ciudad
          para verte; una sala agotada sí.
        </p>

        {agregando && (
          <FormularioShow
            proyectoId={proyecto.id}
            monedaProyecto={monedaDe(proyecto)}
            onAdd={addShow}
            onListo={() => setAgregando(false)}
          />
        )}

        {shows.length === 0 && !agregando && (
          <Panel>
            <p className="vin-muted text-sm">
              Sin shows registrados. El motor funciona igual, pero sin conversión medida todo lo que diga sobre
              convocatoria es estimación desde streaming — y lo va a decir con nivel de evidencia bajo.
            </p>
          </Panel>
        )}

        <div className="space-y-2.5">
          {shows.map((s) => (
            <FilaShow
              key={s.id}
              show={s}
              onUpdate={(patch) => updateShow(proyecto.id, s.id, patch)}
              onDelete={() => deleteShow(proyecto.id, s.id)}
            />
          ))}
        </div>
      </section>

      <Panel>
        <PanelLabel>Evaluar las plazas</PanelLabel>
        <p className="vin-faint mb-3 text-xs leading-relaxed">
          Cruza el mapa de calor, la conversión real de los shows y lo que se haya investigado de cada plaza.
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Algo puntual: «me ofrecen fecha en Bogotá en octubre», «quiero salir en verano» (opcional)"
          className="vin-input mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={analizar} disabled={cargando} className="vin-btn-primary">
            {cargando ? "Cruzando calor y convocatoria…" : diag ? "Volver a evaluar" : "Evaluar plazas"}
          </button>
          {cargando && <span className="vin-faint text-xs">Ordenando ruta y buscando plazas trampa.</span>}
        </div>
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {diag && <DiagnosticoTouring diag={diag} onEliminar={() => setDiagnostico(proyecto.id, null)} />}
    </SectionShell>
  );
}

function FormularioShow({
  proyectoId,
  monedaProyecto,
  onAdd,
  onListo,
}: {
  proyectoId: string;
  monedaProyecto: string;
  onAdd: (id: string, show: Omit<VincereShow, "id">) => void;
  onListo: () => void;
}) {
  const [f, setF] = useState({
    ciudad: "",
    fecha: HOY,
    sala: "",
    aforo: "",
    asistencia: "",
    ingresoNeto: "",
    moneda: monedaProyecto,
    nota: "",
  });

  const valido = f.ciudad.trim() && f.aforo && f.asistencia;

  function guardar() {
    if (!valido) return;
    onAdd(proyectoId, {
      ciudad: f.ciudad.trim(),
      fecha: f.fecha,
      sala: f.sala.trim(),
      aforo: Number(f.aforo) || 0,
      asistencia: Number(f.asistencia) || 0,
      ingresoNeto: f.ingresoNeto ? Number(f.ingresoNeto) : null,
      moneda: f.moneda.trim() || monedaProyecto,
      nota: f.nota.trim(),
    });
    onListo();
  }

  return (
    <Panel className="mb-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Campo label="Ciudad" valor={f.ciudad} onChange={(v) => setF({ ...f, ciudad: v })} />
        <Campo label="Fecha" valor={f.fecha} onChange={(v) => setF({ ...f, fecha: v })} tipo="date" />
        <Campo label="Sala" valor={f.sala} onChange={(v) => setF({ ...f, sala: v })} />
        <Campo label="Aforo" valor={f.aforo} onChange={(v) => setF({ ...f, aforo: v })} tipo="number" />
        <Campo label="Asistencia" valor={f.asistencia} onChange={(v) => setF({ ...f, asistencia: v })} tipo="number" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Campo
            label="Ingreso neto"
            valor={f.ingresoNeto}
            onChange={(v) => setF({ ...f, ingresoNeto: v })}
            tipo="number"
          />
          <Campo label="Moneda" valor={f.moneda} onChange={(v) => setF({ ...f, moneda: v })} ancho="w-20" />
        </div>
      </div>
      <div className="mt-3">
        <Campo
          label="Nota"
          valor={f.nota}
          onChange={(v) => setF({ ...f, nota: v })}
          placeholder="Cómo estuvo: agotado con anticipación, mucha reventa sin vender, primera vez sin prensa…"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={guardar} disabled={!valido} className="vin-btn-primary">
          Guardar show
        </button>
        <button onClick={onListo} className="vin-btn-ghost">
          Cancelar
        </button>
      </div>
    </Panel>
  );
}

function Campo({
  label,
  valor,
  onChange,
  tipo = "text",
  placeholder,
  ancho = "",
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  placeholder?: string;
  ancho?: string;
}) {
  return (
    <div className={ancho}>
      <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">{label}</div>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="vin-input"
      />
    </div>
  );
}

function FilaShow({
  show,
  onUpdate,
  onDelete,
}: {
  show: VincereShow;
  onUpdate: (patch: Partial<VincereShow>) => void;
  onDelete: () => void;
}) {
  const pct = show.aforo > 0 ? Math.round((show.asistencia / show.aforo) * 100) : 0;
  const color = conversionColor(pct);

  return (
    <div className="vin-card border-l-2 p-4" style={{ borderLeftColor: color }}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-[15px] font-medium">{show.ciudad}</span>
          {show.sala && <span className="vin-muted text-[13px]">{show.sala}</span>}
          <span className="vin-faint text-[11.5px] tabular-nums">{show.fecha}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-[13px]">
            <span style={{ color }}>{show.asistencia}</span>
            <span className="vin-faint"> / {show.aforo}</span>
          </span>
          <span className="vin-serif text-lg tabular-nums" style={{ color }}>
            {pct}%
          </span>
          <button onClick={onDelete} className="vin-faint px-1 text-xs hover:underline" title="Eliminar">
            ✕
          </button>
        </div>
      </div>

      <div className="vin-bar-track mb-2.5 h-1.5">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>

      {show.ingresoNeto != null && (
        <div className="vin-faint mb-2 text-[11.5px] tabular-nums">
          Neto: {show.ingresoNeto.toLocaleString("es")} {show.moneda}
        </div>
      )}

      <textarea
        value={show.nota}
        onChange={(e) => onUpdate({ nota: e.target.value })}
        rows={1}
        placeholder="Cómo estuvo la noche — la IA lo lee para entender por qué convirtió o no"
        className="vin-input resize-none text-[13px]"
      />
    </div>
  );
}

function DiagnosticoTouring({
  diag,
  onEliminar,
}: {
  diag: VincereTouringDiagnostico;
  onEliminar: () => void;
}) {
  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="vin-eyebrow mb-2">Diagnóstico de plazas</div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="rounded-sm px-2.5 py-1 text-[12px] font-medium"
                style={{
                  color: diag.listoParaGira ? "#5cc98e" : "#e0a83a",
                  border: `1px solid ${diag.listoParaGira ? "#5cc98e" : "#e0a83a"}66`,
                  background: diag.listoParaGira ? "rgba(92,201,142,0.10)" : "rgba(224,168,58,0.10)",
                }}
              >
                {diag.listoParaGira ? "Listo para salir" : "Todavía no para una gira"}
              </span>
              <EvidenceTag nivel={diag.nivelGlobal} />
            </div>
          </div>
          <button onClick={onEliminar} className="vin-faint vin-no-print px-1 text-xs hover:underline" title="Eliminar">
            ✕
          </button>
        </div>
        <p className="text-[15px] leading-relaxed">{diag.lecturaGeneral}</p>
        <p className="vin-faint mt-2.5 text-xs">
          Generado el{" "}
          {new Date(diag.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {diag.plazas.length > 0 && (
        <section>
          <PanelLabel>Plaza por plaza</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {diag.plazas.map((pl, i) => (
              <div
                key={i}
                className="vin-card border-l-2 p-4"
                style={{ borderLeftColor: VEREDICTO_COLOR[pl.veredicto] }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-medium">{pl.ciudad}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                    style={{
                      color: VEREDICTO_COLOR[pl.veredicto],
                      borderColor: `${VEREDICTO_COLOR[pl.veredicto]}66`,
                    }}
                  >
                    {VINCERE_VEREDICTO_PLAZA_LABEL[pl.veredicto]}
                  </span>
                  <EvidenceTag nivel={pl.nivel} />
                </div>
                <p className="mb-2.5 text-[14px] leading-relaxed">{pl.lectura}</p>
                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="rounded-sm p-3" style={{ background: "var(--vin-surface)" }}>
                    <div className="vin-faint mb-1 text-[10.5px] uppercase tracking-[0.08em]">Sala que aguanta</div>
                    <p className="text-[13.5px] leading-relaxed">{pl.tamanoSala}</p>
                  </div>
                  <div className="rounded-sm p-3" style={{ background: "var(--vin-surface)" }}>
                    <div className="vin-faint mb-1 text-[10.5px] uppercase tracking-[0.08em]">
                      De escucha a asistencia
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{pl.senalDeConversion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {diag.ruta.length > 0 && (
        <section>
          <PanelLabel>Ruta sugerida</PanelLabel>
          <p className="vin-faint mb-3 text-xs leading-relaxed">
            Se arranca donde hay certeza y se cierra donde hay riesgo — una plaza dudosa al principio contamina la
            gira entera.
          </p>
          <div className="space-y-2">
            {diag.ruta.map((t) => (
              <div key={t.orden} className="flex gap-3">
                <div
                  className="vin-serif flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
                  style={{ border: "1px solid var(--vin-border-strong)", color: "var(--vin-accent)" }}
                >
                  {t.orden}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-[14.5px] font-medium">{t.ciudad}</div>
                  <p className="vin-muted text-[13px] leading-relaxed">{t.porQueVaAqui}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {diag.trampas.length > 0 && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(224,72,58,0.07)", border: "1px solid rgba(224,72,58,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "var(--vin-accent)" }}>Plazas trampa</span>
          </PanelLabel>
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            Las que la data hace ver bien y no lo están. Es lo que evita el show con sala vacía en la ciudad de más
            streams.
          </p>
          <ul className="space-y-2">
            {diag.trampas.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span style={{ color: "var(--vin-accent)" }}>—</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diag.queFaltaSaber.length > 0 && (
        <Panel>
          <PanelLabel>Qué averiguar antes de reservar</PanelLabel>
          <ul className="space-y-2">
            {diag.queFaltaSaber.map((q, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="vin-faint tabular-nums">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div
        className="rounded-sm p-5"
        style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>Veredicto</span>
        </PanelLabel>
        <p className="text-[15px] leading-relaxed">{diag.veredicto}</p>
      </div>

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

"use client";

import { useState } from "react";
import {
  VincereARDiagnostico,
  VincereCandidato,
  VincereCandidatoEstado,
  VincereCandidatoTipo,
  VincereProyecto,
  VincereVeredictoColab,
  VINCERE_CANDIDATO_ESTADO_LABEL,
  VINCERE_CANDIDATO_TIPO_LABEL,
  VINCERE_VEREDICTO_COLAB_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchAR } from "@/lib/vincere/ai-client";
import { buildARContext } from "@/lib/vincere/context";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const VEREDICTO_COLOR: Record<VincereVeredictoColab, string> = {
  perseguir: "#5cc98e",
  explorar: "#2dd4bf",
  esperar: "#e0a83a",
  descartar: "#e0483a",
};

const ESTADO_COLOR: Record<VincereCandidatoEstado, string> = {
  propuesto: "#a39c92",
  conversando: "#2dd4bf",
  cerrado: "#5cc98e",
  descartado: "#e0483a",
};

const TIPOS: VincereCandidatoTipo[] = ["artista", "productor", "compositor"];
const ESTADOS: VincereCandidatoEstado[] = ["propuesto", "conversando", "cerrado", "descartado"];

export default function ARSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addCandidato = useVincereStore((s) => s.addCandidato);
  const updateCandidato = useVincereStore((s) => s.updateCandidato);
  const deleteCandidato = useVincereStore((s) => s.deleteCandidato);
  const setDiagnostico = useVincereStore((s) => s.setARDiagnostico);
  const abrirInvestigacion = useVincereStore((s) => s.abrirInvestigacion);
  const showToast = useVincereStore((s) => s.showToast);

  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  const candidatos = proyecto.candidatos ?? [];
  const diag = proyecto.arDiagnostico;
  const sinMarca = !proyecto.marca?.posicionamiento?.trim();

  async function analizar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchAR({ artista: buildARContext(proyecto), nota });
      setDiagnostico(proyecto.id, r);
      setNota("");
      showToast("Candidatos evaluados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo evaluar los candidatos");
    } finally {
      setCargando(false);
    }
  }

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="ar"
      eyebrow="A&R y Colaboraciones"
      title="Con quién trabajar, y con quién no"
      subtitle="Una colaboración solo vale si abre una puerta cerrada. Con alguien que ya comparte tu público no ganas audiencia: pagas por llegar a quien ya te escucha."
      aiTitle="Lectura VINCERE — A&R"
    >
      {sinMarca && (
        <div
          className="rounded-sm p-4"
          style={{ background: "rgba(224,168,58,0.07)", border: "1px solid rgba(224,168,58,0.3)" }}
        >
          <p className="text-[13.5px] leading-relaxed">
            <span style={{ color: "#e0a83a" }}>Sin marca declarada.</span> Este motor juzga sobre todo contra el
            antipatrón — lo que el artista dijo que <em>no</em> es. Sin eso, un nombre grande que rompa la identidad no
            se puede señalar con solidez. Declárala en <strong>Marca</strong> primero.
          </p>
        </div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <PanelLabel>Candidatos</PanelLabel>
          <button onClick={() => setAgregando((v) => !v)} className="vin-faint text-xs hover:underline">
            {agregando ? "Cancelar" : "+ Añadir candidato"}
          </button>
        </div>

        {agregando && (
          <FormularioCandidato
            onAdd={(c) => {
              addCandidato(proyecto.id, c);
              setAgregando(false);
            }}
            onCancelar={() => setAgregando(false)}
          />
        )}

        {candidatos.length === 0 && !agregando && (
          <Panel>
            <p className="vin-muted text-sm">
              Sin candidatos. El motor funciona igual y devuelve qué perfil de colaborador le falta hoy a este artista,
              que suele ser más útil que evaluar una lista que alguien más armó.
            </p>
          </Panel>
        )}

        <div className="space-y-2.5">
          {candidatos.map((c) => (
            <FilaCandidato
              key={c.id}
              candidato={c}
              onUpdate={(patch) => updateCandidato(proyecto.id, c.id, patch)}
              onDelete={() => deleteCandidato(proyecto.id, c.id)}
              onInvestigar={() =>
                abrirInvestigacion(
                  `${c.nombre}: en qué fase real está, tamaño y procedencia de su audiencia, qué lanzó último y cómo le fue, con quién ha colaborado, y en qué se solapa o se diferencia de ${proyecto.nombre}.`
                )
              }
            />
          ))}
        </div>
      </section>

      <Panel>
        <PanelLabel>Evaluar candidatos</PanelLabel>
        <p className="vin-faint mb-3 text-xs leading-relaxed">
          Cruza cada candidato con la marca declarada, la audiencia que ya tienes y lo que se haya investigado de
          ellos.
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Algo puntual: «el sello empuja el feature con DVKE», «busco abrir Bogotá» (opcional)"
          className="vin-input mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={analizar} disabled={cargando} className="vin-btn-primary">
            {cargando ? "Cruzando marca, audiencia y tamaño…" : diag ? "Volver a evaluar" : "Evaluar candidatos"}
          </button>
          {cargando && <span className="vin-faint text-xs">Buscando solapamientos y asimetrías.</span>}
        </div>
        {error && (
          <p className="mt-3 text-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {diag && <DiagnosticoAR diag={diag} onEliminar={() => setDiagnostico(proyecto.id, null)} />}
    </SectionShell>
  );
}

function FormularioCandidato({
  onAdd,
  onCancelar,
}: {
  onAdd: (c: Omit<VincereCandidato, "id" | "creadoEn">) => void;
  onCancelar: () => void;
}) {
  const [f, setF] = useState<{
    nombre: string;
    tipo: VincereCandidatoTipo;
    queAporta: string;
    origen: string;
    estado: VincereCandidatoEstado;
  }>({ nombre: "", tipo: "artista", queAporta: "", origen: "", estado: "propuesto" });

  return (
    <Panel className="mb-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">Nombre</div>
          <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="vin-input" />
        </div>
        <div>
          <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">Tipo</div>
          <div className="flex gap-1.5">
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setF({ ...f, tipo: t })}
                className="rounded-full border px-2.5 py-1 text-[11.5px] transition-colors"
                style={{
                  color: f.tipo === t ? "var(--vin-text)" : "var(--vin-dim)",
                  borderColor: f.tipo === t ? "var(--vin-accent)" : "var(--vin-border)",
                  background: f.tipo === t ? "rgba(224,72,58,0.12)" : "transparent",
                }}
              >
                {VINCERE_CANDIDATO_TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">Qué aporta</div>
          <input
            value={f.queAporta}
            onChange={(e) => setF({ ...f, queAporta: e.target.value })}
            placeholder="Audiencia en otra plaza, voz que contrasta, producción…"
            className="vin-input"
          />
        </div>
        <div>
          <div className="vin-faint mb-1.5 text-[10.5px] uppercase tracking-[0.08em]">De dónde salió</div>
          <input
            value={f.origen}
            onChange={(e) => setF({ ...f, origen: e.target.value })}
            placeholder="Quién lo propuso"
            className="vin-input"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => f.nombre.trim() && onAdd({ ...f, nombre: f.nombre.trim() })}
          disabled={!f.nombre.trim()}
          className="vin-btn-primary"
        >
          Añadir
        </button>
        <button onClick={onCancelar} className="vin-btn-ghost">
          Cancelar
        </button>
      </div>
    </Panel>
  );
}

function FilaCandidato({
  candidato,
  onUpdate,
  onDelete,
  onInvestigar,
}: {
  candidato: VincereCandidato;
  onUpdate: (patch: Partial<VincereCandidato>) => void;
  onDelete: () => void;
  onInvestigar: () => void;
}) {
  return (
    <div className="vin-card border-l-2 p-4" style={{ borderLeftColor: ESTADO_COLOR[candidato.estado] }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-[15px] font-medium">{candidato.nombre}</span>
          <span className="vin-faint text-[11.5px] uppercase tracking-wide">
            {VINCERE_CANDIDATO_TIPO_LABEL[candidato.tipo]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => onUpdate({ estado: e })}
              className="rounded-full border px-2 py-0.5 text-[10.5px] transition-colors"
              style={{
                color: candidato.estado === e ? ESTADO_COLOR[e] : "var(--vin-dim)",
                borderColor: candidato.estado === e ? `${ESTADO_COLOR[e]}66` : "var(--vin-border)",
                background: candidato.estado === e ? `${ESTADO_COLOR[e]}14` : "transparent",
              }}
            >
              {VINCERE_CANDIDATO_ESTADO_LABEL[e]}
            </button>
          ))}
          <button onClick={onDelete} className="vin-faint px-1 text-xs hover:underline" title="Eliminar">
            ✕
          </button>
        </div>
      </div>

      <input
        value={candidato.queAporta}
        onChange={(e) => onUpdate({ queAporta: e.target.value })}
        placeholder="Qué aporta esta colaboración"
        className="vin-input mb-2 text-[13.5px]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {candidato.origen && <span className="vin-faint text-[11.5px]">Origen: {candidato.origen}</span>}
        {/* Sin investigación, el solapamiento de audiencia es suposición: este
            atajo es el que convierte el candidato en evidencia. */}
        <button onClick={onInvestigar} className="vin-faint text-[11.5px] hover:underline">
          Investigar a {candidato.nombre} →
        </button>
      </div>
    </div>
  );
}

function DiagnosticoAR({ diag, onEliminar }: { diag: VincereARDiagnostico; onEliminar: () => void }) {
  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="vin-eyebrow">Evaluación de A&amp;R</div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={diag.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 text-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed">{diag.lecturaGeneral}</p>
        <p className="vin-faint mt-2.5 text-xs">
          Generado el{" "}
          {new Date(diag.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {diag.primeroPerseguir && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(92,201,142,0.07)", border: "1px solid rgba(92,201,142,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "#5cc98e" }}>A quién ir primero</span>
          </PanelLabel>
          <p className="text-[15px] leading-relaxed">{diag.primeroPerseguir}</p>
        </div>
      )}

      {diag.candidatos.length > 0 && (
        <section>
          <PanelLabel>Candidato por candidato</PanelLabel>
          <div className="mt-3 space-y-2.5">
            {diag.candidatos.map((c, i) => (
              <div key={i} className="vin-card border-l-2 p-4" style={{ borderLeftColor: VEREDICTO_COLOR[c.veredicto] }}>
                <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-medium">{c.nombre}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                    style={{ color: VEREDICTO_COLOR[c.veredicto], borderColor: `${VEREDICTO_COLOR[c.veredicto]}66` }}
                  >
                    {VINCERE_VEREDICTO_COLAB_LABEL[c.veredicto]}
                  </span>
                  <EvidenceTag nivel={c.nivel} />
                </div>

                <div className="grid gap-2.5 md:grid-cols-3">
                  <Celda label="Fit de marca" texto={c.fitMarca} />
                  <Celda label="Solapamiento de audiencia" texto={c.solapamiento} destacado />
                  <Celda label="Asimetría" texto={c.asimetria} />
                </div>

                <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
                  <div>
                    <div className="vin-faint mb-1 text-[10.5px] uppercase tracking-[0.08em]">Gana</div>
                    <p className="text-[13.5px] leading-relaxed">{c.queGana}</p>
                  </div>
                  <div>
                    <div
                      className="mb-1 text-[10.5px] uppercase tracking-[0.08em]"
                      style={{ color: "var(--vin-accent)" }}
                    >
                      Arriesga
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{c.queArriesga}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {diag.senalesDeAlerta.length > 0 && (
        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(224,72,58,0.07)", border: "1px solid rgba(224,72,58,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "var(--vin-accent)" }}>Señales de alerta</span>
          </PanelLabel>
          <p className="vin-faint mb-3 text-[11.5px] leading-relaxed">
            Colaboraciones que se ven bien y no lo son: el nombre grande que rompe la marca, el amigo del circuito que
            ya comparte tu público.
          </p>
          <ul className="space-y-2">
            {diag.senalesDeAlerta.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span style={{ color: "var(--vin-accent)" }}>—</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {diag.perfilQueFalta && (
          <Panel>
            <PanelLabel>El perfil que falta</PanelLabel>
            <p className="vin-faint mb-2 text-[11.5px] leading-relaxed">
              Qué tipo de colaborador necesita hoy, mire o no la lista actual.
            </p>
            <p className="text-[14px] leading-relaxed">{diag.perfilQueFalta}</p>
          </Panel>
        )}

        {diag.queFaltaSaber.length > 0 && (
          <Panel>
            <PanelLabel>Qué averiguar antes de mover</PanelLabel>
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
      </div>

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

function Celda({ label, texto, destacado = false }: { label: string; texto: string; destacado?: boolean }) {
  return (
    <div
      className="rounded-sm p-3"
      style={
        destacado
          ? { background: "rgba(224,72,58,0.06)", border: "1px solid rgba(224,72,58,0.22)" }
          : { background: "var(--vin-surface)" }
      }
    >
      <div
        className="mb-1 text-[10.5px] uppercase tracking-[0.08em]"
        style={destacado ? { color: "var(--vin-accent)" } : undefined}
      >
        <span className={destacado ? "" : "vin-faint"}>{label}</span>
      </div>
      <p className="text-[13px] leading-relaxed">{texto}</p>
    </div>
  );
}

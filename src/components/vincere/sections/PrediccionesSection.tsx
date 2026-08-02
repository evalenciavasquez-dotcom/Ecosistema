"use client";

import { useMemo, useState } from "react";
import {
  VincereEstadoPrediccion,
  VincereNivel,
  VincerePrediccion,
  VincereProyecto,
  VincereSeccion,
  VINCERE_ESTADO_PREDICCION_COLOR,
  VINCERE_ESTADO_PREDICCION_LABEL,
  VINCERE_SECCION_LABEL,
  calcularMarcador,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const CIERRES: Exclude<VincereEstadoPrediccion, "abierta">[] = [
  "acertada",
  "parcial",
  "fallada",
  "no-verificable",
];

const HOY = new Date().toISOString().slice(0, 10);

function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function PrediccionesSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addPrediccion = useVincereStore((s) => s.addPrediccion);
  const verificar = useVincereStore((s) => s.verificarPrediccion);
  const reabrir = useVincereStore((s) => s.reabrirPrediccion);
  const eliminar = useVincereStore((s) => s.deletePrediccion);

  const [agregando, setAgregando] = useState(false);

  const preds = useMemo(() => proyecto.predicciones ?? [], [proyecto.predicciones]);
  const marcador = useMemo(() => calcularMarcador(preds), [preds]);

  const abiertas = preds.filter((p) => p.estado === "abierta");
  const cerradas = preds.filter((p) => p.estado !== "abierta");

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="predicciones"
      eyebrow="Predicciones"
      title="Qué dijimos que iba a pasar"
      subtitle="Sin esto, ninguna lectura del sistema es falsable: si algo falla siempre se puede decir que la ejecución estuvo mal. Aquí queda el marcador — y con él, la única prueba de si este método sirve."
      aiTitle="Lectura VINCERE — Predicciones"
    >
      <Marcador m={marcador} />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <PanelLabel>Abiertas {marcador.vencidas > 0 && `· ${marcador.vencidas} vencida(s)`}</PanelLabel>
          <button onClick={() => setAgregando((v) => !v)} className="vin-faint vin-t-xs hover:underline">
            {agregando ? "Cancelar" : "+ Registrar predicción"}
          </button>
        </div>

        {agregando && (
          <Formulario
            onAdd={(p) => {
              addPrediccion(proyecto.id, p);
              setAgregando(false);
            }}
            onCancelar={() => setAgregando(false)}
          />
        )}

        {abiertas.length === 0 && !agregando && (
          <Panel>
            <p className="vin-muted vin-t-sm">
              Ninguna predicción abierta. Cada vez que el sistema recomiende algo con una consecuencia esperable,
              regístrala aquí: es lo que convierte una opinión en algo que se puede comprobar.
            </p>
          </Panel>
        )}

        <div className="space-y-2.5">
          {abiertas.map((p) => (
            <Fila
              key={p.id}
              p={p}
              onVerificar={(estado, texto) => verificar(proyecto.id, p.id, estado, texto)}
              onEliminar={() => eliminar(proyecto.id, p.id)}
            />
          ))}
        </div>
      </section>

      {cerradas.length > 0 && (
        <section>
          <PanelLabel>Ya verificadas</PanelLabel>
          <div className="space-y-2.5">
            {cerradas.map((p) => (
              <Fila key={p.id} p={p} onReabrir={() => reabrir(proyecto.id, p.id)} onEliminar={() => eliminar(proyecto.id, p.id)} />
            ))}
          </div>
        </section>
      )}
    </SectionShell>
  );
}

function Marcador({ m }: { m: ReturnType<typeof calcularMarcador> }) {
  const color = m.pctAcierto == null ? "var(--vin-muted)" : m.pctAcierto >= 60 ? "#5cc98e" : m.pctAcierto >= 40 ? "#e0a83a" : "#e0483a";

  return (
    <div className="space-y-4">
      {/* El marcador es el argumento entero de la plataforma: va con el peso
          visual de un titular, no de un panel más. */}
      <div className="vin-card p-7">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <div
              className="vin-serif tabular-nums"
              style={{ color, fontSize: "58px", lineHeight: 1, letterSpacing: "-0.03em" }}
            >
              {m.pctAcierto != null ? `${m.pctAcierto}%` : "—"}
            </div>
            <div className="vin-muted vin-t-sm mt-2.5">de acierto en lo que se pudo verificar</div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 vin-t-base tabular-nums sm:grid-cols-4">
            <Dato label="Acertadas" valor={m.acertadas} color="var(--vin-ok)" />
            <Dato label="Falladas" valor={m.falladas} color="var(--vin-risk)" />
            <Dato label="Parciales" valor={m.parciales} color="var(--vin-warn)" />
            <Dato label="Abiertas" valor={m.abiertas} />
          </div>
        </div>
        <p className="vin-faint mt-5 vin-t-sm leading-relaxed" style={{ maxWidth: "68ch" }}>
          El porcentaje cuenta solo acertadas y falladas. Las parciales y las no verificables quedan fuera a
          propósito: un marcador que se infla a sí mismo no sirve para nada.
          {m.vencidas > 0 && (
            <span style={{ color: "var(--vin-warn)" }}> Hay {m.vencidas} vencida(s) sin cerrar.</span>
          )}
        </p>
      </div>

      {/* La auditoría de los niveles de evidencia — lo que ninguna otra
          herramienta se hace a sí misma. */}
      <Panel>
        <PanelLabel>¿Los niveles de evidencia significan algo?</PanelLabel>
        <p className="vin-faint mb-3 vin-t-sm leading-relaxed">
          El nivel lo asigna el mismo modelo que hace la afirmación — es un examen autocorregido. Esta tabla lo
          audita: si las lecturas de nivel alto no aciertan más que las de nivel bajo, esos niveles son decoración.
        </p>
        <div className="space-y-1.5">
          {m.calibracion.map((c) => (
            <div key={c.nivel} className="flex items-center gap-3.5">
              {/* Ancho fijo suficiente para la etiqueta completa: si se parte
                  en dos líneas la fila se desalinea y la tabla deja de leerse
                  como tabla. */}
              <div className="w-[186px] shrink-0">
                <EvidenceTag nivel={c.nivel as VincereNivel} />
              </div>
              <div className="vin-bar-track h-2 flex-1">
                {c.pct != null && (
                  <div
                    className="vin-bar-fill h-full"
                    style={{
                      width: `${c.pct}%`,
                      background:
                        c.pct >= 60 ? "var(--vin-ok)" : c.pct >= 40 ? "var(--vin-warn)" : "var(--vin-risk)",
                    }}
                  />
                )}
              </div>
              <div className="w-24 shrink-0 text-right vin-t-sm tabular-nums">
                {c.cerradas > 0 ? (
                  <>
                    <span>{c.pct}%</span>
                    <span className="vin-faint"> ({c.acertadas}/{c.cerradas})</span>
                  </>
                ) : (
                  <span className="vin-faint">sin datos</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--vin-border)" }}>
          {m.nivelesSirven === null ? (
            <p className="vin-faint vin-t-sm leading-relaxed">
              Todavía no hay suficientes predicciones cerradas para juzgarlo. Hacen falta al menos tres de nivel alto
              (3-4) y tres de nivel bajo (1-2) — con dos casos no se concluye nada.
            </p>
          ) : m.nivelesSirven ? (
            <p className="vin-t-sm leading-relaxed" style={{ color: "#5cc98e" }}>
              Los niveles altos están acertando más que los bajos. La escala de evidencia está midiendo algo real.
            </p>
          ) : (
            <p className="vin-t-sm leading-relaxed" style={{ color: "#e0483a" }}>
              Los niveles altos NO aciertan más que los bajos. Hoy la escala de evidencia no está midiendo nada — hay
              que revisar los prompts antes de seguir apoyándose en ella.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Dato({ label, valor, color }: { label: string; valor: number; color?: string }) {
  return (
    <>
      <span className="vin-faint">{label}</span>
      <span style={color ? { color } : undefined}>{valor}</span>
    </>
  );
}

function Fila({
  p,
  onVerificar,
  onReabrir,
  onEliminar,
}: {
  p: VincerePrediccion;
  onVerificar?: (estado: Exclude<VincereEstadoPrediccion, "abierta">, texto: string) => void;
  onReabrir?: () => void;
  onEliminar: () => void;
}) {
  const [cerrando, setCerrando] = useState<Exclude<VincereEstadoPrediccion, "abierta"> | null>(null);
  const [texto, setTexto] = useState("");

  const vencida = p.estado === "abierta" && p.venceEn <= HOY;
  const color = VINCERE_ESTADO_PREDICCION_COLOR[p.estado];

  return (
    <div
      className="vin-card border-l-2 p-4"
      style={{ borderLeftColor: vencida ? "#e0a83a" : color }}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 vin-t-base leading-relaxed">{p.afirmacion}</p>
        <div className="flex shrink-0 items-center gap-2.5">
          <EvidenceTag nivel={p.nivelAlEmitir} />
          {p.estado !== "abierta" && (
            <span
              className="rounded-full border px-2 py-0.5 vin-t-xs"
              style={{ color, borderColor: `${color}66` }}
            >
              {VINCERE_ESTADO_PREDICCION_LABEL[p.estado]}
            </span>
          )}
          <button onClick={onEliminar} className="vin-faint px-1 vin-t-xs hover:underline" title="Eliminar">
            ✕
          </button>
        </div>
      </div>

      <p className="vin-muted mb-2 vin-t-sm leading-relaxed">
        <span className="vin-faint">Se verifica así: </span>
        {p.comoSeVerifica}
      </p>

      <div className="vin-faint flex flex-wrap gap-3 vin-t-xs tabular-nums">
        {p.motor && <span>{VINCERE_SECCION_LABEL[p.motor as VincereSeccion]}</span>}
        <span style={vencida ? { color: "#e0a83a" } : undefined}>
          {p.estado === "abierta" ? (vencida ? `venció el ${p.venceEn}` : `vence el ${p.venceEn}`) : `plazo ${p.venceEn}`}
        </span>
        {p.verificadoEn && <span>verificada el {p.verificadoEn}</span>}
      </div>

      {p.queOcurrio && (
        <div className="mt-2.5 rounded-xl p-3" style={{ background: "var(--vin-surface)" }}>
          <div className="vin-faint mb-1 vin-t-xs uppercase tracking-[0.08em]">Qué ocurrió</div>
          <p className="vin-t-sm leading-relaxed">{p.queOcurrio}</p>
        </div>
      )}

      {p.estado === "abierta" && onVerificar && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--vin-border)" }}>
          {cerrando ? (
            <div className="space-y-2">
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Qué ocurrió, con el dato concreto"
                className="vin-input"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onVerificar(cerrando, texto.trim());
                    setCerrando(null);
                    setTexto("");
                  }}
                  disabled={!texto.trim()}
                  className="vin-btn-primary"
                >
                  Cerrar como {VINCERE_ESTADO_PREDICCION_LABEL[cerrando].toLowerCase()}
                </button>
                <button onClick={() => setCerrando(null)} className="vin-btn-ghost">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="vin-faint vin-t-sm">Cerrar como:</span>
              {CIERRES.map((e) => (
                <button
                  key={e}
                  onClick={() => setCerrando(e)}
                  className="rounded-full border px-2.5 py-0.5 vin-t-sm transition-colors"
                  style={{
                    color: VINCERE_ESTADO_PREDICCION_COLOR[e],
                    borderColor: `${VINCERE_ESTADO_PREDICCION_COLOR[e]}55`,
                  }}
                >
                  {VINCERE_ESTADO_PREDICCION_LABEL[e]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {p.estado !== "abierta" && onReabrir && (
        <button onClick={onReabrir} className="vin-faint mt-2 vin-t-xs hover:underline">
          Reabrir
        </button>
      )}
    </div>
  );
}

function Formulario({
  onAdd,
  onCancelar,
}: {
  onAdd: (p: {
    motor: VincereSeccion | null;
    afirmacion: string;
    comoSeVerifica: string;
    venceEn: string;
    nivelAlEmitir: VincereNivel;
  }) => void;
  onCancelar: () => void;
}) {
  const [f, setF] = useState({
    afirmacion: "",
    comoSeVerifica: "",
    venceEn: enDias(90),
    nivelAlEmitir: 2 as VincereNivel,
  });

  // Sin criterio de verificación no es una predicción: es una opinión con
  // fecha. Por eso se exige junto con la afirmación.
  const valido = f.afirmacion.trim() && f.comoSeVerifica.trim();

  return (
    <Panel className="mb-3">
      <div className="mb-3">
        <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">Qué va a pasar</div>
        <input
          value={f.afirmacion}
          onChange={(e) => setF({ ...f, afirmacion: e.target.value })}
          placeholder="Ej. «Medellín agota si se programa en sala de 350 o menos»"
          className="vin-input"
        />
      </div>
      <div className="mb-3">
        <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">
          Cómo sabremos si falló — obligatorio
        </div>
        <input
          value={f.comoSeVerifica}
          onChange={(e) => setF({ ...f, comoSeVerifica: e.target.value })}
          placeholder="Ej. «se llena al menos el 90% del aforo en la fecha de mayo»"
          className="vin-input"
        />
        <p className="vin-faint mt-1.5 vin-t-xs leading-relaxed">
          Sin esto no es una predicción, es una opinión con fecha. Tiene que poder decirse que se equivocó.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">Vence el</div>
          <input
            type="date"
            value={f.venceEn}
            onChange={(e) => setF({ ...f, venceEn: e.target.value })}
            className="vin-input"
          />
          <div className="mt-1.5 flex gap-1.5">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setF({ ...f, venceEn: enDias(d) })}
                className="vin-faint rounded-full border px-2 py-0.5 vin-t-xs"
                style={{ borderColor: "var(--vin-border)" }}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">
            Confianza al emitirla
          </div>
          <div className="flex gap-1.5">
            {([1, 2, 3, 4] as VincereNivel[]).map((n) => (
              <button
                key={n}
                onClick={() => setF({ ...f, nivelAlEmitir: n })}
                className="rounded-full border px-2.5 py-1 vin-t-sm transition-colors"
                style={{
                  color: f.nivelAlEmitir === n ? "var(--vin-text)" : "var(--vin-dim)",
                  borderColor: f.nivelAlEmitir === n ? "var(--vin-accent)" : "var(--vin-border)",
                  background: f.nivelAlEmitir === n ? "rgba(224,72,58,0.12)" : "transparent",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="vin-faint mt-1.5 vin-t-xs leading-relaxed">
            Es lo que después permite auditar si los niveles significan algo.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            valido &&
            onAdd({
              motor: null,
              afirmacion: f.afirmacion.trim(),
              comoSeVerifica: f.comoSeVerifica.trim(),
              venceEn: f.venceEn,
              nivelAlEmitir: f.nivelAlEmitir,
            })
          }
          disabled={!valido}
          className="vin-btn-primary"
        >
          Registrar
        </button>
        <button onClick={onCancelar} className="vin-btn-ghost">
          Cancelar
        </button>
      </div>
    </Panel>
  );
}

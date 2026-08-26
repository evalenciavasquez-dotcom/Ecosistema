"use client";

import { useMemo, useState } from "react";
import {
  VincereFuenteTipo,
  VincereMonetizacionDiagnostico,
  VincereProyecto,
  VINCERE_FUENTE_COLOR,
  VINCERE_FUENTE_LABEL,
} from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import { fetchMonetizacion } from "@/lib/vincere/ai-client";
import { buildMonetizacionContext } from "@/lib/vincere/context";
import { calcularLoMio, monedaDe, resumirDinero } from "@/lib/vincere/dinero";
import MonedaSelector from "../MonedaSelector";
import SectionShell from "../SectionShell";
import { Panel, PanelLabel } from "../primitives";
import EvidenceTag from "../EvidenceTag";

const FUENTES: VincereFuenteTipo[] = ["streaming", "shows", "merch", "sync", "publishing", "marca", "otro"];

const ESFUERZO_COLOR: Record<string, string> = { bajo: "var(--vin-ok)", medio: "var(--vin-warn)", alto: "var(--vin-risk)" };

function money(n: number, moneda: string): string {
  return `${n.toLocaleString("es")} ${moneda}`;
}

const MES_ACTUAL = new Date().toISOString().slice(0, 7);

export default function MonetizacionSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addIngreso = useVincereStore((s) => s.addIngreso);
  const deleteIngreso = useVincereStore((s) => s.deleteIngreso);
  const setDiagnostico = useVincereStore((s) => s.setMonetizacionDiagnostico);
  const showToast = useVincereStore((s) => s.showToast);
  const proyectos = useVincereStore((s) => s.proyectos);

  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  const resumen = useMemo(() => resumirDinero(proyecto), [proyecto]);
  const loMio = useMemo(() => calcularLoMio(proyecto.vinculo, resumen), [proyecto.vinculo, resumen]);
  const diag = proyecto.monetizacionDiagnostico;

  const cargaSemanalTotal = proyectos
    .filter((x) => x.vinculo?.confirmado && x.vinculo.horasSemanales)
    .reduce((t, x) => t + (x.vinculo?.horasSemanales ?? 0), 0);

  async function analizar() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const r = await fetchMonetizacion({
        artista: buildMonetizacionContext(proyecto, resumen, loMio, cargaSemanalTotal),
        nota,
      });
      setDiagnostico(proyecto.id, r);
      setNota("");
      showToast("Monetización analizada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo analizar la monetización");
    } finally {
      setCargando(false);
    }
  }

  const moneda = resumen.monedaPrincipal ?? monedaDe(proyecto);

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="monetizacion"
      eyebrow="Monetización"
      title="De qué vive, qué te queda, y por dónde más"
      subtitle="La atención se va a donde se ven los números. El dinero suele entrar por otro lado. Aquí están los dos juntos por primera vez."
      aiTitle="Lectura VINCERE — Monetización"
    >
      <MonedaSelector proyecto={proyecto} />

      {/* VISTA 1 — lo que entra */}
      {resumen.ingresos.length > 0 && (
        <section>
          <PanelLabel>De dónde viene el dinero</PanelLabel>
          {resumen.variasMonedas && (
            <p className="mb-3 vin-t-sm leading-relaxed" style={{ color: "var(--vin-warn)" }}>
              Hay ingresos en {resumen.monedas.map((m) => m.moneda).join(", ")} y no se convierten entre sí — sumar
              monedas con un tipo de cambio inventado daría un número falso. Todo lo de abajo es solo sobre {moneda}.
            </p>
          )}

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Cifra
              valor={money(resumen.promedioMensual, moneda)}
              label={`promedio mensual · ${resumen.meses} ${resumen.meses === 1 ? "mes" : "meses"} cargados`}
            />
            <Cifra
              valor={resumen.porMilStreams != null ? money(Number(resumen.porMilStreams.toFixed(2)), moneda) : "—"}
              label="por cada 1.000 streams, solo de streaming"
              acento={resumen.porMilStreams != null}
            />
            <Cifra
              valor={
                resumen.porMilStreamsTotal != null
                  ? money(Number(resumen.porMilStreamsTotal.toFixed(2)), moneda)
                  : "—"
              }
              label="por cada 1.000 streams, contando TODO lo que entra"
            />
          </div>

          {/* Barra de reparto: la concentración se ve antes de leer nada. */}
          <div className="mb-2 flex h-3 overflow-hidden rounded-xl">
            {resumen.porFuente.map((f) => (
              <div
                key={f.tipo}
                style={{ width: `${f.pct}%`, background: VINCERE_FUENTE_COLOR[f.tipo] }}
                title={`${VINCERE_FUENTE_LABEL[f.tipo]} ${f.pct}%`}
              />
            ))}
          </div>
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {resumen.porFuente.map((f) => (
              <span key={f.tipo} className="flex items-center gap-1.5 vin-t-sm">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: VINCERE_FUENTE_COLOR[f.tipo] }}
                />
                <span>{VINCERE_FUENTE_LABEL[f.tipo]}</span>
                <span className="vin-faint tabular-nums">{f.pct}%</span>
                <span className="vin-faint tabular-nums">· {money(f.total, moneda)}</span>
              </span>
            ))}
          </div>

          {resumen.concentracionPct >= 70 && resumen.fuenteDominante && (
            <p className="mb-3 vin-t-sm leading-relaxed" style={{ color: "var(--vin-warn)" }}>
              El {resumen.concentracionPct}% entra por {VINCERE_FUENTE_LABEL[resumen.fuenteDominante].toLowerCase()}.
              El negocio depende de una sola pata.
            </p>
          )}
        </section>
      )}

      {/* VISTA 2 — lo que te queda */}
      {loMio.aplica && loMio.mensual != null && (
        <div
          className="rounded-xl p-5"
          style={{
            background: loMio.hipotetico ? "rgba(224,168,58,0.07)" : "var(--vin-ok-wash)",
            border: `1px solid ${loMio.hipotetico ? "rgba(224,168,58,0.3)" : "var(--vin-ok-line)"}`,
          }}
        >
          <PanelLabel>
            <span style={{ color: loMio.hipotetico ? "var(--vin-warn)" : "var(--vin-ok)" }}>
              {loMio.hipotetico ? "Lo tuyo — si se acuerda" : "Lo tuyo"}
            </span>
          </PanelLabel>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="vin-serif vin-t-display tabular-nums" style={{ color: loMio.hipotetico ? "var(--vin-warn)" : "var(--vin-ok)" }}>
              {money(loMio.mensual, loMio.moneda ?? moneda)}
            </span>
            <span className="vin-faint vin-t-xs">al mes</span>
          </div>
          <p className="vin-muted mt-2 vin-t-sm leading-relaxed">{loMio.explicacion}</p>
          {loMio.hipotetico && (
            <p className="mt-2 vin-t-sm leading-relaxed" style={{ color: "var(--vin-warn)" }}>
              El vínculo está sin confirmar, así que esto es un escenario y no un ingreso. Se marca así a propósito.
            </p>
          )}
          {cargaSemanalTotal > 0 && proyecto.vinculo?.horasSemanales ? (
            <p className="vin-faint mt-2 vin-t-sm leading-relaxed">
              Este proyecto ocupa {proyecto.vinculo.horasSemanales}h de tus {cargaSemanalTotal}h semanales
              comprometidas.
            </p>
          ) : null}
        </div>
      )}

      {!loMio.aplica && loMio.explicacion && (
        <Panel>
          <PanelLabel>Lo tuyo</PanelLabel>
          <p className="vin-muted vin-t-base leading-relaxed">{loMio.explicacion}</p>
          <p className="vin-faint mt-2 vin-t-sm">Se define en Oportunidad de Negocio → Tu vínculo.</p>
        </Panel>
      )}

      {/* Registro */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <PanelLabel>Registro de ingresos</PanelLabel>
          <button onClick={() => setAgregando((v) => !v)} className="vin-faint vin-t-xs hover:underline">
            {agregando ? "Cancelar" : "+ Registrar ingreso"}
          </button>
        </div>
        <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
          Los shows entran solos desde Shows y Touring con su ingreso neto — no los cargues otra vez.
        </p>

        {agregando && (
          <FormularioIngreso
            onAdd={(i) => {
              addIngreso(proyecto.id, i);
              setAgregando(false);
            }}
            onCancelar={() => setAgregando(false)}
            monedaSugerida={moneda}
          />
        )}

        {resumen.ingresos.length === 0 && !agregando && (
          <Panel>
            <p className="vin-muted vin-t-sm">
              Sin ingresos cargados. El motor funciona igual y te dice por dónde <em>podría</em> monetizar según su
              audiencia y sus plazas — pero no puede decirte de qué vive hoy.
            </p>
          </Panel>
        )}

        <div className="space-y-1.5">
          {resumen.ingresos.map((i) => {
            const esDeShow = i.id.startsWith("show-");
            return (
              <div
                key={i.id}
                className="vin-card flex flex-wrap items-center justify-between gap-2 border-l-2 px-3.5 py-2.5"
                style={{ borderLeftColor: VINCERE_FUENTE_COLOR[i.tipo] }}
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-2.5">
                  <span className="vin-t-base">{VINCERE_FUENTE_LABEL[i.tipo]}</span>
                  <span className="vin-faint vin-t-sm tabular-nums">{i.periodo}</span>
                  {i.nota && <span className="vin-faint vin-t-sm">{i.nota}</span>}
                  {esDeShow && (
                    <span className="vin-faint vin-t-xs uppercase tracking-wide">desde Touring</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="vin-t-base tabular-nums">{money(i.monto, i.moneda)}</span>
                  {!esDeShow && (
                    <button
                      onClick={() => deleteIngreso(proyecto.id, i.id)}
                      className="vin-faint px-1 vin-t-xs hover:underline"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Panel>
        <PanelLabel>Analizar la monetización</PanelLabel>
        <p className="vin-faint mb-3 vin-t-xs leading-relaxed">
          Cruza el reparto de ingresos con el alcance, la audiencia, las plazas y la marca, y devuelve por dónde más
          podría entrar — solo vías que se justifiquen con la data de este artista.
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Contexto tuyo: «no quiero hacer merch», «tiene una marca interesada» (opcional)"
          className="vin-input mb-3"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={analizar} disabled={cargando} className="vin-btn-primary">
            {cargando ? "Cruzando dinero y alcance…" : diag ? "Volver a analizar" : "Analizar monetización"}
          </button>
        </div>
        {error && (
          <p className="mt-3 vin-t-xs" style={{ color: "var(--vin-accent)" }}>
            {error}
          </p>
        )}
      </Panel>

      {diag && <Diagnostico diag={diag} onEliminar={() => setDiagnostico(proyecto.id, null)} />}
    </SectionShell>
  );
}

function Cifra({ valor, label, acento = false }: { valor: string; label: string; acento?: boolean }) {
  return (
    <div className="vin-card p-4">
      <div
        className="vin-serif vin-t-xl leading-none tabular-nums"
        style={acento ? { color: "var(--vin-accent)" } : undefined}
      >
        {valor}
      </div>
      <div className="vin-faint mt-2 vin-t-xs leading-relaxed">{label}</div>
    </div>
  );
}

function FormularioIngreso({
  onAdd,
  onCancelar,
  monedaSugerida,
}: {
  onAdd: (i: { tipo: VincereFuenteTipo; monto: number; moneda: string; periodo: string; nota: string }) => void;
  onCancelar: () => void;
  monedaSugerida: string;
}) {
  const [f, setF] = useState({
    tipo: "streaming" as VincereFuenteTipo,
    monto: "",
    moneda: monedaSugerida,
    periodo: MES_ACTUAL,
    nota: "",
  });

  return (
    <Panel className="mb-3">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FUENTES.filter((t) => t !== "shows").map((t) => (
          <button
            key={t}
            onClick={() => setF({ ...f, tipo: t })}
            className="rounded-full border px-2.5 py-1 vin-t-sm transition-colors"
            style={{
              color: f.tipo === t ? VINCERE_FUENTE_COLOR[t] : "var(--vin-dim)",
              borderColor: f.tipo === t ? `${VINCERE_FUENTE_COLOR[t]}66` : "var(--vin-border)",
              background: f.tipo === t ? `${VINCERE_FUENTE_COLOR[t]}14` : "transparent",
            }}
          >
            {VINCERE_FUENTE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Campo label="Monto" valor={f.monto} onChange={(v) => setF({ ...f, monto: v })} tipo="number" />
        <Campo label="Moneda" valor={f.moneda} onChange={(v) => setF({ ...f, moneda: v })} />
        <Campo label="Período" valor={f.periodo} onChange={(v) => setF({ ...f, periodo: v })} tipo="month" />
        <Campo label="Nota" valor={f.nota} onChange={(v) => setF({ ...f, nota: v })} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            Number(f.monto) > 0 &&
            onAdd({
              tipo: f.tipo,
              monto: Number(f.monto),
              moneda: f.moneda.trim() || monedaSugerida,
              periodo: f.periodo,
              nota: f.nota.trim(),
            })
          }
          disabled={!(Number(f.monto) > 0)}
          className="vin-btn-primary"
        >
          Guardar
        </button>
        <button onClick={onCancelar} className="vin-btn-ghost">
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
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
}) {
  return (
    <div>
      <div className="vin-faint mb-1.5 vin-t-xs uppercase tracking-[0.08em]">{label}</div>
      <input type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} className="vin-input" />
    </div>
  );
}

function Diagnostico({
  diag,
  onEliminar,
}: {
  diag: VincereMonetizacionDiagnostico;
  onEliminar: () => void;
}) {
  return (
    <article className="vin-print-area space-y-5">
      <div className="vin-card p-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="vin-eyebrow">Lectura de monetización</div>
          <div className="flex shrink-0 items-center gap-3">
            <EvidenceTag nivel={diag.nivelGlobal} />
            <button onClick={onEliminar} className="vin-faint vin-no-print px-1 vin-t-xs hover:underline" title="Eliminar">
              ✕
            </button>
          </div>
        </div>
        <p className="vin-t-base leading-relaxed">{diag.lecturaGeneral}</p>
        <p className="vin-faint mt-2.5 vin-t-xs">
          Generado el{" "}
          {new Date(diag.generadoEn).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>Dónde va la atención, dónde entra el dinero</span>
        </PanelLabel>
        <p className="vin-t-base leading-relaxed">{diag.brechaAtencionIngreso}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <PanelLabel>Riesgo de concentración</PanelLabel>
          <p className="vin-t-base leading-relaxed">{diag.riesgoDeConcentracion}</p>
        </Panel>
        {diag.loQueYaFunciona.length > 0 && (
          <Panel>
            <PanelLabel>Lo que ya funciona</PanelLabel>
            <ul className="space-y-2">
              {diag.loQueYaFunciona.map((x, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span style={{ color: "var(--vin-ok)" }}>✓</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {diag.viasSinExplotar.length > 0 && (
        <section>
          <PanelLabel>Por dónde más podría entrar</PanelLabel>
          <p className="vin-faint mb-3 vin-t-sm leading-relaxed">
            Cada vía justificada con la data de este artista. Un catálogo genérico que le sirve a cualquiera no vale
            nada.
          </p>
          <div className="space-y-2.5">
            {diag.viasSinExplotar.map((v, i) => (
              <div key={i} className="vin-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2.5">
                  <span className="vin-t-base font-medium">{v.via}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 vin-t-xs"
                    style={{ color: ESFUERZO_COLOR[v.esfuerzo], borderColor: `${ESFUERZO_COLOR[v.esfuerzo]}66` }}
                  >
                    esfuerzo {v.esfuerzo}
                  </span>
                  <EvidenceTag nivel={v.nivel} />
                </div>
                <p className="mb-2 vin-t-base leading-relaxed">{v.porQueEncaja}</p>
                <p className="vin-muted vin-t-sm leading-relaxed">
                  <span className="vin-faint">Hace falta: </span>
                  {v.queHaceFalta}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {diag.lecturaDeLoMio && (
        <Panel>
          <PanelLabel>Qué significa para ti</PanelLabel>
          <p className="vin-t-base leading-relaxed">{diag.lecturaDeLoMio}</p>
        </Panel>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {diag.queMoverAhora.length > 0 && (
          <Panel>
            <PanelLabel>Qué mover este mes</PanelLabel>
            <ul className="space-y-2">
              {diag.queMoverAhora.map((x, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span className="vin-faint tabular-nums">{i + 1}.</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {diag.queFaltaSaber.length > 0 && (
          <Panel>
            <PanelLabel>Qué falta saber</PanelLabel>
            <ul className="space-y-2">
              {diag.queFaltaSaber.map((x, i) => (
                <li key={i} className="flex gap-2.5 vin-t-base leading-relaxed">
                  <span className="vin-faint">—</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div
        className="rounded-xl p-5"
        style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
      >
        <PanelLabel>
          <span style={{ color: "var(--vin-accent)" }}>Veredicto</span>
        </PanelLabel>
        <p className="vin-t-base leading-relaxed">{diag.veredicto}</p>
      </div>

      <div className="vin-no-print">
        <button onClick={() => window.print()} className="vin-btn-ghost">
          Imprimir / PDF
        </button>
      </div>
    </article>
  );
}

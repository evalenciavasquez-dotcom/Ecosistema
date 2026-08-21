"use client";

import { useMemo, useState } from "react";
import { VincereProyecto, VincereLanzamiento, VincereNivel } from "@/lib/vincere/types";
import { useVincereStore } from "@/lib/vincere/store";
import {
  planDeLanzamiento,
  calendarioDeLanzamiento,
  OBJETIVOS,
  OBJETIVO_LABEL,
  OBJETIVO_POR_DEFECTO,
  FUENTE_OBJETIVOS,
  ObjetivoCampana,
  Hito,
  Ruta,
  Reparto,
  ADVERTENCIA_LANZAMIENTO,
  NivelSupuesto,
} from "@/lib/vincere/lanzamiento";
import { ACCION_LABEL, ACCION_COLOR } from "@/lib/vincere/plazas";
import SectionShell from "../SectionShell";
import { Panel } from "../primitives";

// La pantalla que convierte todo lo demás en una decisión.
//
// Está armada como cuatro pasos porque el reclamo era concreto: "yo puedo
// llegar ahí loco un día de afán y no entiendo lo que tengo que hacer". Los
// pasos no se pueden saltar y cada uno dice qué falta.
//
// El paso 3 es el que hace distinto a esto: la meta se escribe ANTES, con el
// valor de partida congelado. Un plan sin número contra el cual medirse no se
// puede evaluar nunca, y eso es exactamente lo que permite que una campaña
// mala se cuente como buena después.

const nf = new Intl.NumberFormat("es-CO");
const n = (x: number) => nf.format(Math.round(x));

// Identificador reservado: elegir "el reparto" no es elegir una de las rutas,
// es elegirlas todas repartidas. Se guarda como si fuera una ruta más para no
// duplicar el estado del lanzamiento.
const ID_REPARTO = "reparto";

const NIVEL_COLOR: Record<NivelSupuesto, string> = {
  1: "var(--vin-risk)",
  2: "var(--vin-warn)",
  3: "var(--vin-accent)",
  4: "var(--vin-ok)",
};
const NIVEL_TEXTO: Record<NivelSupuesto, string> = {
  1: "un caso suelto",
  2: "benchmark público",
  3: "medido en el sector",
  4: "medido en este artista",
};

function Paso({
  n: numero,
  titulo,
  estado,
  children,
}: {
  n: number;
  titulo: string;
  estado?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4">
      <div className="flex shrink-0 flex-col items-center pt-1">
        <div
          className="vin-t-sm flex h-7 w-7 items-center justify-center rounded-full tabular-nums"
          style={{ border: "1px solid var(--vin-border)", color: "var(--vin-muted)" }}
        >
          {numero}
        </div>
        <div className="mt-2 w-px flex-1" style={{ background: "var(--vin-border)" }} />
      </div>
      <div className="min-w-0 flex-1 pb-8">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="vin-t-lg font-medium">{titulo}</h2>
          {estado && <span className="vin-faint vin-t-sm">{estado}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}

function TarjetaRuta({
  r,
  elegida,
  onElegir,
}: {
  r: Ruta;
  elegida: boolean;
  onElegir: () => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div
      className="rounded-[--r-md] p-5"
      style={{
        border: elegida ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
        background: elegida ? "rgba(224,72,58,0.06)" : "var(--vin-surface-2)",
        opacity: r.noEjecutable ? 0.55 : 1,
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="vin-t-base font-medium">
            {r.canalLabel} <span className="vin-faint">·</span> {r.plaza}
          </div>
          <div className="vin-faint vin-t-sm mt-0.5">
            {r.pais ?? "sin país"} · plaza para{" "}
            <span style={{ color: ACCION_COLOR[r.accionDePlaza] }}>
              {ACCION_LABEL[r.accionDePlaza].toLocaleLowerCase("es")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Sin este aviso, dos plazas de países distintos muestran cifras
              idénticas y parece un error de cálculo. No lo es: es que no hay
              CPM publicado para ese país y las dos caen al mismo rango global. */}
          {r.cpm.region === "global" && (
            <span
              className="vin-t-xs rounded-full px-2.5 py-1"
              style={{ border: "1px solid var(--vin-border)", color: "var(--vin-muted)" }}
              title={`No hay CPM publicado de ${r.pais ?? "este país"} para ${r.canalLabel}.`}
            >
              CPM global
            </span>
          )}
          <span
            className="vin-t-xs rounded-full px-2.5 py-1"
            style={{ border: `1px solid ${NIVEL_COLOR[r.nivelMasDebil]}55`, color: NIVEL_COLOR[r.nivelMasDebil] }}
          >
            nivel {r.nivelMasDebil} · {NIVEL_TEXTO[r.nivelMasDebil]}
          </span>
        </div>
      </div>

      {r.noEjecutable ? (
        <p className="vin-t-sm mt-4 leading-relaxed" style={{ color: "var(--vin-risk)" }}>
          {r.noEjecutable}
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="vin-t-xl vin-serif tabular-nums">
                {n(r.oyentesBajo)}–{n(r.oyentesAlto)}
              </div>
              <div className="vin-faint vin-t-sm">oyentes nuevos</div>
            </div>
            <div>
              <div className="vin-t-xl vin-serif tabular-nums">
                {r.seguidoresBajo != null ? `${n(r.seguidoresBajo)}–${n(r.seguidoresAlto!)}` : "—"}
              </div>
              <div className="vin-faint vin-t-sm">
                {r.seguidoresBajo != null ? "seguidores nuevos" : "sin fan rate no se puede estimar"}
              </div>
            </div>
            <div>
              <div className="vin-t-xl vin-serif tabular-nums">
                US${r.costoPorOyenteBajoUsd}–{r.costoPorOyenteAltoUsd}
              </div>
              <div className="vin-faint vin-t-sm">por oyente</div>
            </div>
          </div>

          <p className="vin-muted vin-t-sm mt-4 leading-relaxed">{r.brecha}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={onElegir}
              className={elegida ? "vin-btn-primary" : "vin-btn-ghost"}
              disabled={elegida}
            >
              {elegida ? "Ruta elegida" : "Elegir esta ruta"}
            </button>
            <button onClick={() => setAbierta((v) => !v)} className="vin-faint vin-t-sm hover:underline">
              {abierta ? "ocultar la cuenta" : "ver la cuenta paso a paso"}
            </button>
          </div>

          {abierta && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--vin-border)" }}>
              <p className="vin-faint vin-t-sm mb-4 leading-relaxed">
                Por qué esta plaza: {r.porQueEsaPlaza}
              </p>
              {r.cadena.map((paso, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="vin-t-base">
                      {paso.enCadena ? "" : "· "}
                      {paso.label}
                    </span>
                    <span className="vin-t-base tabular-nums">
                      {n(paso.bajo)} – {n(paso.alto)}
                    </span>
                  </div>
                  <p className="vin-faint vin-t-sm mt-1 leading-relaxed">{paso.operacion}</p>
                  {paso.supuesto && (
                    <p className="vin-t-xs mt-1" style={{ color: NIVEL_COLOR[paso.supuesto.nivel] }}>
                      nivel {paso.supuesto.nivel} — {paso.supuesto.fuente}
                      {paso.supuesto.url && (
                        <>
                          {" · "}
                          <a
                            href={paso.supuesto.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            fuente
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              ))}

              <p className="vin-muted vin-t-sm mt-4 leading-relaxed">{r.porQueEseNivel}</p>

              {r.riesgos.map((x, i) => (
                <p key={i} className="vin-t-sm mt-2 leading-relaxed" style={{ color: "var(--vin-warn)" }}>
                  ⚠ {x}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// El reparto: qué se hace el lunes.
//
// Va ARRIBA de las rutas sueltas, no debajo, porque es la respuesta a la
// pregunta que de verdad se hace: no "por dónde entra más barato" sino "cómo
// reparto lo que tengo". Las rutas quedan abajo como el material con el que se
// discute esa decisión.
function PanelReparto({
  r,
  elegido,
  onElegir,
}: {
  r: Reparto;
  elegido: boolean;
  onElegir: () => void;
}) {
  if (!r.pedazos.length) {
    return (
      <Panel>
        <div className="vin-eyebrow mb-2">Cómo repartirlo</div>
        <p className="vin-t-base leading-relaxed">{r.titular}</p>
        {r.porQueNoMas && <p className="vin-faint vin-t-sm mt-3 leading-relaxed">{r.porQueNoMas}</p>}
      </Panel>
    );
  }

  const maximo = Math.max(...r.pedazos.map((x) => x.montoUsd));

  return (
    <div
      className="rounded-[--r-lg] p-6"
      style={{
        border: elegido ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
        background: elegido ? "rgba(224,72,58,0.06)" : "var(--vin-surface-2)",
      }}
    >
      <div className="vin-eyebrow mb-2">Cómo repartirlo</div>
      <p className="vin-faint vin-t-sm mb-5 leading-relaxed" style={{ maxWidth: "72ch" }}>
        {r.regla}
      </p>

      <div className="flex flex-col gap-4">
        {r.pedazos.map((x) => (
          <div key={x.rutaId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="vin-t-base font-medium">
                {x.plaza} <span className="vin-faint">· {x.canalLabel}</span>
              </span>
              <span className="vin-t-lg vin-serif tabular-nums">US${n(x.montoUsd)}</span>
            </div>
            {/* La barra hace visible de un vistazo que el peso sigue al calor.
                Un listado de cifras obliga a compararlas de cabeza. */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--vin-border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(x.montoUsd / maximo) * 100}%`,
                  background: ACCION_COLOR[x.accionDePlaza],
                }}
              />
            </div>
            <p className="vin-faint vin-t-sm mt-1.5 leading-relaxed">
              {x.porQue} Espera {n(x.oyentesBajo)}–{n(x.oyentesAlto)} oyentes
              {x.seguidoresBajo != null && <> y {n(x.seguidoresBajo)}–{n(x.seguidoresAlto!)} seguidores</>}.
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--vin-border)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="vin-muted vin-t-sm">Sumando todo el reparto</span>
          <span className="vin-t-lg tabular-nums">
            {n(r.oyentesBajoTotal)}–{n(r.oyentesAltoTotal)} oyentes
            {r.seguidoresBajoTotal != null && (
              <span className="vin-faint">
                {" "}
                · {n(r.seguidoresBajoTotal)}–{n(r.seguidoresAltoTotal!)} seguidores
              </span>
            )}
          </span>
        </div>
        {r.sinRepartirUsd > 0 && (
          <p className="vin-faint vin-t-sm mt-1">Quedan US${n(r.sinRepartirUsd)} sin asignar por redondeo.</p>
        )}
      </div>

      {r.porQueNoMas && (
        <p className="vin-t-sm mt-4 leading-relaxed" style={{ color: "var(--vin-warn)", maxWidth: "72ch" }}>
          {r.porQueNoMas}
        </p>
      )}
      {r.avisos.map((a, i) => (
        <p key={i} className="vin-faint vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "72ch" }}>
          {a}
        </p>
      ))}

      <button onClick={onElegir} className={`mt-5 ${elegido ? "vin-btn-primary" : "vin-btn-ghost"}`} disabled={elegido}>
        {elegido ? "Reparto elegido" : "Usar este reparto"}
      </button>
    </div>
  );
}

// El calendario. Su razón de ser no es organizar: es impedir un error de
// lectura concreto y caro. Los oyentes mensuales de Spotify son una ventana
// móvil de 28 días, así que a los siete días una campaña que está funcionando
// se ve como si no hiciera nada — y es cuando la gente la apaga.
function Calendario({ hitos, aviso }: { hitos: Hito[]; aviso: string | null }) {
  return (
    <div>
      {aviso && (
        <p
          className="vin-t-base mb-5 leading-relaxed"
          style={{ color: "var(--vin-warn)", maxWidth: "76ch" }}
        >
          {aviso}
        </p>
      )}
      <div className="flex flex-col">
        {hitos.map((h, i) => (
          <div key={i} className="flex gap-4 border-b py-4 last:border-b-0" style={{ borderColor: "var(--vin-border)" }}>
            <div className="w-[92px] shrink-0">
              <div className="vin-t-sm tabular-nums" style={{ color: h.pasado ? "var(--vin-dim)" : "var(--vin-text)" }}>
                {h.fecha}
              </div>
              {/* Convención movible vs. consecuencia de cómo funciona la
                  métrica. La diferencia decide qué se puede negociar. */}
              <div className="vin-t-xs" style={{ color: h.esConvencion ? "var(--vin-dim)" : "var(--vin-accent)" }}>
                {h.esConvencion ? "convención" : "no movible"}
              </div>
            </div>
            <div className="min-w-0 flex-1" style={{ opacity: h.pasado ? 0.5 : 1 }}>
              <div className="vin-t-base font-medium">{h.titulo}</div>
              <p className="vin-faint vin-t-sm mt-1 leading-relaxed">{h.queSeHace}</p>
              {h.queSeMide && (
                <p className="vin-t-sm mt-1.5 leading-relaxed" style={{ color: "var(--vin-muted)" }}>
                  Se mide: {h.queSeMide}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Colaboraciones en juego.
//
// Lo que este panel NO hace, y hay que decirlo: no dice qué plaza abre cada
// colaborador. A&R no guarda audiencia por ciudad de los candidatos, así que
// cruzarlos con el mapa de plazas sería inventar un dato que nadie cargó.
// Lo que sí puede decir es cuándo tiene que estar cerrado cada uno, que es la
// parte que de verdad se rompe: un feature que se confirma dos semanas antes de
// la salida ya no alcanza a grabarse, mezclarse y registrarse.
function Colaboraciones({ proyecto, fechaSalida }: { proyecto: VincereProyecto; fechaSalida: string }) {
  const evaluados = proyecto.arDiagnostico?.candidatos ?? [];
  const perseguir = evaluados.filter((c) => c.veredicto === "perseguir" || c.veredicto === "explorar");

  const limite = new Date(fechaSalida + "T12:00:00");
  limite.setDate(limite.getDate() - 30);
  const fechaLimite = limite.toISOString().slice(0, 10);

  if (!evaluados.length) {
    return (
      <p className="vin-muted vin-t-base leading-relaxed">
        A&R no ha evaluado colaboradores para este proyecto. Si la canción va con feature, esa decisión tiene que estar
        cerrada antes del {fechaLimite} — treinta días antes de la salida — o no alcanza a grabarse y registrarse.
      </p>
    );
  }

  return (
    <div>
      <p className="vin-muted vin-t-base leading-relaxed" style={{ maxWidth: "76ch" }}>
        Si «{proyecto.nombre}» sale con feature, la decisión tiene que estar cerrada antes del{" "}
        <span style={{ color: "var(--vin-text)" }}>{fechaLimite}</span>. Después de esa fecha ya no alcanza a grabarse,
        mezclarse y registrarse a tiempo.
      </p>
      {perseguir.length ? (
        <div className="mt-4 flex flex-col gap-3">
          {perseguir.map((c) => (
            <div key={c.nombre}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="vin-t-base font-medium">{c.nombre}</span>
                <span className="vin-faint vin-t-sm">{c.veredicto}</span>
              </div>
              <p className="vin-faint vin-t-sm mt-0.5 leading-relaxed">{c.queGana}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="vin-faint vin-t-sm mt-3 leading-relaxed">
          Ningún candidato quedó en «perseguir» ni «explorar». Salir sola es la lectura de A&R, no una omisión.
        </p>
      )}
      <p className="vin-faint vin-t-sm mt-4 leading-relaxed" style={{ maxWidth: "76ch" }}>
        El sistema no dice qué plaza abre cada colaborador: A&R no guarda audiencia por ciudad de los candidatos, y
        cruzarlos con el mapa de plazas sería inventar un dato que nadie cargó.
      </p>
    </div>
  );
}

function Cierre({ proyecto, l }: { proyecto: VincereProyecto; l: VincereLanzamiento }) {
  const cerrarLanzamiento = useVincereStore((s) => s.cerrarLanzamiento);
  const reabrirLanzamiento = useVincereStore((s) => s.reabrirLanzamiento);
  const [form, setForm] = useState({ valorLogrado: "", porQue: "", queCambiar: "" });

  if (!l.objetivo) {
    return (
      <p className="vin-muted vin-t-base leading-relaxed">
        Falta fijar el objetivo. Sin una meta escrita antes, no hay contra qué medir el resultado.
      </p>
    );
  }

  if (l.cierre) {
    const c = l.cierre;
    const delta = c.valorLogrado - l.objetivo.valorInicial;
    const meta = l.objetivo.valorMeta - l.objetivo.valorInicial;
    return (
      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span
            className="vin-t-lg font-medium"
            style={{ color: c.cumplio ? "var(--vin-ok)" : "var(--vin-risk)" }}
          >
            {c.cumplio ? "Se cumplió" : "No se cumplió"}
          </span>
          <button
            onClick={() => reabrirLanzamiento(proyecto.id, l.id)}
            className="vin-faint vin-t-sm hover:underline"
          >
            reabrir
          </button>
        </div>
        <p className="vin-t-base mt-3 leading-relaxed">
          Buscábamos <span className="tabular-nums">{n(l.objetivo.valorMeta)}</span> y llegamos a{" "}
          <span className="tabular-nums">{n(c.valorLogrado)}</span>. Sobre una partida de{" "}
          <span className="tabular-nums">{n(l.objetivo.valorInicial)}</span>, eso es{" "}
          <span className="tabular-nums">{delta >= 0 ? "+" : ""}{n(delta)}</span> de los{" "}
          <span className="tabular-nums">{n(meta)}</span> que se buscaban
          {meta > 0 && <> — un {Math.round((delta / meta) * 100)}% de la meta</>}.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <div className="vin-faint vin-t-sm">Por qué pasó</div>
            <p className="vin-t-base mt-1 leading-relaxed">{c.porQue}</p>
          </div>
          {/* Si quedó vacío se dice, en vez de dejar un rótulo colgando: un
              cierre sin aprendizaje es la mitad del trabajo y hay que verlo. */}
          <div>
            <div className="vin-faint vin-t-sm">Qué se hace distinto</div>
            {c.queCambiar ? (
              <p className="vin-t-base mt-1 leading-relaxed">{c.queCambiar}</p>
            ) : (
              <p className="vin-faint vin-t-base mt-1 leading-relaxed">
                No se escribió. Sin esto el cierre queda como anécdota y la próxima campaña arranca igual de ciega.
              </p>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const vencido = hoy >= l.objetivo.fechaCorte;

  return (
    <Panel>
      <p className="vin-muted vin-t-base leading-relaxed">
        {vencido
          ? "Llegó la fecha de corte. Toca decir qué pasó — incluso si no pasó nada."
          : `El corte es el ${l.objetivo.fechaCorte}. Se puede cerrar antes, pero el número que se escriba es el que queda.`}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="vin-faint vin-t-sm">{l.objetivo.metrica} — valor real al corte</span>
          <input
            type="number"
            className="vin-input"
            value={form.valorLogrado}
            onChange={(e) => setForm({ ...form, valorLogrado: e.target.value })}
            placeholder={`partida: ${l.objetivo.valorInicial} · meta: ${l.objetivo.valorMeta}`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="vin-faint vin-t-sm">Por qué pasó lo que pasó</span>
          <textarea
            className="vin-input min-h-[80px]"
            value={form.porQue}
            onChange={(e) => setForm({ ...form, porQue: e.target.value })}
            placeholder="El CTR real, si la creatividad aguantó, si la plaza respondió, qué se rompió."
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="vin-faint vin-t-sm">Qué se hace distinto la próxima</span>
          <textarea
            className="vin-input min-h-[60px]"
            value={form.queCambiar}
            onChange={(e) => setForm({ ...form, queCambiar: e.target.value })}
            placeholder="Sin esto, el cierre es un lamento y no un aprendizaje."
          />
        </label>
        <div>
          <button
            className="vin-btn-primary"
            disabled={!form.valorLogrado.trim() || !form.porQue.trim()}
            onClick={() =>
              cerrarLanzamiento(proyecto.id, l.id, {
                valorLogrado: Number(form.valorLogrado) || 0,
                porQue: form.porQue.trim(),
                queCambiar: form.queCambiar.trim(),
              })
            }
          >
            Cerrar el lanzamiento
          </button>
        </div>
      </div>
    </Panel>
  );
}

export default function LanzamientoSection({ proyecto }: { proyecto: VincereProyecto }) {
  const addLanzamiento = useVincereStore((s) => s.addLanzamiento);
  const addPrediccion = useVincereStore((s) => s.addPrediccion);
  const updateLanzamiento = useVincereStore((s) => s.updateLanzamiento);
  const deleteLanzamiento = useVincereStore((s) => s.deleteLanzamiento);

  const lanzamientos = proyecto.lanzamientos ?? [];
  const [activoId, setActivoId] = useState<string | null>(null);
  const activo = lanzamientos.find((l) => l.id === activoId) ?? lanzamientos[0] ?? null;

  const [decl, setDecl] = useState({
    cancionId: "",
    fechaSalida: "",
    presupuestoUsd: "1500",
  });
  const [obj, setObj] = useState({ valorInicial: "", valorMeta: "", fechaCorte: "" });

  const [objetivo, setObjetivo] = useState<ObjetivoCampana>(OBJETIVO_POR_DEFECTO);

  const plan = useMemo(
    () => (activo ? planDeLanzamiento(proyecto, activo.presupuestoUsd, 2, objetivo) : null),
    [proyecto, activo, objetivo]
  );
  const rutaElegida = plan?.rutas.find((r) => r.id === activo?.rutaElegidaId) ?? null;
  const usandoReparto = activo?.rutaElegidaId === ID_REPARTO;

  // Lo que se eligió, sea una ruta sola o el reparto completo. El paso 3 no
  // tiene que saber cuál de las dos es: solo necesita contra qué medir.
  const eleccion = usandoReparto && plan?.reparto.pedazos.length
    ? {
        titulo: `Reparto en ${plan.reparto.pedazos.length} ${plan.reparto.pedazos.length === 1 ? "plaza" : "plazas"}`,
        oyentesBajo: plan.reparto.oyentesBajoTotal,
        metrica: "Oyentes mensuales sumando todas las plazas del reparto",
        senal: `Oyentes mensuales en ${plan.reparto.pedazos
          .map((x) => x.plaza)
          .join(", ")} (Spotify for Artists → Audiencia), medidos el día antes de arrancar y 30 días después.`,
        deDonde: `Suma de los bordes bajos del reparto de US$${activo?.presupuestoUsd} en ${plan.reparto.pedazos
          .map((x) => `${x.plaza} US$${x.montoUsd}`)
          .join(", ")}.`,
        // El nivel de la meta es el del eslabón más flojo de todas las rutas
        // del reparto: la campaña entera no puede ser más firme que su pedazo
        // peor sostenido.
        nivel: Math.min(
          ...plan.reparto.pedazos.map(
            (x) => plan.rutas.find((r) => r.id === x.rutaId)?.nivelMasDebil ?? 1
          )
        ) as NivelSupuesto,
      }
    : rutaElegida
      ? {
          titulo: `${rutaElegida.canalLabel} en ${rutaElegida.plaza}`,
          oyentesBajo: rutaElegida.oyentesBajo,
          metrica: `Oyentes mensuales en ${rutaElegida.plaza}`,
          senal: rutaElegida.senal,
          deDonde: `Borde bajo de la ruta ${rutaElegida.canalLabel} · ${rutaElegida.plaza} con US$${rutaElegida.presupuestoUsd}. La ruta se apoya en un supuesto de nivel ${rutaElegida.nivelMasDebil}, así que la meta hereda esa firmeza.`,
          nivel: rutaElegida.nivelMasDebil,
        }
      : null;

  function declarar() {
    const c = proyecto.canciones.find((x) => x.id === decl.cancionId);
    if (!decl.fechaSalida || !c) return;
    addLanzamiento(proyecto.id, {
      cancionId: c.id,
      nombreCancion: c.nombre,
      fechaSalida: decl.fechaSalida,
      presupuestoUsd: Number(decl.presupuestoUsd) || 0,
      rutaElegidaId: null,
      rutaElegidaLabel: null,
      objetivo: null,
      notas: "",
    });
    setDecl({ cancionId: "", fechaSalida: "", presupuestoUsd: "1500" });
  }

  // La meta que propone el sistema sale del borde BAJO de la ruta, no del alto.
  // Proponer el techo sería armar el fracaso desde el primer día: el borde bajo
  // es lo que la cadena sostiene aunque todo salga mediocre.
  const metaSugerida =
    eleccion && obj.valorInicial !== "" ? Number(obj.valorInicial) + eleccion.oyentesBajo : null;

  return (
    <SectionShell
      proyecto={proyecto}
      seccion="lanzamiento"
      eyebrow="Sacar la canción"
      title="Hoja de ruta"
      subtitle="De un presupuesto en dólares a una ruta con plaza, canal, expectativa y fecha de corte. Cada número lleva de dónde salió."
      aiTitle="Lectura VINCERE — Lanzamiento"
    >
      {lanzamientos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {lanzamientos.map((l) => (
            <button
              key={l.id}
              onClick={() => setActivoId(l.id)}
              className="vin-t-sm rounded-full px-3 py-1.5"
              style={{
                border: l.id === activo?.id ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
                color: l.id === activo?.id ? "var(--vin-text)" : "var(--vin-muted)",
              }}
            >
              {l.nombreCancion} · {l.fechaSalida}
              {l.cierre && " ✓"}
            </button>
          ))}
        </div>
      )}

      <Paso
        n={1}
        titulo="Declarar el lanzamiento"
        estado={activo ? `${activo.nombreCancion} · sale el ${activo.fechaSalida} · US$${activo.presupuestoUsd}` : "sin declarar"}
      >
        {activo ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="vin-muted vin-t-base">
              Todo lo de abajo se calcula contra estos tres datos.
            </p>
            <button
              onClick={() => deleteLanzamiento(proyecto.id, activo.id)}
              className="vin-faint vin-t-sm hover:underline"
            >
              borrar y empezar otro
            </button>
          </div>
        ) : proyecto.canciones.length === 0 ? (
          <p className="vin-muted vin-t-base leading-relaxed">
            No hay canciones cargadas. La hoja de ruta se arma sobre una canción concreta, no sobre el artista en
            abstracto: entra a Song Intelligence y carga la que va a salir.
          </p>
        ) : (
          <Panel>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">Qué canción sale</span>
                <select
                  className="vin-input"
                  value={decl.cancionId}
                  onChange={(e) => setDecl({ ...decl, cancionId: e.target.value })}
                >
                  <option value="">Elegir…</option>
                  {proyecto.canciones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">Cuándo sale</span>
                <input
                  type="date"
                  className="vin-input"
                  value={decl.fechaSalida}
                  onChange={(e) => setDecl({ ...decl, fechaSalida: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">Presupuesto de pauta (USD)</span>
                <input
                  type="number"
                  className="vin-input"
                  value={decl.presupuestoUsd}
                  onChange={(e) => setDecl({ ...decl, presupuestoUsd: e.target.value })}
                />
              </label>
            </div>
            <button className="vin-btn-primary mt-4" onClick={declarar} disabled={!decl.cancionId || !decl.fechaSalida}>
              Armar la hoja de ruta
            </button>
          </Panel>
        )}
      </Paso>

      <Paso
        n={2}
        titulo="Comparar por dónde entra"
        estado={plan ? `${plan.rutas.filter((r) => !r.noEjecutable).length} rutas` : "falta el paso 1"}
      >
        {!plan ? (
          <p className="vin-muted vin-t-base">Declara el lanzamiento arriba y las rutas aparecen acá.</p>
        ) : (
          <>
            <p className="vin-t-lg leading-relaxed" style={{ maxWidth: "72ch" }}>
              {plan.titular}
            </p>

            {plan.avisos.map((a, i) => (
              <p key={i} className="vin-t-sm mt-2 leading-relaxed" style={{ color: "var(--vin-warn)" }}>
                {a}
              </p>
            ))}

            {/* El objetivo cambia el costo por oyente más que el país: con el
                mismo presupuesto, alcance sale 4,7× más barato por oyente que
                conversiones. Va arriba de todo porque cambia todos los números
                de abajo. */}
            <div className="mt-5">
              <div className="vin-muted vin-t-sm mb-2 font-medium">Con qué objetivo se compra</div>
              <div className="flex flex-wrap gap-2">
                {(["alcance", "trafico", "conversion"] as ObjetivoCampana[]).map((o) => (
                  <button
                    key={o}
                    onClick={() => setObjetivo(o)}
                    className="vin-t-sm rounded-full px-3 py-1.5"
                    style={{
                      border: objetivo === o ? "1px solid var(--vin-accent)" : "1px solid var(--vin-border)",
                      color: objetivo === o ? "var(--vin-text)" : "var(--vin-muted)",
                      background: objetivo === o ? "rgba(224,72,58,0.12)" : "transparent",
                    }}
                  >
                    {OBJETIVO_LABEL[o]}
                  </button>
                ))}
              </div>
              <p className="vin-faint vin-t-sm mt-2.5 leading-relaxed" style={{ maxWidth: "74ch" }}>
                {OBJETIVOS[objetivo].queEs} {OBJETIVOS[objetivo].cuandoSirve}
              </p>
              <p className="vin-faint vin-t-xs mt-1.5 leading-relaxed">
                CPM ×{OBJETIVOS[objetivo].factorCpm} y CTR ×{OBJETIVOS[objetivo].factorCtr} sobre la base de la plaza ·{" "}
                <a href={FUENTE_OBJETIVOS.url} target="_blank" rel="noreferrer" className="underline">
                  {FUENTE_OBJETIVOS.fuente}
                </a>
              </p>
            </div>

            <div className="mt-6">
              <PanelReparto
                r={plan.reparto}
                elegido={usandoReparto}
                onElegir={() =>
                  activo &&
                  updateLanzamiento(proyecto.id, activo.id, {
                    rutaElegidaId: ID_REPARTO,
                    rutaElegidaLabel: `Reparto en ${plan.reparto.pedazos.length} ${
                      plan.reparto.pedazos.length === 1 ? "plaza" : "plazas"
                    }`,
                  })
                }
              />
            </div>

            {/* Las rutas sueltas quedan debajo del reparto: son el material
                para discutir la decisión, no la decisión. Cada una asume el
                presupuesto COMPLETO, que es lo que las hace comparables entre
                sí — y por eso no se pueden sumar. */}
            <div className="mt-7">
              <div className="vin-muted vin-t-sm mb-1 font-medium">
                O todo por una sola ruta
              </div>
              <p className="vin-faint vin-t-sm mb-4 leading-relaxed" style={{ maxWidth: "72ch" }}>
                Cada una supone el presupuesto entero en esa plaza y ese canal. Sirven para comparar cuál rinde más
                por dólar; no se suman entre sí.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {plan.rutas.map((r) => (
                <TarjetaRuta
                  key={r.id}
                  r={r}
                  elegida={r.id === activo?.rutaElegidaId}
                  onElegir={() =>
                    activo &&
                    updateLanzamiento(proyecto.id, activo.id, {
                      rutaElegidaId: r.id,
                      rutaElegidaLabel: `${r.canalLabel} · ${r.plaza}`,
                    })
                  }
                />
              ))}
            </div>

            {plan.descartadas.length > 0 && (
              <div className="mt-6">
                <div className="vin-muted vin-t-sm mb-2 font-medium">
                  Dónde NO se pauta, y por qué
                </div>
                {plan.descartadas.map((d) => (
                  <p key={d.ciudad} className="vin-faint vin-t-sm mb-1.5 leading-relaxed">
                    <span className="vin-muted">{d.ciudad}</span> — {d.porQue}
                  </p>
                ))}
              </div>
            )}

            {plan.enCola.length > 0 && (
              <div className="mt-5">
                <div className="vin-muted vin-t-sm mb-2 font-medium">
                  Califican, pero quedaron fuera del corte de este plan
                </div>
                {plan.enCola.map((d) => (
                  <p key={d.ciudad} className="vin-faint vin-t-sm mb-1.5 leading-relaxed">
                    <span className="vin-muted">
                      #{d.prioridad} {d.ciudad}
                    </span>{" "}
                    — {d.porQue}
                  </p>
                ))}
              </div>
            )}

            {plan.paraCalibrar.length > 0 && (
              <div className="vin-accent-card mt-6 p-5">
                <div className="vin-eyebrow mb-2">Lo que haría esto mucho más firme</div>
                {plan.paraCalibrar.map((x, i) => (
                  <p key={i} className="vin-t-sm mb-1.5 leading-relaxed">
                    · {x}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </Paso>

      <Paso
        n={3}
        titulo="Fijar qué estamos buscando"
        estado={activo?.objetivo ? "objetivo fijado" : eleccion ? "falta fijarlo" : "falta decidir arriba"}
      >
        {!eleccion ? (
          <p className="vin-muted vin-t-base leading-relaxed">
            Arriba: o usas el reparto completo, o eliges una sola ruta. La meta se propone desde lo que elijas, no al
            aire.
          </p>
        ) : activo?.objetivo ? (
          <Panel>
            <p className="vin-t-base leading-relaxed">
              <span className="vin-muted">{activo.objetivo.metrica}</span>: partimos de{" "}
              <span className="tabular-nums">{n(activo.objetivo.valorInicial)}</span> y buscamos{" "}
              <span className="tabular-nums">{n(activo.objetivo.valorMeta)}</span> para el{" "}
              {activo.objetivo.fechaCorte}.
            </p>
            <p className="vin-faint vin-t-sm mt-2 leading-relaxed">{activo.objetivo.deDonde}</p>
            {!activo.cierre && (
              <button
                onClick={() => updateLanzamiento(proyecto.id, activo.id, { objetivo: null })}
                className="vin-faint vin-t-sm mt-3 hover:underline"
              >
                cambiar el objetivo
              </button>
            )}
          </Panel>
        ) : (
          <Panel>
            <p className="vin-muted vin-t-base leading-relaxed">
              Se va a ejecutar: <span className="vin-t-base" style={{ color: "var(--vin-text)" }}>{eleccion.titulo}</span>. Lo
              que se mide: {eleccion.senal}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">{eleccion.metrica} — hoy</span>
                <input
                  type="number"
                  className="vin-input"
                  value={obj.valorInicial}
                  onChange={(e) => setObj({ ...obj, valorInicial: e.target.value })}
                  placeholder="el número del día antes de arrancar"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">Meta</span>
                <input
                  type="number"
                  className="vin-input"
                  value={obj.valorMeta || (metaSugerida ?? "")}
                  onChange={(e) => setObj({ ...obj, valorMeta: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="vin-faint vin-t-sm">Fecha de corte</span>
                <input
                  type="date"
                  className="vin-input"
                  value={obj.fechaCorte}
                  onChange={(e) => setObj({ ...obj, fechaCorte: e.target.value })}
                />
              </label>
            </div>
            {/* La regla se explica siempre, aunque todavía no haya número: si
                solo apareciera después de escribir la partida, quien llega por
                primera vez no entiende de dónde va a salir la meta. */}
            <p className="vin-faint vin-t-sm mt-3 leading-relaxed">
              {metaSugerida != null ? (
                <>
                  El sistema propone <span className="tabular-nums">{n(metaSugerida)}</span>: la partida más el borde
                  BAJO ({n(eleccion.oyentesBajo)} oyentes), no el alto.
                </>
              ) : (
                <>
                  Al escribir la partida, el sistema propone la meta sumándole el borde BAJO (
                  {n(eleccion.oyentesBajo)} oyentes), no el alto.
                </>
              )}{" "}
              Proponer el techo sería armar el fracaso desde el primer día.
            </p>
            <button
              className="vin-btn-primary mt-4"
              disabled={!obj.valorInicial || !obj.fechaCorte || !activo}
              onClick={() => {
                if (!activo) return;
                const meta = Number(obj.valorMeta || metaSugerida) || 0;
                const inicial = Number(obj.valorInicial) || 0;
                updateLanzamiento(proyecto.id, activo.id, {
                  objetivo: {
                    metrica: eleccion.metrica,
                    valorInicial: inicial,
                    valorMeta: meta,
                    fechaCorte: obj.fechaCorte,
                    deDonde: eleccion.deDonde,
                  },
                });
                // El objetivo de un lanzamiento ES una predicción: dice que un
                // número va a estar en cierto punto en cierta fecha, y se puede
                // demostrar falso. Entra al marcador solo, con el nivel del
                // eslabón más débil de la cadena que lo produjo — nadie lo
                // escribe a mano, y por eso mide al sistema.
                addPrediccion(proyecto.id, {
                  motor: "lanzamiento",
                  origen: "motor",
                  afirmacion: `«${activo.nombreCancion}»: ${eleccion.metrica.toLocaleLowerCase("es")} pasa de ${n(
                    inicial
                  )} a ${n(meta)} con US$${activo.presupuestoUsd} por ${eleccion.titulo}.`,
                  comoSeVerifica: eleccion.senal,
                  venceEn: obj.fechaCorte,
                  nivelAlEmitir: eleccion.nivel as VincereNivel,
                });
              }}
            >
              Fijar el objetivo
            </button>
          </Panel>
        )}
      </Paso>

      <Paso
        n={4}
        titulo="El calendario"
        estado={activo ? `sale el ${activo.fechaSalida}` : "falta el paso 1"}
      >
        {activo ? (
          <>
            <Calendario {...calendarioDeLanzamiento(activo.fechaSalida, activo.objetivo?.fechaCorte ?? null)} />
            <div className="mt-7">
              <div className="vin-muted vin-t-sm mb-2 font-medium">Colaboraciones en juego</div>
              <Colaboraciones proyecto={proyecto} fechaSalida={activo.fechaSalida} />
            </div>
          </>
        ) : (
          <p className="vin-muted vin-t-base">Declara el lanzamiento y el calendario se arma solo desde la fecha.</p>
        )}
      </Paso>

      <Paso n={5} titulo="Cerrar el ciclo" estado={activo?.cierre ? "cerrado" : "abierto"}>
        {activo ? (
          <Cierre proyecto={proyecto} l={activo} />
        ) : (
          <p className="vin-muted vin-t-base">Sin lanzamiento declarado no hay nada que cerrar.</p>
        )}
      </Paso>

      <p className="vin-faint vin-t-sm leading-relaxed" style={{ maxWidth: "76ch" }}>
        {ADVERTENCIA_LANZAMIENTO}
      </p>
    </SectionShell>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  proyectoNombre,
  selectEconomiaNueva,
  selectPersonasEsperando,
  selectPrioridadDelDia,
  selectProximoCompromiso,
} from "@/lib/selectors";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioPage() {
  const router = useRouter();
  const proyectos = useAppStore((s) => s.proyectos);
  const personas = useAppStore((s) => s.personas);
  const acciones = useAppStore((s) => s.acciones);
  const movimientos = useAppStore((s) => s.movimientos);
  const agenda = useAppStore((s) => s.agenda);
  const modoEnfoque = useAppStore((s) => s.modoEnfoque);
  const askAssistant = useAppStore((s) => s.askAssistant);

  const proximoCompromiso = selectProximoCompromiso(agenda);
  const economiaNueva = selectEconomiaNueva(movimientos);
  const esperando = selectPersonasEsperando(personas);
  const prioridades = selectPrioridadDelDia(acciones);

  const riesgosCriticos = proyectos.filter(
    (p) => (p.estado === "En riesgo" || p.estado === "Bloqueado" || p.riesgos.length > 0) && p.estado !== "Cerrado"
  );

  const prioridadesVisibles = modoEnfoque ? prioridades.slice(0, 1) : prioridades;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{greeting()}, Eduardo</h2>
        <p className="text-sm text-muted mt-1">
          {modoEnfoque
            ? "Modo enfoque activo — mostrando solo lo esencial."
            : "Aquí está el estado de tu operación hoy."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5">
          <div className="text-[11px] uppercase tracking-wide text-muted">Próximo compromiso</div>
          {proximoCompromiso ? (
            <>
              <div className="mt-2 font-semibold leading-snug">{proximoCompromiso.titulo}</div>
              <div className="text-sm text-muted mt-1">
                {proyectoNombre(proyectos, proximoCompromiso.proyectoId)},{" "}
                {new Date(proximoCompromiso.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} ·{" "}
                {proximoCompromiso.hora}
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted">Sin compromisos próximos registrados.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-5">
          <div className="text-[11px] uppercase tracking-wide text-muted">Economía nueva</div>
          {economiaNueva.movimientos.length > 0 ? (
            <>
              <div className="mt-2 font-semibold text-accent-green">
                +${economiaNueva.total.toLocaleString("es-ES")} confirmados
              </div>
              <div className="text-sm text-muted mt-1">
                desde {proyectoNombre(proyectos, economiaNueva.movimientos[0].proyectoId)} (
                {new Date(economiaNueva.movimientos[0].fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })})
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted">Sin movimientos nuevos confirmados.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface p-5">
          <div className="text-[11px] uppercase tracking-wide text-muted">Esperando respuesta</div>
          {esperando.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {esperando.slice(0, 3).map((p) => (
                <li key={p.id} className="text-sm">
                  <span className="font-medium">{p.nombre}</span>{" "}
                  <span className="text-muted">· {p.diasSinResponder} días</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-muted">Nadie esperando respuesta.</div>
          )}
        </div>
      </div>

      {!modoEnfoque && riesgosCriticos.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Alertas críticas</h3>
          <div className="space-y-2">
            {riesgosCriticos.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-accent-red/30 bg-accent-red/5 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-sm">{p.nombre}</span>
                  <span className="text-sm text-muted ml-2">{p.riesgos[0]}</span>
                </div>
                <button
                  onClick={() => router.push("/proyectos")}
                  className="text-xs text-accent-red font-medium shrink-0"
                >
                  Ver proyecto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Prioridad del día</h3>
        <div className="space-y-2">
          {prioridadesVisibles.length === 0 && (
            <p className="text-sm text-muted">No hay acciones abiertas — todo al día.</p>
          )}
          {prioridadesVisibles.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3"
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  a.prioridad === "P1" ? "bg-accent-red" : "bg-accent-blue"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.titulo}</div>
                <div className="text-xs text-muted">
                  {proyectoNombre(proyectos, a.proyectoId)} · {a.fecha}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!modoEnfoque && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-muted mb-3">Acciones rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => askAssistant("¿Qué hago ahora?")}
              className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm hover:border-accent-blue transition-colors"
            >
              ¿Qué hago ahora?
            </button>
            <button
              onClick={() => router.push("/bandeja?focus=1")}
              className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm hover:border-accent-blue transition-colors"
            >
              Registrar novedad
            </button>
            <button
              onClick={() => router.push("/decisiones")}
              className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm hover:border-accent-blue transition-colors"
            >
              Analizar decisión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { fetchServerState, initDbSchema, migrateAllToServer } from "@/lib/db/sync";

type DbStatus = "checking" | "no_configurada" | "sin_esquema" | "vacia" | "activa";
type PushStatus = "checking" | "no_soportado" | "sin_db" | "inactivas" | "activas" | "bloqueadas";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(Array.from(raw, (c) => c.charCodeAt(0)));
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const modoEnfoque = useAppStore((s) => s.modoEnfoque);
  const toggleModoEnfoque = useAppStore((s) => s.toggleModoEnfoque);
  const resetToSeed = useAppStore((s) => s.resetToSeed);
  const historial = useAppStore((s) => s.historial);

  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [migrating, setMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [pushStatus, setPushStatus] = useState<PushStatus>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setPushStatus("no_soportado");
        return;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        if (!cancelled) setPushStatus("bloqueadas");
        return;
      }
      try {
        const res = await fetch("/api/push");
        const body = await res.json();
        if (cancelled) return;
        if (!body.configured) {
          setPushStatus("sin_db");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setPushStatus(sub ? "activas" : "inactivas");
      } catch {
        if (!cancelled) setPushStatus("inactivas");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("bloqueadas");
        setPushMsg("Permiso denegado. Habilítalo en la configuración del navegador.");
        setPushBusy(false);
        return;
      }
      const res = await fetch("/api/push");
      const body = await res.json();
      if (!body.publicKey) throw new Error(body.error ?? "Sin clave pública");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(body.publicKey) as BufferSource,
      });
      const save = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON() }),
      });
      if (!save.ok) throw new Error("No se pudo guardar la suscripción");
      setPushStatus("activas");
      setPushMsg("Notificaciones activadas en este dispositivo.");
    } catch (err) {
      setPushMsg(`No se pudo activar: ${(err as Error).message}`);
    }
    setPushBusy(false);
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushStatus("inactivas");
      setPushMsg("Notificaciones desactivadas en este dispositivo.");
    } catch (err) {
      setPushMsg(`Error: ${(err as Error).message}`);
    }
    setPushBusy(false);
  }

  async function handleTestPush() {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error");
      setPushMsg(
        body.sent > 0
          ? `Notificación de prueba enviada a ${body.sent} dispositivo(s).`
          : "No hay dispositivos suscritos todavía."
      );
    } catch (err) {
      setPushMsg(`Error: ${(err as Error).message}`);
    }
    setPushBusy(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const server = await fetchServerState();
      if (cancelled) return;
      if (!server || !server.configured) {
        setDbStatus("no_configurada");
        return;
      }
      if (server.error) {
        setDbStatus("sin_esquema");
        return;
      }
      const hasData =
        (server.proyectos?.length ?? 0) > 0 ||
        (server.acciones?.length ?? 0) > 0 ||
        (server.decisiones?.length ?? 0) > 0 ||
        (server.movimientos?.length ?? 0) > 0 ||
        (server.evidencias?.length ?? 0) > 0 ||
        (server.bandeja?.length ?? 0) > 0 ||
        (server.personas?.length ?? 0) > 0;
      setDbStatus(hasData ? "activa" : "vacia");
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  async function handleInitSchema() {
    setInitializing(true);
    setInitMsg(null);
    const result = await initDbSchema();
    setInitializing(false);
    if (result.ok) {
      setInitMsg("Esquema creado. Verificando…");
      setDbStatus("checking");
      setRefreshTick((t) => t + 1);
    } else {
      setInitMsg(`No se pudo crear el esquema: ${result.error}`);
    }
  }

  async function handleMigrate() {
    if (
      !confirm(
        "Esto copiará todos tus datos locales actuales a la base de datos. Desde ese momento, la base de datos será la fuente de información en todos tus dispositivos. ¿Continuar?"
      )
    ) {
      return;
    }
    setMigrating(true);
    setMigrationMsg(null);
    const state = useAppStore.getState();
    const result = await migrateAllToServer({
      proyectos: state.proyectos,
      personas: state.personas,
      acciones: state.acciones,
      decisiones: state.decisiones,
      movimientos: state.movimientos,
      evidencias: state.evidencias,
      bandeja: state.bandeja,
      agenda: state.agenda,
      historial: state.historial,
      strategicCases: state.strategicCases,
      tiempo: state.tiempo,
    });
    setMigrating(false);
    if (result.ok) {
      setMigrationMsg(`Migración completa: ${result.inserted} registros copiados. Recargando…`);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setMigrationMsg(
        `Migración parcial: ${result.inserted} registros copiados, ${result.errors.length} errores. Revisa la consola.`
      );
      console.error("Errores de migración", result.errors);
    }
  }

  function handleExport() {
    const state = useAppStore.getState();
    const { proyectos, personas, acciones, decisiones, movimientos, evidencias, bandeja, agenda, historial } = state;
    const data = { proyectos, personas, acciones, decisiones, movimientos, evidencias, bandeja, agenda, historial };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cco-ev-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  function handleReset() {
    if (confirm("Esto restaurará los datos de ejemplo y perderás los cambios locales. ¿Continuar?")) {
      resetToSeed();
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Section title="Cuenta">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Eduardo</div>
            <div className="text-xs text-muted mt-0.5">Sistema privado de un solo usuario</div>
          </div>
          <button onClick={handleLogout} className="text-sm text-accent-red font-medium">
            Cerrar sesión
          </button>
        </div>
      </Section>

      <Section title="Modo de trabajo">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Modo enfoque</div>
            <div className="text-xs text-muted mt-0.5 max-w-sm">
              Reduce la vista de Inicio a una sola alerta y una acción cuando estás saturado o disperso.
            </div>
          </div>
          <button
            onClick={toggleModoEnfoque}
            className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
              modoEnfoque ? "bg-accent-blue" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                modoEnfoque ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </Section>

      <Section title="Privacidad y seguridad">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-2 text-sm text-muted">
          <p>Acceso protegido por contraseña, gestionada mediante la variable de entorno del servidor.</p>
          <p>Los datos se guardan localmente en este navegador — no se comparten con terceros ni se usan para entrenar modelos.</p>
          <div className="flex items-center justify-between gap-3">
            <p>{historial.length} cambios registrados en el historial de auditoría.</p>
            <button
              onClick={() => router.push("/actividad")}
              className="text-xs font-medium text-accent-blue shrink-0"
            >
              Ver historial completo
            </button>
          </div>
        </div>
      </Section>

      <Section title="Datos">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Exportar todos los datos</div>
              <div className="text-xs text-muted mt-0.5">Descarga un JSON con proyectos, acciones, decisiones y más.</div>
            </div>
            <button onClick={handleExport} className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm shrink-0">
              Exportar
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-border-subtle pt-3">
            <div>
              <div className="text-sm font-medium">Restaurar datos de ejemplo</div>
              <div className="text-xs text-muted mt-0.5">
                {dbStatus === "activa"
                  ? "No disponible: la base de datos es la fuente activa, así que al recargar volverían tus datos reales."
                  : "Vuelve al estado inicial de demostración."}
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={dbStatus === "activa"}
              className="rounded-full border border-accent-red/40 text-accent-red px-4 py-2 text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Restaurar
            </button>
          </div>
        </div>
      </Section>

      <Section title="Base de datos y sincronización">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-3">
          {dbStatus === "checking" && <p className="text-sm text-muted">Verificando conexión…</p>}

          {dbStatus === "no_configurada" && (
            <div className="space-y-1">
              <div className="text-sm font-medium">No configurada</div>
              <p className="text-xs text-muted">
                Los datos solo viven en este navegador. Para tener la misma información en el celular y el PC,
                falta configurar <code className="text-foreground">DATABASE_URL</code> en el servidor.
              </p>
            </div>
          )}

          {dbStatus === "sin_esquema" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Conectada — falta crear las tablas</div>
                <p className="text-xs text-muted mt-0.5">
                  La conexión a la base de datos funciona, pero todavía no tiene las tablas necesarias.
                  Esto se hace una sola vez.
                </p>
              </div>
              <button
                onClick={handleInitSchema}
                disabled={initializing}
                className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {initializing ? "Creando…" : "Crear tablas en la base de datos"}
              </button>
              {initMsg && <p className="text-xs text-muted">{initMsg}</p>}
            </div>
          )}

          {dbStatus === "vacia" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Conectada — todavía sin datos</div>
                <p className="text-xs text-muted mt-0.5">
                  La base de datos está lista pero vacía. Migra tus datos actuales para empezar a usarla como
                  fuente única en todos tus dispositivos.
                </p>
              </div>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {migrating ? "Migrando…" : "Migrar datos locales a la base de datos"}
              </button>
              {migrationMsg && <p className="text-xs text-muted">{migrationMsg}</p>}
            </div>
          )}

          {dbStatus === "activa" && (
            <div className="space-y-1">
              <div className="text-sm font-medium">Conectada — fuente activa de datos</div>
              <p className="text-xs text-muted">
                Los cambios se guardan en la base de datos y se ven igual en cualquier dispositivo donde entres.
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Notificaciones">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 space-y-3">
          {pushStatus === "checking" && <p className="text-sm text-muted">Verificando…</p>}

          {pushStatus === "no_soportado" && (
            <p className="text-sm text-muted">
              Este navegador no soporta notificaciones push. En el celular, instala la app
              (Añadir a pantalla de inicio) y actívalas desde ahí.
            </p>
          )}

          {pushStatus === "sin_db" && (
            <p className="text-sm text-muted">
              Las notificaciones requieren la base de datos configurada (sección anterior).
            </p>
          )}

          {pushStatus === "bloqueadas" && (
            <p className="text-sm text-muted">
              Las notificaciones están bloqueadas para este sitio. Habilítalas en la configuración
              del navegador y recarga.
            </p>
          )}

          {pushStatus === "inactivas" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Desactivadas en este dispositivo</div>
                <p className="text-xs text-muted mt-0.5">
                  Actívalas para recibir el resumen de tu día cada mañana (7 a.m.) y avisos cuando
                  algo urgente aparezca. Actívalas en cada dispositivo donde las quieras.
                </p>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={pushBusy}
                className="rounded-full bg-accent-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {pushBusy ? "Activando…" : "Activar notificaciones"}
              </button>
            </div>
          )}

          {pushStatus === "activas" && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium">Activas en este dispositivo</div>
                <p className="text-xs text-muted mt-0.5">
                  Recibirás el resumen de tu día cada mañana a las 7 a.m. (hora Colombia).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleTestPush}
                  disabled={pushBusy}
                  className="rounded-full bg-surface-2 border border-border-subtle px-4 py-2 text-sm disabled:opacity-50"
                >
                  Enviar prueba
                </button>
                <button
                  onClick={handleDisablePush}
                  disabled={pushBusy}
                  className="rounded-full border border-accent-red/40 text-accent-red px-4 py-2 text-sm disabled:opacity-50"
                >
                  Desactivar
                </button>
              </div>
            </div>
          )}

          {pushMsg && <p className="text-xs text-muted">{pushMsg}</p>}
        </div>
      </Section>

      <Section title="Versión">
        <div className="rounded-2xl border border-border-subtle bg-surface p-5 text-sm text-muted">
          <p>
            <span className="font-mono text-foreground">{process.env.NEXT_PUBLIC_BUILD_SHA}</span>
            {" · desplegado "}
            {new Date(process.env.NEXT_PUBLIC_BUILD_TIME as string).toLocaleString("es-ES", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-muted mb-2">{title}</h3>
      {children}
    </div>
  );
}

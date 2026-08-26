"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereSyncEstado, fetchVincereState, migrarTodoVincere, startVincereSync } from "@/lib/vincere/db";

const SyncContext = createContext<VincereSyncEstado>("desconocido");
export const useVincereSync = () => useContext(SyncContext);

export default function VincereHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useVincereStore.persist.hasHydrated());
  const [sync, setSync] = useState<VincereSyncEstado>("desconocido");
  const arrancado = useRef(false);

  // 1) Rehidrata la copia del navegador para pintar de inmediato.
  useEffect(() => {
    const unsub = useVincereStore.persist.onFinishHydration(() => {
      // La papelera caduca por cálculo, no por temporizador, y este es el
      // único momento garantizado en que se mira: un setInterval solo corre
      // con la pestaña abierta, y la cuenta tiene que ser cierta también
      // después de tres semanas sin entrar.
      useVincereStore.getState().purgarPapelera();
      setHydrated(true);
    });
    if (!useVincereStore.persist.hasHydrated()) {
      useVincereStore.persist.rehydrate();
    }
    return () => unsub();
  }, []);

  // 2) Ya pintado, consulta la base. Si tiene contenido, manda ella; y desde
  //    ahí queda observando el store para ir guardando lo que cambie.
  useEffect(() => {
    if (!hydrated || arrancado.current) return;
    arrancado.current = true;
    let detener: (() => void) | undefined;

    (async () => {
      const server = await fetchVincereState();
      if (!server || !server.configured) {
        setSync("local");
        return;
      }
      if (server.error) {
        setSync("error");
        return;
      }
      if (server.proyectos?.length) {
        useVincereStore.getState().hidratarDesdeServidor({
          proyectos: server.proyectos,
          triageCasos: server.triageCasos ?? [],
          comparaciones: server.comparaciones ?? {},
        });
        setSync("sincronizado");
      } else {
        // Base configurada pero vacía: es la primera conexión. Se sube lo que
        // ya había en este navegador, porque la suscripción de abajo solo
        // reacciona a cambios futuros y si no, ese trabajo se quedaría aquí.
        const subida = await migrarTodoVincere();
        setSync(subida.ok ? "sincronizado" : "error");
      }
      detener = startVincereSync(setSync);
    })();

    return () => detener?.();
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center vin-t-sm text-muted">Cargando VINCERE…</div>
    );
  }

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

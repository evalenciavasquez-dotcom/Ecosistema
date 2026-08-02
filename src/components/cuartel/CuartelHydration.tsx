"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import { CuartelSyncEstado, fetchCuartelState, migrarTodoCuartel, startCuartelSync } from "@/lib/cuartel/db";

const SyncContext = createContext<CuartelSyncEstado>("desconocido");
export const useCuartelSync = () => useContext(SyncContext);

export default function CuartelHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useCuartelStore.persist.hasHydrated());
  const [sync, setSync] = useState<CuartelSyncEstado>("desconocido");
  const arrancado = useRef(false);

  useEffect(() => {
    const unsub = useCuartelStore.persist.onFinishHydration(() => setHydrated(true));
    if (!useCuartelStore.persist.hasHydrated()) {
      useCuartelStore.persist.rehydrate();
    }
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hydrated || arrancado.current) return;
    arrancado.current = true;
    let detener: (() => void) | undefined;

    (async () => {
      const server = await fetchCuartelState();
      if (!server || !server.configured) {
        setSync("local");
        return;
      }
      if (server.error) {
        setSync("error");
        return;
      }
      if (server.escenarios?.length) {
        useCuartelStore.getState().hidratarDesdeServidor(server.escenarios);
        setSync("sincronizado");
      } else {
        // Base configurada y vacía: primera conexión. Se sube lo que había en
        // este navegador — la suscripción de abajo solo ve cambios futuros.
        const subida = await migrarTodoCuartel();
        setSync(subida.ok ? "sincronizado" : "error");
      }
      detener = startCuartelSync(setSync);
    })();

    return () => detener?.();
  }, [hydrated]);

  if (!hydrated) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">Cargando el Cuartel…</div>;
  }

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>;
}

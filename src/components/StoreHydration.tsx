"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

export default function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
      useAppStore.getState().hydrateFromServer();
    });
    if (!useAppStore.persist.hasHydrated()) {
      useAppStore.persist.rehydrate();
    } else {
      useAppStore.getState().hydrateFromServer();
    }
    return () => unsub();
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted text-sm">
        Cargando C.C.O. E.V.…
      </div>
    );
  }

  return <>{children}</>;
}

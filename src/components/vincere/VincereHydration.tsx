"use client";

import { useEffect, useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";

export default function VincereHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(() => useVincereStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useVincereStore.persist.onFinishHydration(() => setHydrated(true));
    if (!useVincereStore.persist.hasHydrated()) {
      useVincereStore.persist.rehydrate();
    }
    return () => unsub();
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">Cargando VINCERE…</div>
    );
  }

  return <>{children}</>;
}

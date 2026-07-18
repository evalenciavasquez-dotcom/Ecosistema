"use client";

import { useSearchParams } from "next/navigation";

// Lee ?open=<id> de la URL — usado por la búsqueda de la barra superior
// para abrir el ítem exacto en vez de solo llevar a la sección.
// El componente que lo use debe estar envuelto en <Suspense>.
export function useOpenParam(): string | null {
  return useSearchParams().get("open");
}

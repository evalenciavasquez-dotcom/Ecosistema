"use client";

// Aviso de llave de IA faltante, antes de apretar y no después.
//
// La lección viene de VINCERE: "falta la llave" en local y "falta la llave" en
// producción se ven igual y se arreglan en lugares distintos, así que el aviso
// dice también dónde. El hook consulta una sola vez por carga de página y es
// infraestructura de despliegue, no datos — nada del Cuartel lo cruza.
import { useIaConfigurada } from "@/lib/vincere/useIaConfigurada";

export function useSinLlave(): boolean {
  const ia = useIaConfigurada();
  // Arranca en null mientras viaja la respuesta: pintar la alarma ahí sería
  // una alarma falsa en cada carga.
  return ia !== null && !ia.configurada;
}

export default function AvisoSinLlave({ que }: { que: string }) {
  const ia = useIaConfigurada();
  if (ia === null || ia.configurada) return null;

  return (
    <div
      className="mt-3 rounded-sm px-3.5 py-2.5"
      style={{
        maxWidth: "70ch",
        color: "var(--cua-amarillo)",
        background: "rgba(201,154,58,0.09)",
        border: "1px solid rgba(201,154,58,0.24)",
      }}
    >
      <p className="text-[12.5px] leading-relaxed">
        Falta <code>ANTHROPIC_API_KEY</code>. {que} El candado, la validez y el registro siguen funcionando: eso lo
        calcula el sistema, no el modelo.
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ opacity: 0.85 }}>
        {ia.comoSeArregla}
      </p>
    </div>
  );
}

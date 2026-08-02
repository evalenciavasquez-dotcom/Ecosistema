"use client";

import { useVincereStore } from "@/lib/vincere/store";
import { VincereSeccion, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";

// La navegación sigue el recorrido del método, no una lista de funciones. El
// orden es el argumento: primero entra la data, después se lee dónde está el
// artista, después la obra y el público, después el negocio, y solo al final se
// decide y se sale afuera. Una lista plana de dieciocho motores obliga a cada
// persona a inventarse ese orden en la cabeza.
const GRUPOS: { titulo: string; secciones: VincereSeccion[] }[] = [
  { titulo: "Entra la data", secciones: ["ingesta", "investigacion"] },
  { titulo: "Dónde está hoy", secciones: ["resumen", "diagnostico", "marca"] },
  { titulo: "La obra y el público", secciones: ["song", "ar", "audiencia", "calor", "touring"] },
  { titulo: "El negocio", secciones: ["monetizacion", "oportunidad", "kpis"] },
  { titulo: "Decidir y salir afuera", secciones: ["management", "stress", "pitch", "triage"] },
  { titulo: "El marcador", secciones: ["predicciones"] },
];

// Secciones P1 del PRD — se activan una a una en fases posteriores.
const PROXIMAMENTE = [
  "Finanzas y Presupuesto",
  "Valoración de Carrera",
  "Legal y Derechos",
  "Relaciones de Industria",
  "Playbook",
];

function Item({
  label,
  activo,
  onClick,
  sufijo,
  style,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
  sufijo?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-r-sm px-3 py-2 text-left vin-t-base transition-colors"
      style={{
        borderLeft: activo ? "2px solid var(--vin-accent)" : "2px solid transparent",
        background: activo ? "rgba(224,72,58,0.12)" : "transparent",
        color: activo ? "var(--vin-text)" : "var(--vin-muted)",
        ...style,
      }}
    >
      {label}
      {sufijo && <span className="vin-faint ml-1.5">{sufijo}</span>}
    </button>
  );
}

export default function VincereNav() {
  const seccion = useVincereStore((s) => s.seccion);
  const compareOn = useVincereStore((s) => s.compareOn);
  const compareId = useVincereStore((s) => s.compareProyectoId);
  const proyectos = useVincereStore((s) => s.proyectos);
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const toggleCompare = useVincereStore((s) => s.toggleCompare);

  const compareTarget = proyectos.find((p) => p.id === compareId);
  const activa = (key: VincereSeccion) => !compareOn && seccion === key;

  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto px-3 py-3 md:w-[252px] md:flex-col md:gap-0 md:overflow-y-auto md:py-6"
      style={{ borderColor: "var(--vin-border)" }}
    >
      {/* En móvil la nav es una fila que hace scroll, así que el grupo no debe
          crear caja (contents). En escritorio sí, y en columna: con
          display:block los botones fluirían en línea. */}
      {GRUPOS.map((g, i) => (
        <div key={g.titulo} className="contents md:flex md:flex-col">
          <div className={`vin-label hidden px-3 pb-2 md:block ${i === 0 ? "" : "pt-5"}`}>{g.titulo}</div>
          {g.secciones.map((key) => (
            <Item
              key={key}
              label={VINCERE_SECCION_LABEL[key]}
              activo={activa(key)}
              onClick={() => setSeccion(key)}
            />
          ))}
        </div>
      ))}

      {/* Fuera de los grupos: no son motores de análisis. Comparación cruza dos
          proyectos, el informe es lo que se emite, y la documentación se
          consulta. */}
      <div
        className="mt-0 md:mt-5 md:border-t md:pt-4"
        style={{ borderColor: "var(--vin-border)" }}
      >
        {compareTarget && (
          <Item
            label="Comparación"
            activo={compareOn}
            onClick={toggleCompare}
            sufijo={`· ${compareTarget.nombre}`}
          />
        )}
        <Item
          label={VINCERE_SECCION_LABEL.informe}
          activo={activa("informe")}
          onClick={() => setSeccion("informe")}
          sufijo="↓"
        />
        <Item
          label={VINCERE_SECCION_LABEL.manual}
          activo={activa("manual")}
          onClick={() => setSeccion("manual")}
        />
      </div>

      <div
        className="vin-label mt-4 hidden px-3 pb-2.5 pt-4 md:block"
        style={{ borderTop: "1px solid var(--vin-border)" }}
      >
        Próximamente
      </div>
      <div className="hidden md:block">
        {PROXIMAMENTE.map((label) => (
          <div key={label} className="px-3 py-1.5 vin-t-sm" style={{ color: "var(--vin-dim)" }}>
            {label} · pronto
          </div>
        ))}
      </div>
    </nav>
  );
}

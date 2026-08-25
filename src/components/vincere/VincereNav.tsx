"use client";

import { useVincereStore } from "@/lib/vincere/store";
import { VincereSeccion, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";

// La navegación es el método, y el orden es el argumento.
//
// La versión anterior agrupaba por TEMA —"la obra y el público", "el
// negocio"—, y los temas son cómo se archivan las cosas, no cómo se trabaja.
// El resultado fue que Triage, que es la PRIMERA decisión —¿entro a este
// caso?—, quedó en el séptimo grupo, debajo de doce pantallas de análisis que
// solo tienen sentido cuando ya decidiste entrar. Quien abría la app por
// primera vez creaba el proyecto, cargaba data, y recién entonces encontraba
// la pantalla que servía para decidir si valía la pena hacer todo eso.
//
// Ahora el orden es la secuencia real de un caso, y va numerado porque el
// número es lo único que no se puede malinterpretar:
//
//   1. ¿Entro?        decidir si el caso vale la pena
//   2. Qué tengo      la data entra y se ve dónde está parado
//   3. La obra        qué hay para trabajar
//   4. Qué hago       las decisiones que salen del diagnóstico
//   5. El negocio     convertirlo en caja
//   6. Afuera         lo que sale del sistema hacia terceros
//   7. El marcador    si esto acierta o no
//
// Los grupos 1 y 2 son los que casi siempre se usan. Del 3 en adelante es
// profundidad, y está bien que quede abajo.
const GRUPOS: { titulo: string; secciones: VincereSeccion[] }[] = [
  { titulo: "1 · ¿Entro al caso?", secciones: ["triage", "investigacion"] },
  { titulo: "2 · Qué tengo", secciones: ["ingesta", "resumen", "diagnostico"] },
  { titulo: "3 · La obra y el público", secciones: ["song", "marca", "audiencia", "calor"] },
  { titulo: "4 · Qué hago", secciones: ["lanzamiento", "ar", "touring", "stress"] },
  { titulo: "5 · El negocio", secciones: ["monetizacion", "oportunidad", "kpis", "management"] },
  { titulo: "6 · Hacia afuera", secciones: ["pitch"] },
  { titulo: "7 · El marcador", secciones: ["predicciones", "global"] },
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

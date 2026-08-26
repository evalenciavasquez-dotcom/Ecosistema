"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import { VincereSeccion, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";

// La navegación es el método, y el orden es el argumento.
//
// El orden es la secuencia real de un caso, y va numerado porque el número es
// lo único que no se puede malinterpretar:
//
//   1. Cargar data    entra el material, y ahí se decide a dónde va
//   2. ¿Entro?        el veredicto sobre casos que todavía no son proyecto
//   3. Qué tengo      dónde está parado el artista
//   4. La obra        qué hay para trabajar
//   5. Qué hago       las decisiones que salen del diagnóstico
//   6. El negocio     convertirlo en caja
//   7. Afuera         lo que sale del sistema hacia terceros
//   8. El marcador    si esto acierta o no
//
// Lo que cambió ahora es que el orden se puede LEER. Antes los ocho grupos
// estaban abiertos a la vez: veintidós renglones del mismo peso, más cinco
// muertos de «próximamente» al final. Eso no es una barra de navegación, es un
// índice — y un índice de veintidós entradas no ayuda a elegir, solo pesa.
//
// Ahora se abre el grupo donde estás y los demás quedan en su título. Se ve la
// secuencia entera de un vistazo y solo los destinos del tramo en el que
// trabajas. En móvil no se pliega nada: ahí la barra es una fila que se
// desliza y esconder cosas sería esconderlas de verdad.
const GRUPOS: { titulo: string; secciones: VincereSeccion[] }[] = [
  { titulo: "Cargar data", secciones: ["ingesta"] },
  { titulo: "¿Entro al caso?", secciones: ["triage", "investigacion"] },
  { titulo: "Qué tengo", secciones: ["resumen", "diagnostico"] },
  { titulo: "La obra y el público", secciones: ["song", "marca", "audiencia", "calor"] },
  { titulo: "Qué hago", secciones: ["lanzamiento", "ar", "touring", "stress"] },
  { titulo: "El negocio", secciones: ["monetizacion", "oportunidad", "kpis", "management"] },
  { titulo: "Hacia afuera", secciones: ["pitch"] },
  { titulo: "El marcador", secciones: ["predicciones", "global"] },
];

// Secciones P1 del PRD. Ocupaban cinco renglones muertos en cada pantalla:
// anunciar en todo momento lo que el producto todavía NO hace es la clase de
// ruido que se paga con atención. Quedan en una línea que se puede consultar.
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
  oculto = false,
  anidado = false,
}: {
  label: string;
  activo: boolean;
  onClick: () => void;
  sufijo?: string;
  // Plegado: fuera en escritorio, presente en móvil.
  oculto?: boolean;
  // Cuelga de un grupo. Se sangra hasta la columna del título para que se vea
  // de quién depende; en móvil no, porque ahí no hay grupos que mostrar.
  anidado?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      data-activo={activo}
      className={`vin-nav-item shrink-0 whitespace-nowrap px-3 py-[7px] text-left vin-t-sm ${anidado ? "md:pl-8" : ""} ${oculto ? "md:hidden" : ""}`}
      style={{
        // El estado activo se llena de acento en vez de insinuarlo con un
        // lavado del 8%. Un acento que nunca se usa con convicción deja la
        // página entera en blanco y gris.
        background: activo ? "var(--vin-accent)" : "transparent",
        color: activo ? "var(--vin-accent-ink)" : "var(--vin-muted)",
        borderRadius: "var(--r-sm)",
        fontWeight: activo ? 600 : 400,
      }}
    >
      {label}
      {sufijo && (
        <span className="ml-1.5" style={{ opacity: 0.7 }}>
          {sufijo}
        </span>
      )}
    </button>
  );
}

// Una fila numerada de la secuencia. O abre un grupo (lleva chevron) o ES un
// destino (lleva estado activo). En móvil desaparece: ahí la barra es una fila
// que se desliza y los ocho títulos solo estorbarían.
function Fila({
  numero,
  titulo,
  destacada,
  abierto,
  activa = false,
  onClick,
}: {
  numero: number;
  titulo: string;
  destacada: boolean;
  abierto?: boolean;
  activa?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-activo={activa}
      className="vin-nav-item hidden items-center gap-2 px-3 py-2 text-left md:flex"
      style={{
        background: activa ? "var(--vin-accent)" : "transparent",
        color: activa ? "var(--vin-accent-ink)" : destacada ? "var(--vin-text)" : "var(--vin-faint)",
        borderRadius: "var(--r-sm)",
      }}
    >
      <span className="tabular-nums vin-t-xs" style={{ opacity: 0.65 }}>
        {numero}
      </span>
      <span
        className="vin-t-sm flex-1"
        style={{ fontFamily: "var(--font-display)", fontWeight: destacada || activa ? 600 : 500 }}
      >
        {titulo}
      </span>
      {abierto !== undefined && (
        <span
          className="vin-t-xs"
          style={{
            opacity: 0.5,
            transform: abierto ? "rotate(90deg)" : "none",
            transition: "transform .15s ease",
          }}
        >
          ›
        </span>
      )}
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

  // El grupo donde estás manda. Abrir otro a mano no cierra ese: mirar el
  // negocio mientras trabajas en la obra es un movimiento normal.
  const grupoActual = Math.max(
    0,
    GRUPOS.findIndex((g) => g.secciones.includes(seccion))
  );
  const [abiertos, setAbiertos] = useState<Record<number, boolean>>({});
  const estaAbierto = (i: number) => abiertos[i] ?? i === grupoActual;

  return (
    <nav
      className="flex shrink-0 gap-1 overflow-x-auto px-2.5 py-3 md:w-[228px] md:flex-col md:gap-0 md:overflow-y-auto md:py-5"
      style={{ borderColor: "var(--vin-border)" }}
    >
      {/* En móvil la nav es una fila que hace scroll, así que el grupo no debe
          crear caja (contents). En escritorio sí, y en columna: con
          display:block los botones fluirían en línea. */}
      {GRUPOS.map((g, i) => {
        const abierto = estaAbierto(i);
        const contieneActiva = !compareOn && g.secciones.includes(seccion);

        // Un grupo de un solo destino no es un grupo: es el destino.
        // Plegarlo escondía «Cargar data» —lo que más se usa y el paso 1 de
        // todo— detrás de un título que decía exactamente lo mismo. Estas
        // filas son el destino y nunca se ocultan; el número las mantiene en
        // la misma columna, así que la secuencia 1-8 se sigue leyendo entera.
        if (g.secciones.length === 1) {
          const key = g.secciones[0];
          return (
            <div key={g.titulo} className="contents md:flex md:flex-col">
              <Fila
                numero={i + 1}
                titulo={VINCERE_SECCION_LABEL[key]}
                destacada={contieneActiva}
                activa={activa(key)}
                onClick={() => setSeccion(key)}
              />
              {/* Fila es solo de escritorio; en móvil el destino sigue siendo
                  un botón más de la fila que se desliza. */}
              <Item
                label={VINCERE_SECCION_LABEL[key]}
                activo={activa(key)}
                onClick={() => setSeccion(key)}
                oculto
              />
            </div>
          );
        }

        return (
          <div key={g.titulo} className="contents md:flex md:flex-col">
            <Fila
              numero={i + 1}
              titulo={g.titulo}
              destacada={contieneActiva}
              abierto={abierto}
              onClick={() => setAbiertos((a) => ({ ...a, [i]: !estaAbierto(i) }))}
            />
            {g.secciones.map((key) => (
              <Item
                key={key}
                label={VINCERE_SECCION_LABEL[key]}
                activo={activa(key)}
                onClick={() => setSeccion(key)}
                oculto={!abierto}
                anidado
              />
            ))}
          </div>
        );
      })}

      {/* Fuera de los grupos: no son motores de análisis. Comparación cruza dos
          proyectos, el informe es lo que se emite, y la documentación se
          consulta. */}
      <div className="mt-0 md:mt-4 md:border-t md:pt-3" style={{ borderColor: "var(--vin-border)" }}>
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
        className="vin-faint mt-3 hidden px-3 pt-3 vin-t-xs md:block"
        style={{ borderTop: "1px solid var(--vin-border)" }}
        title={PROXIMAMENTE.join(" · ")}
      >
        {PROXIMAMENTE.length} secciones más, en camino
      </div>
    </nav>
  );
}

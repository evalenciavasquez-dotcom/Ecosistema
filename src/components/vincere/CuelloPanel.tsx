"use client";

import { useMemo } from "react";
import { VincereProyecto, VINCERE_SECCION_LABEL } from "@/lib/vincere/types";
import { cuelloDeBotella, EstadoEtapa, EtapaEvaluada } from "@/lib/vincere/cuello";
import { DONDE_SE_TRABAJA, DONDE_SE_CARGA } from "@/lib/vincere/siguientePaso";
import { useVincereStore } from "@/lib/vincere/store";
import { Panel } from "./primitives";
import EvidenceTag from "./EvidenceTag";
import { tinte } from "@/lib/vincere/color";

// Si hay un solo peso para gastar, ¿dónde va?
//
// El sistema mide once cosas y once lecturas no son una estrategia. Este panel
// es el que convierte medición en decisión, y por eso va arriba de todo: antes
// de los streams, antes del fan rate, antes de cualquier número suelto.
//
// ---------------------------------------------------------------------------
// Por qué dejó de ser una fila de seis columnas
// ---------------------------------------------------------------------------
//
// Estaba dibujado como seis tarjetas iguales, una al lado de la otra. Y eso
// decía, sin querer, exactamente lo contrario de lo que el panel afirma: seis
// columnas del mismo ancho se leen como seis cosas paralelas entre las que hay
// que elegir. La cadena no es eso. Es una SECUENCIA con un orden de arreglo
// deliberado —el alcance de último, porque es lo único que se puede comprar— y
// un orden no se ve en una fila de cajas.
//
// Encima no cabía: cada etapa sin data arrastra su línea de «falta», y una
// frase de doce palabras en una columna de 150px se parte en once renglones.
// El resultado era un texto que no daban ganas de leer, con la parte más
// importante —dónde va la plata— del mismo tamaño que las otras cinco.
//
// Ahora es una lista numerada, de arriba abajo, con un riel que la ata: el
// orden se ve, el texto tiene ancho de lectura, y el eslabón roto es el único
// que está encendido. Y la instrucción va ANTES de la evidencia, que es como se
// contesta una pregunta: primero la respuesta.

const COLOR: Record<EstadoEtapa, string> = {
  roto: "var(--vin-risk)",
  ok: "var(--vin-ok)",
  noSeSabe: "var(--vin-muted)",
};

// Una palabra corta se lee; un símbolo hay que descifrarlo. «×  ✓  ?» obligaba
// a recordar cuál era cuál, y el que no lo recuerda simplemente no lo mira.
const ESTADO_LABEL: Record<EstadoEtapa, string> = {
  roto: "roto",
  ok: "sano",
  noSeSabe: "sin data",
};

export default function CuelloPanel({ proyecto }: { proyecto: VincereProyecto }) {
  const setSeccion = useVincereStore((s) => s.setSeccion);
  const c = useMemo(() => cuelloDeBotella(proyecto), [proyecto]);

  const posicionCuello = c.cuello ? c.etapas.findIndex((e) => e.etapa === c.cuello!.etapa) : -1;
  const destino = c.cuello ? DONDE_SE_TRABAJA[c.cuello.etapa] : null;

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="vin-eyebrow">El cuello de botella</span>
        <EvidenceTag nivel={c.nivel} />
      </div>

      {/* Qué es esto. Va en el producto y no en una explicación aparte: si hay
          que preguntar qué hace el panel, el panel todavía no está terminado. */}
      <p className="vin-muted vin-t-sm mb-5 leading-relaxed" style={{ maxWidth: "74ch" }}>
        Si hay un solo peso para gastar, ¿dónde va? Una carrera es una cadena de seis etapas y se rompe por una sola.
        El cuello es la primera que falla en el orden en que conviene arreglarlas — y mientras siga rota, todo lo que
        se invierta más adelante en la cadena se escapa por ahí.
      </p>

      <p className="vin-display vin-t-xl leading-snug" style={{ maxWidth: "62ch" }}>
        {c.titular}
      </p>

      {/* La instrucción antes de la evidencia. Al revés obliga a recorrer seis
          etapas para llegar a lo único que hay que hacer hoy. */}
      <div
        className="mt-5 rounded-xl p-4"
        style={{ background: "var(--vin-tinte-accion)", border: "1px solid var(--vin-tinte-accion-linea)" }}
      >
        <div className="vin-block-title mb-3" style={{ borderBottomColor: "var(--vin-tinte-accion-linea)" }}>
          <span>{c.cuello ? "Ahí va el peso" : "Qué corresponde hacer"}</span>
        </div>
        <p
          lang="es"
          className="vin-t-base leading-relaxed"
          style={{ maxWidth: "70ch", textAlign: "justify", hyphens: "auto" }}
        >
          {c.queHacer}
        </p>
        {destino && (
          <button onClick={() => setSeccion(destino)} className="vin-btn-primary mt-4">
            Trabajarlo en {VINCERE_SECCION_LABEL[destino]} →
          </button>
        )}
      </div>

      {c.advertencia && (
        <p
          lang="es"
          className="vin-t-sm mt-3 rounded-xl px-4 py-3 leading-relaxed"
          style={{
            maxWidth: "74ch",
            color: "var(--vin-warn)",
            background: "var(--vin-warn-wash)",
            border: "1px solid var(--vin-warn-line)",
            textAlign: "justify",
            hyphens: "auto",
          }}
        >
          {c.advertencia}
        </p>
      )}

      {/* La cadena, de arriba abajo. El número no es decoración: es el orden de
          arreglo, que es la única cosa que este panel sabe y nadie más dice. */}
      <div className="vin-block-title mt-8 mb-4">
        <span>La cadena, en orden de arreglo</span>
      </div>

      <ol>
        {c.etapas.map((e, i) => (
          <Eslabon
            key={e.etapa}
            e={e}
            n={i + 1}
            esCuello={i === posicionCuello}
            despuesDelCuello={posicionCuello >= 0 && i > posicionCuello}
            ultimo={i === c.etapas.length - 1}
            onCargar={() => setSeccion(DONDE_SE_CARGA[e.etapa].seccion)}
          />
        ))}
      </ol>

      <p className="vin-faint vin-t-sm mt-5 leading-relaxed" style={{ maxWidth: "74ch" }}>
        El alcance va de último a propósito: es la única etapa que se puede comprar, y por eso es la que siempre se
        vende primero. Comprar oyentes encima de una fuga es la forma más cara de gastar que existe.
      </p>
    </Panel>
  );
}

function Eslabon({
  e,
  n,
  esCuello,
  despuesDelCuello,
  ultimo,
  onCargar,
}: {
  e: EtapaEvaluada;
  n: number;
  esCuello: boolean;
  despuesDelCuello: boolean;
  ultimo: boolean;
  onCargar: () => void;
}) {
  const color = COLOR[e.estado];

  return (
    <li className="relative flex gap-4" style={{ opacity: despuesDelCuello ? 0.45 : 1 }}>
      {/* El riel. Es lo que convierte seis filas en una cadena. */}
      {!ultimo && (
        <span
          aria-hidden
          className="absolute w-px"
          style={{ left: "13px", top: "30px", bottom: 0, background: "var(--vin-border-strong)" }}
        />
      )}

      <span
        className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full tabular-nums vin-t-xs"
        style={{
          background: esCuello ? "var(--vin-risk)" : "var(--vin-surface)",
          color: esCuello ? "var(--vin-accent-ink)" : color,
          border: `1px solid ${esCuello ? "var(--vin-risk)" : "var(--vin-border-strong)"}`,
        }}
      >
        {n}
      </span>

      <div
        className="min-w-0 flex-1 rounded-xl"
        style={
          esCuello
            ? {
                background: "var(--vin-risk-wash)",
                border: "1px solid var(--vin-risk-line)",
                padding: "0.7rem 1rem 0.85rem",
                marginBottom: "1.15rem",
              }
            : { padding: "0.2rem 1rem 0.9rem", marginBottom: "0.3rem" }
        }
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="vin-t-base font-medium">{e.label}</span>
          <span
            className="rounded-full border px-2 py-0.5 vin-t-xs font-medium"
            style={{ color, borderColor: tinte(color, 33) }}
          >
            {ESTADO_LABEL[e.estado]}
          </span>
          {esCuello && (
            <span className="vin-eyebrow" style={{ color: "var(--vin-risk)" }}>
              el cuello
            </span>
          )}
        </div>

        <div className="vin-faint vin-t-sm mt-1">{e.pregunta}</div>

        <p className="vin-t-sm mt-2 leading-relaxed" style={{ maxWidth: "70ch", color: e.estado === "roto" ? color : undefined }}>
          {e.evidencia}
        </p>

        {/* Estar ciego en una etapa tiene arreglo y es barato: se dice qué falta
            y se lleva a la pantalla donde se carga, en el mismo renglón. */}
        {e.falta && (
          <p className="vin-muted vin-t-sm mt-1.5 leading-relaxed" style={{ maxWidth: "70ch" }}>
            Falta: {e.falta}{" "}
            <button onClick={onCargar} className="hover:underline" style={{ color: "var(--vin-accent)" }}>
              cargarlo →
            </button>
          </p>
        )}

        {/* Apagar lo de abajo dice «todavía no» sin palabras, pero solo si ya
            sabías la regla. Dicha una vez, en el sitio donde se corta, no hace
            falta deducirla. */}
        {esCuello && !ultimo && (
          <p
            className="vin-t-sm mt-3 leading-relaxed"
            style={{
              maxWidth: "70ch",
              color: "var(--vin-risk)",
              borderTop: "1px solid var(--vin-risk-line)",
              paddingTop: "0.6rem",
            }}
          >
            De acá para abajo, todavía no: trabajar en las etapas siguientes mientras esta siga rota es trabajo que se
            escapa por el mismo hueco.
          </p>
        )}
      </div>
    </li>
  );
}

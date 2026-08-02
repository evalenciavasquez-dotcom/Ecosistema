"use client";

import { useState } from "react";
import { VincereCancion } from "@/lib/vincere/types";

// El paso a paso de Song Intelligence, dentro de la sección.
//
// Es la pantalla con más pasos de toda la plataforma —métricas, letra, audio,
// análisis externo, lectura— y hasta ahora llegabas a ella y veías paneles
// sueltos sin saber en qué orden llenarlos ni qué te daba cada uno. Un día de
// afán eso es suficiente para no usarla.
//
// Se abre sola cuando no hay canciones, y queda plegada cuando ya sabes.

interface Paso {
  n: number;
  titulo: string;
  que: string;
  da: string;
  // Si es obligatorio para que la lectura sirva, o si suma pero se puede omitir.
  obligatorio: boolean;
  hecho: (c: VincereCancion) => boolean;
}

const PASOS: Paso[] = [
  {
    n: 1,
    titulo: "Añade la canción con sus números",
    que: "«+ Agregar canción». Nombre, streams, retención %, skip % y playlist adds. Los tres últimos salen de Spotify for Artists → la canción → Audiencia.",
    da: "Ubica la canción contra el resto del catálogo. Sin retención y skip no se puede saber si la gente se queda.",
    obligatorio: true,
    hecho: (c) => c.streams > 0 || c.retencionPct > 0,
  },
  {
    n: 2,
    titulo: "Pega la letra",
    que: "En el panel «Letra», pegas el texto tal cual y guardas.",
    da: "Sílabas por verso, metro dominante, esquema de rima y regularidad — calculado, no interpretado. Es lo que permite leer la canción como obra y no como fila de números.",
    obligatorio: true,
    hecho: (c) => !!c.letra?.trim(),
  },
  {
    n: 3,
    titulo: "Sube el archivo de audio",
    que: "En el panel «Audio», sueltas el mp3 o wav. Se analiza en tu navegador — el archivo no sale de tu computador ni se guarda.",
    da: "Tempo, tonalidad, energía, rango dinámico, y el segundo exacto en que entra el gancho. Ese último dato es el que decide si alguien se queda.",
    obligatorio: false,
    hecho: (c) => !!c.audio,
  },
  {
    n: 4,
    titulo: "Pega el análisis externo",
    que: "En «Análisis externo y notas de producción», pegas lo que traiga Cyanite u otro servicio: instrumentos, mood, género, artistas similares.",
    da: "Lo que la plataforma no puede medir de la señal. Va marcado como fuente externa, así que la IA no lo confunde con lo medido aquí.",
    obligatorio: false,
    hecho: (c) => !!c.notasProduccion?.trim(),
  },
  {
    n: 5,
    titulo: "Analizar canción con VINCERE",
    que: "El botón dentro del detalle de la canción. Tarda: cruza todo lo anterior con la marca declarada del artista y su fase.",
    da: "Tema, gancho, a qué audiencia le habla, encaje con la marca, y una clasificación: single, álbum, relleno o incierto. Con su nivel de evidencia.",
    obligatorio: true,
    hecho: (c) => !!c.analisis,
  },
];

function Marca({ hecho, obligatorio }: { hecho: boolean; obligatorio: boolean }) {
  return (
    <span
      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full vin-t-xs"
      style={{
        border: `1px solid ${hecho ? "var(--vin-ok)" : obligatorio ? "var(--vin-border-strong)" : "var(--vin-border)"}`,
        color: hecho ? "var(--vin-ok)" : "var(--vin-faint)",
        background: hecho ? "rgba(78,201,138,0.12)" : "transparent",
      }}
    >
      {hecho ? "✓" : ""}
    </span>
  );
}

export default function SongGuia({ cancion }: { cancion: VincereCancion | null }) {
  const [abierta, setAbierta] = useState(!cancion);

  const completados = cancion ? PASOS.filter((p) => p.hecho(cancion)).length : 0;

  return (
    <div className="vin-card overflow-hidden">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="vin-t-base font-medium">Cómo se analiza una canción</div>
          <div className="vin-faint vin-t-sm mt-1">
            {cancion
              ? `${completados} de ${PASOS.length} pasos hechos en «${cancion.nombre}»`
              : "Cinco pasos. Los tres primeros son los que deciden si la lectura sirve."}
          </div>
        </div>
        <span className="vin-faint vin-t-sm shrink-0">{abierta ? "ocultar" : "ver los 5 pasos"}</span>
      </button>

      {abierta && (
        <div className="border-t px-5 pb-5" style={{ borderColor: "var(--vin-border)" }}>
          <ol className="flex flex-col">
            {PASOS.map((p) => {
              const hecho = cancion ? p.hecho(cancion) : false;
              return (
                <li
                  key={p.n}
                  className="flex gap-3.5 border-b py-4 last:border-b-0"
                  style={{ borderColor: "var(--vin-border)" }}
                >
                  <Marca hecho={hecho} obligatorio={p.obligatorio} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="vin-t-base font-medium">
                        {p.n}. {p.titulo}
                      </span>
                      {!p.obligatorio && (
                        <span className="vin-faint vin-t-xs">suma, pero se puede omitir</span>
                      )}
                    </div>
                    <p className="vin-muted vin-t-sm leading-relaxed">{p.que}</p>
                    <p className="vin-faint vin-t-sm mt-1.5 leading-relaxed">
                      <span style={{ color: "var(--vin-accent)" }}>Qué te da: </span>
                      {p.da}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* El uso real: no es analizar una canción suelta, es decidir cuál
              sale. Sin esto la sección parece un juguete de análisis. */}
          <div
            className="mt-5 rounded-xl p-5"
            style={{ background: "var(--vin-accent-soft)", border: "1px solid var(--vin-accent-glow)" }}
          >
            <div className="vin-t-base mb-2 font-medium">Para decidir qué canción lanzar</div>
            <ol className="vin-muted vin-t-sm flex flex-col gap-1.5 leading-relaxed">
              <li>1. Carga las candidatas —dos o tres— con los cinco pasos, y también la canción que mejor le ha funcionado hasta hoy.</li>
              <li>2. Analiza cada una. Cada una queda con su clasificación: single, álbum, relleno o incierto.</li>
              <li>3. Arriba de esta pantalla, «Generar lectura VINCERE». Esa lectura no mira canción por canción: busca el patrón entre las que retienen y las que se saltan — tempo, energía, dónde entra el gancho, de qué hablan.</li>
              <li>4. La que ya funcionó es la vara. Si una candidata se parece a ella en lo que importa, eso es un argumento; si se parece solo en el género, no lo es.</li>
            </ol>
            <p className="vin-faint vin-t-sm mt-3 leading-relaxed">
              Y cuando decidas, deja la apuesta escrita en Predicciones con su fecha. Es la única forma de saber
              después si esta lectura sirvió o si acertaste por otra razón.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

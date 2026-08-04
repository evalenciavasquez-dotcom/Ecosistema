"use client";

import { CANDADO_ROJOS_MINIMOS } from "@/lib/cuartel/candado";
import {
  CUARTEL_CERTEZA_DETALLE,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LEGAL_LABEL,
  CUARTEL_LUZ_COLOR,
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_PREGUNTA_LABEL,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CuartelCerteza,
  CuartelLegalNivel,
  CuartelPreguntaTipo,
} from "@/lib/cuartel/types";

// El manual, dentro del sistema. Si hay que salir a buscar cómo funciona el
// método, el método no se usa.
const CERTEZAS = Object.keys(CUARTEL_CERTEZA_LABEL) as CuartelCerteza[];
const LEGALES = Object.keys(CUARTEL_LEGAL_LABEL) as CuartelLegalNivel[];

const EJEMPLOS_INSTRUCTOR: Record<CuartelPreguntaTipo, string> = {
  contraste: "Entre seguir como está y no volver a hablarle nunca, ¿cuál te da más miedo?",
  confrontativa: "¿Ese beneficio lo tendrías igual si cortaras esto mañana, o depende de mantenerlo activo?",
  consistencia: "Esto se parece al patrón que vos mismo nombraste. ¿Qué hecho concreto lo hace distinto esta vez?",
  psicologica: "¿A quién le estás cuidando el sentimiento con esta decisión — al otro, o a vos?",
  aceptacion: "Eso sí se sostiene con datos, no con miedo. Queda anotado como válido.",
  cierre: "Ya dijiste lo que sabés y lo que sentís. Lo que falta, ¿es información o es coraje?",
};

function Titulo({ children }: { children: React.ReactNode }) {
  return <div className="cua-serif mb-2.5 text-[17px] font-semibold">{children}</div>;
}

export default function MetodoSection() {
  return (
    <div className="max-w-[820px]">
      <section className="mb-7">
        <Titulo>Las 3 rutas</Titulo>
        <p className="text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Toda decisión se compara mínimo entre <b style={{ color: "var(--cua-text)" }}>Cortar</b>,{" "}
          <b style={{ color: "var(--cua-text)" }}>Sostener</b> y <b style={{ color: "var(--cua-text)" }}>Rediseñar</b>.
          “No decidir” cuenta como la ruta explícita Sostener — nunca como ausencia de análisis.
        </p>
      </section>

      <section className="mb-7">
        <Titulo>Los 6 sombreros</Titulo>
        {CUARTEL_SOMBREROS.map((s) => {
          const meta = CUARTEL_SOMBRERO_META[s];
          return (
            <div key={s} className="flex gap-2.5 py-2" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
              <div className="mt-1 h-[9px] w-[9px] shrink-0 rounded-sm" style={{ background: meta.swatch }} />
              <div className="text-[13.5px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
                <b style={{ color: "var(--cua-text)" }}>{meta.label}</b> — {meta.pregunta}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mb-7">
        <Titulo>Semáforo de riesgo</Titulo>
        <p className="mb-3 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Cuatro métricas, siempre las mismas, para que dos rutas de dos escenarios distintos sigan siendo comparables.
          Un punto gris significa sin evaluar — no cuenta como verde.
        </p>
        {CUARTEL_METRICAS.map((m) => {
          const meta = CUARTEL_METRICA_META[m];
          return (
            <div key={m} className="py-2.5" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
              <div className="text-[14px]">{meta.label}</div>
              <div className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
                {meta.pregunta}
              </div>
              <div className="mt-1.5 space-y-1 text-[12.5px]">
                <div style={{ color: CUARTEL_LUZ_COLOR.rojo }}>Rojo — {meta.rojo}</div>
                <div style={{ color: CUARTEL_LUZ_COLOR.amarillo }}>Amarillo — {meta.amarillo}</div>
                <div style={{ color: CUARTEL_LUZ_COLOR.verde }}>Verde — {meta.verde}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mb-7">
        <Titulo>El candado</Titulo>
        <p className="text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Si la ruta <b style={{ color: "var(--cua-text)" }}>Sostener</b> acumula{" "}
          <b style={{ color: "var(--cua-text)" }}>{CANDADO_ROJOS_MINIMOS} de 4 métricas en rojo</b>, se descarta sola. No
          se negocia caso por caso y la validez no se edita a mano: se calcula.
        </p>
        <p className="mt-2.5 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Existe por una razón concreta: cuando el patrón de riesgo ya está identificado, sostener deja de ser una opción
          neutra y pasa a ser la repetición de algo que ya se demostró dañino. La ruta descartada no se borra — queda
          apagada y a la vista, para que se vea qué quedó afuera y por qué.
        </p>
      </section>

      <section className="mb-7">
        <Titulo>El Instructor — tipos de pregunta</Titulo>
        <p className="mb-2 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Ninguna ruta llega a válida sin una pregunta de Contraste o Confrontación respondida. Si aparece una
          justificación nueva, se pone a prueba una vez más — una, no infinitas.
        </p>
        {(Object.keys(CUARTEL_PREGUNTA_LABEL) as CuartelPreguntaTipo[]).map((t) => (
          <div key={t} className="py-2.5" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
            <div className="cua-mono text-[10.5px] uppercase tracking-[0.05em]" style={{ color: "var(--cua-accent)" }}>
              {CUARTEL_PREGUNTA_LABEL[t]}
            </div>
            <div className="mt-1 text-[13.5px] leading-relaxed" style={{ color: "var(--cua-text-2)" }}>
              “{EJEMPLOS_INSTRUCTOR[t]}”
            </div>
          </div>
        ))}
        <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: "var(--cua-faint)" }}>
          Pregunta y confronta; no diagnostica, no shamea, y no reemplaza a un profesional de salud mental.
        </p>
      </section>

      <section className="mb-7">
        <Titulo>Niveles de certeza</Titulo>
        <p className="mb-2 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          Obligatorios en Riesgos y en el patrón repetido: una lectura del sistema nunca se muestra como algo que vos
          confirmaste.
        </p>
        {CERTEZAS.map((c) => (
          <div key={c} className="py-2 text-[13.5px]" style={{ borderTop: "1px solid var(--cua-border-soft)" }}>
            <b>{CUARTEL_CERTEZA_LABEL[c]}</b>
            <span style={{ color: "var(--cua-text-2)" }}> — {CUARTEL_CERTEZA_DETALLE[c]}</span>
          </div>
        ))}
      </section>

      <section className="mb-7">
        <Titulo>Capa legal / fiscal</Titulo>
        <p className="mb-2 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          No es un séptimo sombrero: corre en paralelo y solo cuando la ruta tiene un ángulo legal, contractual o fiscal
          real, siempre de vida personal — nunca de negocio.
        </p>
        <div className="text-[13.5px]" style={{ color: "var(--cua-text-2)" }}>
          {LEGALES.map((n) => CUARTEL_LEGAL_LABEL[n]).join(" · ")}
        </div>
        <p className="mt-2.5 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-accent)" }}>
          Límite explícito: este sistema no reemplaza abogado ni contador colombiano. Identifica cuándo llamar a uno.
        </p>
      </section>

      <section>
        <Titulo>Lo que este sistema no es</Titulo>
        <ul className="space-y-1.5 text-[13.5px] leading-[1.7]" style={{ color: "var(--cua-text-2)" }}>
          <li>· No es terapia ni acompañamiento profesional de salud mental.</li>
          <li>· No es un diario ni un espacio de desahogo sin estructura.</li>
          <li>· No decide por vos: entrega el análisis, la decisión y la ejecución siguen siendo humanas.</li>
          <li>· No comparte datos con VINCERE, C.C.O.E.V. ni ningún proyecto de negocio.</li>
        </ul>
      </section>
    </div>
  );
}

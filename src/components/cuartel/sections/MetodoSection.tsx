"use client";

import { CANDADO_ROJOS_MINIMOS } from "@/lib/cuartel/candado";
import {
  CUARTEL_CERTEZA_DETALLE,
  CUARTEL_CERTEZA_LABEL,
  CUARTEL_LEGAL_LABEL,
  CUARTEL_METRICAS,
  CUARTEL_METRICA_META,
  CUARTEL_PREGUNTA_LABEL,
  CUARTEL_RUTA_DESCRIPCION,
  CUARTEL_RUTA_LABEL,
  CUARTEL_SOMBREROS,
  CUARTEL_SOMBRERO_META,
  CuartelCerteza,
  CuartelLegalNivel,
  CuartelPreguntaTipo,
  CuartelRutaTipo,
} from "@/lib/cuartel/types";
import { Panel, PanelLabel, SectionHeader } from "../primitives";

// El manual, dentro del sistema. Si hay que salir a buscar cómo funciona el
// método, el método no se usa.
const RUTAS_BASE: CuartelRutaTipo[] = ["cortar", "sostener", "rediseñar"];
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

export default function MetodoSection() {
  return (
    <>
      <SectionHeader
        eyebrow="Método"
        title="Cómo decide este sistema"
        subtitle="Las 3 rutas, los 6 sombreros, el semáforo, el candado y El Instructor. Sin salir de acá a consultar el manual."
      />

      <div className="space-y-4">
        <Panel>
          <PanelLabel>El flujo completo</PanelLabel>
          <p className="cua-mono text-[12px] leading-relaxed" style={{ color: "var(--cua-muted)" }}>
            escenario → contexto y tensión real → 3 rutas mínimo → 6 sombreros por ruta → semáforo → candado →
            comparación → recomendación → movida concreta → decisión → seguimiento → aprendizaje
          </p>
        </Panel>

        <Panel>
          <PanelLabel>Las 3 rutas base</PanelLabel>
          <p className="cua-muted mb-3.5 text-[13px] leading-relaxed">
            Nunca hay una decisión binaria. “No decidir” no es ausencia de análisis: es la ruta Sostener, y se evalúa con
            la misma vara que las otras dos.
          </p>
          <ul className="space-y-3">
            {RUTAS_BASE.map((t) => (
              <li key={t}>
                <div className="text-[14px]">{CUARTEL_RUTA_LABEL[t]}</div>
                <p className="cua-muted mt-1 text-[13px] leading-relaxed">{CUARTEL_RUTA_DESCRIPCION[t]}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelLabel>Los 6 sombreros</PanelLabel>
          <ul className="space-y-2.5">
            {CUARTEL_SOMBREROS.map((s) => {
              const meta = CUARTEL_SOMBRERO_META[s];
              return (
                <li key={s} className="text-[13.5px]">
                  <span aria-hidden>{meta.icono}</span> <span>{meta.label}</span>
                  <span className="cua-muted"> — {meta.pregunta}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelLabel>El semáforo</PanelLabel>
          <p className="cua-muted mb-3.5 text-[13px] leading-relaxed">
            Cuatro métricas, siempre las mismas. Se evalúan por ruta y son la base del candado.
          </p>
          <ul className="space-y-3.5">
            {CUARTEL_METRICAS.map((m) => {
              const meta = CUARTEL_METRICA_META[m];
              return (
                <li key={m}>
                  <div className="text-[14px]">{meta.label}</div>
                  <p className="cua-muted mt-1 text-[13px] leading-relaxed">{meta.pregunta}</p>
                  <div className="mt-1.5 space-y-1 text-[12.5px]">
                    <div style={{ color: "#e0483a" }}>Rojo — {meta.rojo}</div>
                    <div style={{ color: "#e0a83a" }}>Amarillo — {meta.amarillo}</div>
                    <div style={{ color: "#5cc98e" }}>Verde — {meta.verde}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="cua-accent-card">
          <PanelLabel>🔒 El candado</PanelLabel>
          <p className="text-[13.5px] leading-relaxed">
            Si la ruta es <strong>Sostener</strong> y tiene <strong>{CANDADO_ROJOS_MINIMOS} de 4 métricas en rojo</strong>,
            se descarta automáticamente. No se negocia caso por caso y la validez no se puede editar a mano — se calcula.
          </p>
          <p className="cua-muted mt-3 text-[13px] leading-relaxed">
            Existe por una razón concreta: cuando el patrón de riesgo ya está identificado, sostener deja de ser una
            opción neutra y pasa a ser la repetición de algo que ya se demostró dañino. La ruta descartada no se borra —
            queda a la vista, tachada, para que se vea qué quedó afuera y por qué.
          </p>
        </Panel>

        <Panel>
          <PanelLabel>El Instructor</PanelLabel>
          <p className="cua-muted mb-3.5 text-[13px] leading-relaxed">
            Ninguna ruta llega a tener validez calculada sin al menos una pregunta de Contraste o Confrontación
            respondida. Si aparece una justificación nueva, se pone a prueba una vez más — una, no infinitas.
          </p>
          <ul className="space-y-2.5">
            {(Object.keys(CUARTEL_PREGUNTA_LABEL) as CuartelPreguntaTipo[]).map((t) => (
              <li key={t} className="text-[13px]">
                <span className="cua-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--cua-accent)" }}>
                  {CUARTEL_PREGUNTA_LABEL[t]}
                </span>
                <p className="cua-muted mt-1 leading-relaxed">“{EJEMPLOS_INSTRUCTOR[t]}”</p>
              </li>
            ))}
          </ul>
          <p className="cua-faint mt-3.5 text-[12px] leading-relaxed">
            Pregunta y confronta; no diagnostica, no shamea, y no reemplaza a un profesional de salud mental.
          </p>
        </Panel>

        <Panel>
          <PanelLabel>Niveles de certeza</PanelLabel>
          <p className="cua-muted mb-3.5 text-[13px] leading-relaxed">
            Obligatorios en Riesgos y en el patrón repetido. Una lectura del sistema nunca se muestra como si fuera algo
            que Eduardo confirmó.
          </p>
          <ul className="space-y-2">
            {CERTEZAS.map((c) => (
              <li key={c} className="text-[13px]">
                <span>{CUARTEL_CERTEZA_LABEL[c]}</span>
                <span className="cua-muted"> — {CUARTEL_CERTEZA_DETALLE[c]}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelLabel>Capa legal / fiscal</PanelLabel>
          <p className="cua-muted mb-3 text-[13px] leading-relaxed">
            No es un séptimo sombrero: corre en paralelo y solo cuando la ruta tiene un ángulo legal, contractual o fiscal
            real, siempre de vida personal — nunca de negocio.
          </p>
          <ul className="space-y-1.5 text-[13px]">
            {LEGALES.map((n) => (
              <li key={n}>{CUARTEL_LEGAL_LABEL[n]}</li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--cua-accent)" }}>
            Límite explícito: este sistema no reemplaza abogado ni contador colombiano. Identifica cuándo llamar a uno.
          </p>
        </Panel>

        <Panel>
          <PanelLabel>Lo que este sistema no es</PanelLabel>
          <ul className="cua-muted space-y-1.5 text-[13px] leading-relaxed">
            <li>· No es terapia ni acompañamiento profesional de salud mental.</li>
            <li>· No es un diario ni un espacio de desahogo sin estructura.</li>
            <li>· No decide por vos: entrega el análisis, la decisión y la ejecución siguen siendo humanas.</li>
            <li>· No comparte datos con VINCERE, C.C.O.E.V. ni ningún proyecto de negocio.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import {
  GUIA_CADENCIA,
  GUIA_CICLO,
  GUIA_EVIDENCIA,
  GUIA_INTRO,
  GUIA_PRIMEROS_PASOS,
  GUIA_PROBLEMAS,
  GUIA_REGLA_ORO,
  GUIA_TAREAS,
  ManualBloque,
  SISTEMA_ALCANCE,
  SISTEMA_ARQUITECTURA,
  SISTEMA_DATOS,
  SISTEMA_EVIDENCIA,
  SISTEMA_FOSO,
  SISTEMA_IA,
  SISTEMA_INTRO,
  SISTEMA_MOTORES,
  SISTEMA_MOTORES_PENDIENTES,
  SISTEMA_QUE_ES,
} from "@/lib/vincere/manual";
import { SectionHeader, Panel, PanelLabel } from "../primitives";

type Doc = "guia" | "sistema";

export default function ManualSection() {
  const [doc, setDoc] = useState<Doc>("guia");

  return (
    <div>
      <div className="vin-no-print">
        <SectionHeader
          eyebrow="Documentación"
          title={doc === "guia" ? "Guía del Usuario" : "Manual del Sistema"}
          subtitle={
            doc === "guia"
              ? "Cómo se trabaja con la plataforma: primeros pasos, el ciclo completo y las tareas una por una."
              : "Qué es VINCERE y cómo funciona por dentro: los motores, la capa de IA, los niveles de evidencia y el alcance real de esta versión."
          }
        />

        <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <button onClick={() => setDoc("guia")} className={doc === "guia" ? "vin-btn-primary" : "vin-btn-ghost"}>
            Guía del Usuario
          </button>
          <button onClick={() => setDoc("sistema")} className={doc === "sistema" ? "vin-btn-primary" : "vin-btn-ghost"}>
            Manual del Sistema
          </button>
          <button onClick={() => window.print()} className="vin-btn-ghost">
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="vin-print-area">{doc === "guia" ? <GuiaUsuario /> : <ManualSistema />}</div>
    </div>
  );
}

// --- Piezas compartidas -----------------------------------------------------

function DocTitulo({ children }: { children: React.ReactNode }) {
  return <h2 className="vin-serif mb-4 mt-2 text-xl">{children}</h2>;
}

function BloqueDoc({ bloque }: { bloque: ManualBloque }) {
  return (
    <section>
      <DocTitulo>{bloque.titulo}</DocTitulo>
      <Panel>
        {bloque.parrafos?.map((p, i) => (
          <p key={i} className="mb-3.5 text-[14.5px] leading-relaxed">
            {p}
          </p>
        ))}
        {bloque.puntos && (
          <dl className="space-y-3">
            {bloque.puntos.map((p) => (
              <div key={p.termino}>
                <dt className="text-[14px] font-medium">{p.termino}</dt>
                <dd className="vin-muted mt-0.5 text-[13.5px] leading-relaxed">{p.texto}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>
    </section>
  );
}

function Cierre({ label, texto }: { label: string; texto: string }) {
  return (
    <div
      className="rounded-sm p-5"
      style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
    >
      <PanelLabel>
        <span style={{ color: "var(--vin-accent)" }}>{label}</span>
      </PanelLabel>
      <p className="text-[15px] leading-relaxed">{texto}</p>
    </div>
  );
}

// --- Guía del Usuario -------------------------------------------------------

function GuiaUsuario() {
  return (
    <div className="space-y-5">
      <Panel>
        <p className="text-[15px] leading-relaxed">{GUIA_INTRO}</p>
      </Panel>

      <BloqueDoc bloque={GUIA_PRIMEROS_PASOS} />

      <section>
        <DocTitulo>El ciclo de trabajo</DocTitulo>
        <div className="space-y-3">
          {GUIA_CICLO.map((paso) => (
            <Panel key={paso.numero}>
              <div className="mb-2 flex items-baseline gap-3">
                <span className="vin-serif shrink-0 text-lg leading-none" style={{ color: "var(--vin-accent)" }}>
                  {paso.numero}
                </span>
                <div>
                  <h3 className="text-[15px] font-medium leading-snug">{paso.titulo}</h3>
                  <p className="vin-muted mt-1 text-[13.5px] leading-relaxed">{paso.descripcion}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2 pl-7">
                {paso.detalle.map((d, i) => (
                  <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed">
                    <span className="shrink-0" style={{ color: "var(--vin-accent)" }}>
                      —
                    </span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </section>

      <section>
        <DocTitulo>Tareas paso a paso</DocTitulo>
        <div className="space-y-3">
          {GUIA_TAREAS.map((t) => (
            <Panel key={t.tarea}>
              <h3 className="mb-2.5 text-[15px] font-medium">{t.tarea}</h3>
              <ol className="space-y-1.5">
                {t.pasos.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                    <span className="vin-faint shrink-0 tabular-nums">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
        </div>
      </section>

      <BloqueDoc bloque={GUIA_EVIDENCIA} />
      <BloqueDoc bloque={GUIA_CADENCIA} />
      <BloqueDoc bloque={GUIA_PROBLEMAS} />

      <Cierre label="La regla de oro" texto={GUIA_REGLA_ORO} />
    </div>
  );
}

// --- Manual del Sistema -----------------------------------------------------

function ManualSistema() {
  return (
    <div className="space-y-5">
      <Panel>
        <p className="text-[15px] leading-relaxed">{SISTEMA_INTRO}</p>
      </Panel>

      <BloqueDoc bloque={SISTEMA_QUE_ES} />
      <BloqueDoc bloque={SISTEMA_ARQUITECTURA} />

      <section>
        <DocTitulo>Los motores</DocTitulo>
        <div className="space-y-2.5">
          {SISTEMA_MOTORES.map((m) => (
            <div key={m.motor} className="vin-card p-4">
              <div className="mb-1.5 text-[14.5px] font-medium">{m.motor}</div>
              <p className="mb-1.5 text-[13.5px] leading-relaxed">{m.cuandoUsarlo}</p>
              <p className="vin-faint text-[12.5px] leading-relaxed">
                <span className="vin-muted">Qué cargar:</span> {m.queCargar}
              </p>
            </div>
          ))}
        </div>

        <div className="vin-card mt-3 p-4">
          <PanelLabel>Motores de fases siguientes</PanelLabel>
          <p className="vin-muted mb-2.5 text-[13.5px] leading-relaxed">
            Definidos en el método y todavía no construidos. Se activan uno a uno según lo que los proyectos reales
            necesiten, no en bloque.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SISTEMA_MOTORES_PENDIENTES.map((m) => (
              <span
                key={m}
                className="rounded-full border px-2.5 py-0.5 text-[11.5px]"
                style={{ color: "var(--vin-faint)", borderColor: "var(--vin-border-strong)" }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      <BloqueDoc bloque={SISTEMA_IA} />
      <BloqueDoc bloque={SISTEMA_EVIDENCIA} />
      <BloqueDoc bloque={SISTEMA_DATOS} />
      <BloqueDoc bloque={SISTEMA_ALCANCE} />

      <Cierre label="Por qué esto es el foso" texto={SISTEMA_FOSO} />
    </div>
  );
}

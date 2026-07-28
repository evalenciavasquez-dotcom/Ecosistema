"use client";

import { ReactNode } from "react";
import {
  MANUAL_CADENCIA,
  MANUAL_CICLO,
  MANUAL_EVIDENCIA,
  MANUAL_INTRO,
  MANUAL_LIMITES,
  MANUAL_MOTORES,
  MANUAL_REGLA_ORO,
  ManualBloque,
} from "@/lib/vincere/manual";
import { SectionHeader, Panel, PanelLabel } from "../primitives";

export default function ManualSection() {
  return (
    <div>
      <SectionHeader
        eyebrow="Manual"
        title="Cómo se opera"
        subtitle="El ritmo de trabajo de la plataforma: qué se hace, en qué orden y cada cuánto."
      />

      <div className="space-y-5">
        <Panel>
          <p className="text-[15px] leading-relaxed">{MANUAL_INTRO}</p>
        </Panel>

        <section>
          <h2 className="vin-serif mb-4 text-xl">El ciclo de trabajo</h2>
          <div className="space-y-3">
            {MANUAL_CICLO.map((paso) => (
              <Panel key={paso.numero}>
                <div className="mb-2 flex items-baseline gap-3">
                  <span
                    className="vin-serif shrink-0 text-lg leading-none"
                    style={{ color: "var(--vin-accent)" }}
                  >
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
          <h2 className="vin-serif mb-4 text-xl">Cuándo se usa cada motor</h2>
          <div className="space-y-2.5">
            {MANUAL_MOTORES.map((m) => (
              <div key={m.motor} className="vin-card p-4">
                <div className="mb-1.5 text-[14.5px] font-medium">{m.motor}</div>
                <p className="mb-1.5 text-[13.5px] leading-relaxed">{m.cuandoUsarlo}</p>
                <p className="vin-faint text-[12.5px] leading-relaxed">
                  <span className="vin-muted">Qué cargar:</span> {m.queCargar}
                </p>
              </div>
            ))}
          </div>
        </section>

        <BloqueManual bloque={MANUAL_EVIDENCIA} />
        <BloqueManual bloque={MANUAL_CADENCIA} />
        <BloqueManual bloque={MANUAL_LIMITES} />

        <div
          className="rounded-sm p-5"
          style={{ background: "rgba(224,72,58,0.08)", border: "1px solid rgba(224,72,58,0.28)" }}
        >
          <PanelLabel>
            <span style={{ color: "var(--vin-accent)" }}>La regla de oro</span>
          </PanelLabel>
          <p className="text-[15px] leading-relaxed">{MANUAL_REGLA_ORO}</p>
        </div>
      </div>
    </div>
  );
}

function BloqueManual({ bloque }: { bloque: ManualBloque }): ReactNode {
  return (
    <section>
      <h2 className="vin-serif mb-4 text-xl">{bloque.titulo}</h2>
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

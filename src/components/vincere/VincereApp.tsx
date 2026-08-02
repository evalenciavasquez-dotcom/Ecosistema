"use client";

import { useState } from "react";
import { useVincereStore } from "@/lib/vincere/store";
import ProyectoManager from "./ProyectoManager";
import VincereHeader from "./VincereHeader";
import VincereNav from "./VincereNav";
import ResumenSection from "./sections/ResumenSection";
import DiagnosticoSection from "./sections/DiagnosticoSection";
import MarcaSection from "./sections/MarcaSection";
import TouringSection from "./sections/TouringSection";
import ARSection from "./sections/ARSection";
import OportunidadSection from "./sections/OportunidadSection";
import PitchSection from "./sections/PitchSection";
import MonetizacionSection from "./sections/MonetizacionSection";
import PrediccionesSection from "./sections/PrediccionesSection";
import SongSection from "./sections/SongSection";
import AudienciaSection from "./sections/AudienciaSection";
import CalorSection from "./sections/CalorSection";
import ManagementSection from "./sections/ManagementSection";
import KpisSection from "./sections/KpisSection";
import TriageSection from "./sections/TriageSection";
import IngestaSection from "./sections/IngestaSection";
import InvestigacionSection from "./sections/InvestigacionSection";
import StressTestSection from "./sections/StressTestSection";
import InformeSection from "./sections/InformeSection";
import ManualSection from "./sections/ManualSection";
import ComparacionSection from "./sections/ComparacionSection";

export default function VincereApp() {
  const proyectos = useVincereStore((s) => s.proyectos);
  const selectedId = useVincereStore((s) => s.selectedProyectoId);
  const compareId = useVincereStore((s) => s.compareProyectoId);
  const compareOn = useVincereStore((s) => s.compareOn);
  const seccion = useVincereStore((s) => s.seccion);
  const toast = useVincereStore((s) => s.toast);

  const proyecto = proyectos.find((p) => p.id === selectedId) ?? proyectos.find((p) => p.tipo === "propio");
  const compareTarget = proyectos.find((p) => p.id === compareId);

  return (
    <div className="vincere-scope flex min-h-screen flex-col">
      <VincereHeader />

      <div className="flex flex-1 flex-col md:flex-row" style={{ minHeight: 0 }}>
        <div style={{ borderColor: "var(--vin-border)" }} className="border-b md:border-b-0 md:border-r">
          <VincereNav />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto px-5 py-8 md:px-14 md:py-11">
          <div className="mx-auto max-w-4xl">
            {!proyecto ? (
              <SinProyectos />
            ) : compareOn && compareTarget ? (
              <ComparacionSection a={proyecto} b={compareTarget} />
            ) : (
              <SectionRouter seccion={seccion} proyecto={proyecto} />
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-sm px-4 py-3 text-[13px]"
          style={{ background: "var(--vin-surface-2)", border: "1px solid rgba(224,72,58,0.4)", color: "var(--vin-text)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// Estado vacío real: se llega acá después de borrar todo, que es justo cuando
// hay data nueva en la mano. Tiene que decir qué sigue, no solo que no hay nada.
function SinProyectos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="py-6">
      <div className="vin-eyebrow mb-2.5">VINCERE</div>
      <h2 className="vin-serif mb-3 text-2xl leading-snug">No hay ningún proyecto</h2>
      <p className="vin-muted mb-5 max-w-xl text-[14.5px] leading-relaxed">
        Crea el primero con el nombre del artista, su género y en qué fase está. Después, en «Cargar data», sueltas
        una captura o un archivo y se reparte solo a los motores que corresponda.
      </p>
      <button onClick={() => setAbierto(true)} className="vin-btn-primary">
        Crear proyecto
      </button>
      {abierto && <ProyectoManager onClose={() => setAbierto(false)} />}
    </div>
  );
}

function SectionRouter({
  seccion,
  proyecto,
}: {
  seccion: ReturnType<typeof useVincereStore.getState>["seccion"];
  proyecto: NonNullable<ReturnType<typeof useVincereStore.getState>["proyectos"][number]>;
}) {
  switch (seccion) {
    case "resumen":
      return <ResumenSection proyecto={proyecto} />;
    case "diagnostico":
      return <DiagnosticoSection proyecto={proyecto} />;
    case "marca":
      return <MarcaSection proyecto={proyecto} />;
    case "touring":
      return <TouringSection proyecto={proyecto} />;
    case "ar":
      return <ARSection proyecto={proyecto} />;
    case "oportunidad":
      return <OportunidadSection proyecto={proyecto} />;
    case "pitch":
      return <PitchSection proyecto={proyecto} />;
    case "monetizacion":
      return <MonetizacionSection proyecto={proyecto} />;
    case "predicciones":
      return <PrediccionesSection proyecto={proyecto} />;
    case "song":
      return <SongSection proyecto={proyecto} />;
    case "audiencia":
      return <AudienciaSection proyecto={proyecto} />;
    case "calor":
      return <CalorSection proyecto={proyecto} />;
    case "management":
      return <ManagementSection proyecto={proyecto} />;
    case "kpis":
      return <KpisSection proyecto={proyecto} />;
    case "triage":
      return <TriageSection />;
    case "ingesta":
      return <IngestaSection proyecto={proyecto} />;
    case "investigacion":
      return <InvestigacionSection proyecto={proyecto} />;
    case "stress":
      return <StressTestSection proyecto={proyecto} />;
    case "informe":
      return <InformeSection proyecto={proyecto} />;
    case "manual":
      return <ManualSection />;
    default:
      return <ResumenSection proyecto={proyecto} />;
  }
}

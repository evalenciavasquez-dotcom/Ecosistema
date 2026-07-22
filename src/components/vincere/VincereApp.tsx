"use client";

import { useVincereStore } from "@/lib/vincere/store";
import VincereHeader from "./VincereHeader";
import VincereNav from "./VincereNav";
import ResumenSection from "./sections/ResumenSection";
import DiagnosticoSection from "./sections/DiagnosticoSection";
import SongSection from "./sections/SongSection";
import AudienciaSection from "./sections/AudienciaSection";
import CalorSection from "./sections/CalorSection";
import ManagementSection from "./sections/ManagementSection";
import KpisSection from "./sections/KpisSection";
import TriageSection from "./sections/TriageSection";
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
              <p className="vin-muted text-sm">No hay proyecto seleccionado. Crea uno para empezar.</p>
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
    default:
      return <ResumenSection proyecto={proyecto} />;
  }
}

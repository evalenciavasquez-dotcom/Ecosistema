"use client";

import { useState } from "react";
import { useCuartelStore } from "@/lib/cuartel/store";
import CuartelHeader from "./CuartelHeader";
import CuartelNav from "./CuartelNav";
import NuevoEscenarioModal from "./NuevoEscenarioModal";
import InstructorDrawer from "./InstructorDrawer";
import InicioSection from "./sections/InicioSection";
import EscenariosSection from "./sections/EscenariosSection";
import HistorialSection from "./sections/HistorialSection";
import MetodoSection from "./sections/MetodoSection";

export interface InstructorTarget {
  escenarioId: string;
  rutaId: string;
}

export default function CuartelApp() {
  const seccion = useCuartelStore((s) => s.seccion);
  const escenarios = useCuartelStore((s) => s.escenarios);
  const toast = useCuartelStore((s) => s.toast);

  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [instructor, setInstructor] = useState<InstructorTarget | null>(null);

  const escenarioInstructor = escenarios.find((e) => e.id === instructor?.escenarioId);
  const rutaInstructor = escenarioInstructor?.rutas.find((r) => r.id === instructor?.rutaId);

  return (
    // En escritorio solo desplaza la columna de contenido: la barra lateral y
    // la cabecera quedan fijas, como en el prototipo.
    <div className="cuartel-scope flex min-h-screen flex-col md:h-screen md:flex-row md:overflow-hidden">
      <CuartelNav />

      <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
        <CuartelHeader onNuevoEscenario={() => setNuevoAbierto(true)} />

        <div className="flex-1 overflow-y-auto px-5 pb-16 pt-7 md:px-8">
          {seccion === "inicio" && <InicioSection />}
          {seccion === "escenarios" && (
            <EscenariosSection
              onNuevoEscenario={() => setNuevoAbierto(true)}
              onAbrirInstructor={(escenarioId, rutaId) => setInstructor({ escenarioId, rutaId })}
            />
          )}
          {seccion === "historial" && <HistorialSection />}
          {seccion === "metodo" && <MetodoSection />}
        </div>
      </div>

      {nuevoAbierto && <NuevoEscenarioModal onCerrar={() => setNuevoAbierto(false)} />}

      {escenarioInstructor && rutaInstructor && (
        <InstructorDrawer
          escenario={escenarioInstructor}
          ruta={rutaInstructor}
          onCerrar={() => setInstructor(null)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-6 z-50 max-w-sm rounded-sm px-4 py-3 text-[13px]"
          style={{
            background: "var(--cua-surface-2)",
            border: "1px solid var(--cua-border-strong)",
            color: "var(--cua-text)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCuartelStore } from "@/lib/cuartel/store";
import CuartelHeader from "./CuartelHeader";
import CuartelNav from "./CuartelNav";
import InicioSection from "./sections/InicioSection";
import EscenariosSection from "./sections/EscenariosSection";
import HistorialSection from "./sections/HistorialSection";
import MetodoSection from "./sections/MetodoSection";

export default function CuartelApp() {
  const seccion = useCuartelStore((s) => s.seccion);
  const toast = useCuartelStore((s) => s.toast);

  return (
    <div className="cuartel-scope flex min-h-screen flex-col">
      <CuartelHeader />

      <div className="flex flex-1 flex-col md:flex-row" style={{ minHeight: 0 }}>
        <div style={{ borderColor: "var(--cua-border)" }} className="border-b md:border-b-0 md:border-r">
          <CuartelNav />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto px-5 py-8 md:px-12 md:py-11">
          <div className="mx-auto max-w-4xl">
            {seccion === "inicio" && <InicioSection />}
            {seccion === "escenarios" && <EscenariosSection />}
            {seccion === "historial" && <HistorialSection />}
            {seccion === "metodo" && <MetodoSection />}
          </div>
        </main>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-sm px-4 py-3 text-[13px]"
          style={{
            background: "var(--cua-surface-2)",
            border: "1px solid rgba(217,154,43,0.4)",
            color: "var(--cua-text)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { VincereProyecto, VincereSeccion } from "@/lib/vincere/types";
import { useSectionAI } from "@/lib/vincere/useSectionAI";
import { SectionHeader } from "./primitives";
import AIInsights from "./AIInsights";
import QuestionBox from "./QuestionBox";

interface Props {
  proyecto: VincereProyecto;
  seccion: VincereSeccion;
  eyebrow: string;
  title: string;
  subtitle?: string;
  aiTitle: string;
  children: ReactNode;
  emptyHint?: string;
}

// Estructura común de una sección: encabezado + capa data (children) + capa
// interpretación IA + capa acción (preguntas). Las 3 capas del PRD (P0.2).
export default function SectionShell({
  proyecto,
  seccion,
  eyebrow,
  title,
  subtitle,
  aiTitle,
  children,
  emptyHint,
}: Props) {
  const { insights, qaLog, generate, ask } = useSectionAI(proyecto, seccion);

  return (
    <div>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="space-y-5">
        {children}
        <AIInsights title={aiTitle} insights={insights} onGenerate={generate} emptyHint={emptyHint} />
        <QuestionBox log={qaLog} onAsk={ask} />
      </div>
    </div>
  );
}

import { VincereInforme, VincereProyecto } from "./types";

// Exporta el informe a Markdown — formato universal: se abre en cualquier
// editor, se pega en Notion o en Word sin perder la estructura.
export function informeToMarkdown(informe: VincereInforme, proyecto: VincereProyecto): string {
  const fecha = new Date(informe.generadoEn).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nivel = (n: number) => `_Nivel ${n}_`;
  const lines: string[] = [];

  lines.push(`# ${informe.titulo}`, "");
  lines.push(`**${proyecto.nombre}** · ${proyecto.genero} · Fase: ${proyecto.fase}`);
  lines.push(`Informe emitido el ${fecha} · Nivel de evidencia global: ${informe.nivelGlobal}/4`);
  if (informe.editadoEn) {
    const editado = new Date(informe.editadoEn).toLocaleDateString("es", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    lines.push(`Trabajado en la plataforma · última edición ${editado}`);
  }
  lines.push("");
  lines.push("---", "");

  lines.push("## Sinopsis Central", "", informe.sinopsis, "");

  if (informe.veredicto) {
    lines.push("## Veredicto", "", `> ${informe.veredicto}`, "");
  }

  informe.bloques.forEach((b, i) => {
    lines.push(`## ${i + 1}. ${b.titulo}  ${nivel(b.nivel)}`, "");
    b.parrafos.forEach((p) => lines.push(p, ""));
  });

  if (informe.riesgos.length) {
    lines.push("## Riesgos", "");
    informe.riesgos.forEach((r) => {
      lines.push(`- **${r.riesgo}** ${nivel(r.nivel)}`, `  ${r.consecuencia}`);
    });
    lines.push("");
  }

  if (informe.oportunidades.length) {
    lines.push("## Oportunidades", "");
    informe.oportunidades.forEach((o) => {
      lines.push(`- **${o.oportunidad}** ${nivel(o.nivel)}`, `  ${o.porQue}`);
    });
    lines.push("");
  }

  if (informe.proximosPasos.length) {
    lines.push("## Próximos Pasos", "");
    informe.proximosPasos.forEach((p) => {
      lines.push(`- [${p.hecho ? "x" : " "}] **${p.accion}** — ${p.responsable} · ${p.plazo} · Prioridad ${p.prioridad}`);
    });
    lines.push("");
  }

  lines.push("---", "");
  lines.push("_Emitido por VINCERE Intelligence Platform. Cada afirmación lleva nivel de evidencia 1-4:_");
  lines.push("_4 alta evidencia · 3 evidencia sólida · 2 evidencia parcial · 1 especulativo._");

  return lines.join("\n");
}

export function downloadMarkdown(informe: VincereInforme, proyecto: VincereProyecto): void {
  const md = informeToMarkdown(informe, proyecto);
  const slug = proyecto.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const fecha = informe.generadoEn.slice(0, 10);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `informe-vincere-${slug || "proyecto"}-${fecha}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

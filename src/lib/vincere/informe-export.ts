import {
  VincereEstadoPrediccion,
  VincereInforme,
  VincereProyecto,
  VINCERE_ESTADO_PREDICCION_LABEL,
  calcularMarcador,
} from "./types";

// Casilla marcada solo cuando acertó: en Markdown plano es lo que se lee de un
// vistazo, y hace visible el error sin tener que buscarlo.
const ESTADO_MARCA: Record<VincereEstadoPrediccion, string> = {
  abierta: " ",
  acertada: "x",
  fallada: " ",
  parcial: "~",
  "no-verificable": "?",
};

const ESTADO_TEXTO: Record<VincereEstadoPrediccion, string> = VINCERE_ESTADO_PREDICCION_LABEL;

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

  // El informe se lleva su propio marcador. Es lo que lo vuelve auditable por
  // quien lo recibe: puede ver qué se dijo antes y cuánto de eso se cumplió,
  // sin depender de que se lo contemos nosotros.
  const preds = proyecto.predicciones ?? [];
  if (preds.length) {
    const m = calcularMarcador(preds);
    const abiertas = preds.filter((p) => p.estado === "abierta");
    const cerradas = preds.filter((p) => p.estado !== "abierta");

    lines.push("## Predicciones", "");
    lines.push(
      m.pctAcierto == null
        ? `Marcador: ${m.cerradas} cerradas · aún no hay suficientes para un porcentaje de acierto.`
        : `Marcador: ${m.acertadas} acertadas de ${m.acertadas + m.falladas} verificables (${m.pctAcierto}%) · ${m.abiertas} abiertas${m.vencidas ? ` · ${m.vencidas} vencidas sin cerrar` : ""}.`
    );
    if (m.nivelesSirven === false) {
      lines.push("");
      lines.push(
        "> Advertencia del propio sistema: hasta hoy las lecturas de nivel alto NO están acertando más que las de nivel bajo. La escala de evidencia de este informe todavía no está probada."
      );
    }
    lines.push("");

    if (abiertas.length) {
      lines.push("### Abiertas", "");
      abiertas.forEach((p) => {
        lines.push(`- **${p.afirmacion}** ${nivel(p.nivelAlEmitir)} · vence ${p.venceEn}`);
        lines.push(`  Se verifica así: ${p.comoSeVerifica}`);
      });
      lines.push("");
    }

    if (cerradas.length) {
      lines.push("### Cerradas", "");
      cerradas.forEach((p) => {
        lines.push(`- [${ESTADO_MARCA[p.estado]}] **${p.afirmacion}** ${nivel(p.nivelAlEmitir)} — ${ESTADO_TEXTO[p.estado]}`);
        if (p.queOcurrio) lines.push(`  Qué ocurrió: ${p.queOcurrio}`);
      });
      lines.push("");
    }
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

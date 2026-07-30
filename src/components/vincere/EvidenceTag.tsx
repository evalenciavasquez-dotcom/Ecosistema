import { VincereNivel, VINCERE_NIVEL_LABEL } from "@/lib/vincere/types";

const NIVEL_COLOR: Record<VincereNivel, string> = {
  4: "#5cc98e",
  3: "#2dd4bf",
  2: "#e0a83a",
  1: "#e0483a",
};

export default function EvidenceTag({ nivel }: { nivel: VincereNivel }) {
  const color = NIVEL_COLOR[nivel];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide"
      style={{ color, borderColor: `${color}66` }}
      title={`Nivel de evidencia ${nivel} — ${VINCERE_NIVEL_LABEL[nivel]}`}
    >
      Nivel {nivel} · {VINCERE_NIVEL_LABEL[nivel]}
    </span>
  );
}

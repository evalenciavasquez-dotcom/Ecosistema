import { VincereNivel, VINCERE_NIVEL_LABEL } from "@/lib/vincere/types";

const NIVEL_COLOR: Record<VincereNivel, string> = {
  4: "var(--vin-ok)",
  3: "var(--vin-accent)",
  2: "var(--vin-warn)",
  1: "var(--vin-risk)",
};

export default function EvidenceTag({ nivel }: { nivel: VincereNivel }) {
  const color = NIVEL_COLOR[nivel];
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 vin-t-xs font-medium tracking-wide"
      style={{ color, borderColor: `${color}66` }}
      title={`Nivel de evidencia ${nivel} — ${VINCERE_NIVEL_LABEL[nivel]}`}
    >
      Nivel {nivel} · {VINCERE_NIVEL_LABEL[nivel]}
    </span>
  );
}

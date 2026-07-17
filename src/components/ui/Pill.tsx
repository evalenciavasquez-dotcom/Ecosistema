export type PillTone = "green" | "amber" | "red" | "blue" | "gray" | "teal" | "purple";

const TONE_CLASSES: Record<PillTone, string> = {
  green: "bg-accent-green/15 text-accent-green",
  amber: "bg-accent-amber/15 text-accent-amber",
  red: "bg-accent-red/15 text-accent-red",
  blue: "bg-accent-blue/15 text-accent-blue",
  teal: "bg-accent-teal/15 text-accent-teal",
  gray: "bg-white/10 text-muted",
  purple: "bg-violet-400/15 text-violet-300",
};

export function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

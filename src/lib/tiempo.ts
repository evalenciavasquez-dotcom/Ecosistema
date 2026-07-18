import { RegistroTiempo } from "./types";

export function formatMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function inicioSemanaISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? 6 : day - 1; // lunes como inicio
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function minutosPorProyecto(
  registros: RegistroTiempo[],
  desde: string,
  hasta?: string
): Record<string, number> {
  const out: Record<string, number> = {};
  registros.forEach((r) => {
    if (r.fecha < desde) return;
    if (hasta && r.fecha > hasta) return;
    out[r.proyectoId] = (out[r.proyectoId] ?? 0) + r.minutos;
  });
  return out;
}

export function minutosDe(registros: RegistroTiempo[], proyectoId: string, desde: string): number {
  return registros
    .filter((r) => r.proyectoId === proyectoId && r.fecha >= desde)
    .reduce((acc, r) => acc + r.minutos, 0);
}

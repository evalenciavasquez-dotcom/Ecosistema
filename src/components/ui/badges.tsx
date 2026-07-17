import { Pill, PillTone } from "./Pill";
import {
  AccionEstado,
  BandejaEstado,
  EvidenceLevel,
  EVIDENCE_LABEL,
  NivelRiesgo,
  Prioridad,
  ProyectoEstado,
} from "@/lib/types";

const EVIDENCE_TONE: Record<EvidenceLevel, PillTone> = {
  verificado: "green",
  documentado: "teal",
  reportado: "amber",
  interpretacion: "purple",
};

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <Pill tone={EVIDENCE_TONE[level]}>{EVIDENCE_LABEL[level]}</Pill>;
}

const PROYECTO_ESTADO_TONE: Record<ProyectoEstado, PillTone> = {
  Idea: "gray",
  "En evaluación": "blue",
  "En negociación": "amber",
  Activo: "green",
  Bloqueado: "red",
  "En espera": "gray",
  "En riesgo": "red",
  "En cierre": "teal",
  Cerrado: "gray",
  Descartado: "gray",
};

export function ProyectoEstadoBadge({ estado }: { estado: ProyectoEstado }) {
  return <Pill tone={PROYECTO_ESTADO_TONE[estado]}>{estado}</Pill>;
}

const ACCION_ESTADO_TONE: Record<AccionEstado, PillTone> = {
  Pendiente: "amber",
  "En curso": "blue",
  Bloqueada: "red",
  "Esperando tercero": "purple",
  Completada: "green",
  Cancelada: "gray",
};

export function AccionEstadoBadge({ estado }: { estado: AccionEstado }) {
  return <Pill tone={ACCION_ESTADO_TONE[estado]}>{estado}</Pill>;
}

const BANDEJA_ESTADO_TONE: Record<BandejaEstado, PillTone> = {
  Nuevo: "blue",
  "En análisis": "amber",
  "Necesita confirmación": "amber",
  Procesado: "green",
  Descartado: "gray",
};

export function BandejaEstadoBadge({ estado }: { estado: BandejaEstado }) {
  return <Pill tone={BANDEJA_ESTADO_TONE[estado]}>{estado}</Pill>;
}

const RIESGO_TONE: Record<NivelRiesgo, PillTone> = {
  Alto: "red",
  Medio: "amber",
  Bajo: "green",
};

export function RiesgoBadge({ nivel }: { nivel: NivelRiesgo }) {
  return <Pill tone={RIESGO_TONE[nivel]}>Riesgo {nivel}</Pill>;
}

const PRIORIDAD_TONE: Record<Prioridad, PillTone> = {
  Alta: "red",
  Media: "amber",
  Baja: "gray",
};

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return <Pill tone={PRIORIDAD_TONE[prioridad]}>Prioridad {prioridad}</Pill>;
}

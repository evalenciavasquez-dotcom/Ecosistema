import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { getConfigValue, setConfigValue } from "@/lib/db/config";

const UMBRAL_KEY = "umbral_runway_decision_dias";
const UMBRAL_DEFAULT = 7;

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ umbralRunwayDecisionDias: UMBRAL_DEFAULT });
  }
  try {
    const raw = await getConfigValue(UMBRAL_KEY);
    const dias = raw ? Number(raw) : UMBRAL_DEFAULT;
    const valido = Number.isFinite(dias) && dias > 0 && dias <= 365;
    return NextResponse.json({ umbralRunwayDecisionDias: valido ? dias : UMBRAL_DEFAULT });
  } catch (err) {
    console.error("Error leyendo configuración", err);
    return NextResponse.json({ umbralRunwayDecisionDias: UMBRAL_DEFAULT });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const dias = Number(body?.umbralRunwayDecisionDias);
  // Un umbral absurdamente alto equivale a desactivar en silencio el
  // auto-disparo del Bloque 1 — mejor topar a un año que dejarlo pasar.
  if (!Number.isFinite(dias) || dias <= 0 || dias > 365) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  try {
    await setConfigValue(UMBRAL_KEY, String(dias));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error guardando configuración", err);
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }
}

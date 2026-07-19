import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { getConnection, isGoogleConfigured } from "@/lib/google";
import { runGoogleSync } from "@/lib/googleSync";

export async function POST() {
  if (!isGoogleConfigured() || !isDbConfigured()) {
    return NextResponse.json({ error: "Google no está configurado" }, { status: 400 });
  }
  const connection = await getConnection();
  if (!connection) {
    return NextResponse.json({ error: "No hay una cuenta de Google conectada" }, { status: 400 });
  }
  try {
    const result = await runGoogleSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Error en la sincronización manual de Google", err);
    return NextResponse.json({ error: "No se pudo completar la sincronización" }, { status: 500 });
  }
}

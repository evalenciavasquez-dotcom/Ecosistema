import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { disconnectGoogle } from "@/lib/google";

export async function POST() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 500 });
  }
  await disconnectGoogle();
  return NextResponse.json({ ok: true });
}

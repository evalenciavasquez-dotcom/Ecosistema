import { NextResponse } from "next/server";
import { AUTH_COOKIE, checkPassword, createSessionToken } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db/client";
import { estaBloqueado, limpiarIntentos, registrarIntentoFallido } from "@/lib/db/loginAttempts";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const conDb = isDbConfigured();

  if (conDb && (await estaBloqueado(ip).catch(() => false))) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos fallidos — espera unos minutos e intenta de nuevo." },
      { status: 429 }
    );
  }

  const { password } = await request.json().catch(() => ({ password: "" }));

  if (!(await checkPassword(password ?? ""))) {
    if (conDb) await registrarIntentoFallido(ip).catch(() => {});
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  }

  if (conDb) await limpiarIntentos(ip).catch(() => {});

  const token = await createSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: "APP_PASSWORD no está configurada en el servidor" }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_SEGUNDOS,
  checkPassword,
  createSessionToken,
  isAppPasswordConfigured,
} from "@/lib/auth";
import { isDbConfigured } from "@/lib/db/client";
import { estaBloqueado, limpiarIntentos, registrarIntentoFallido } from "@/lib/db/loginAttempts";

// De qué IP se fía el límite de intentos.
//
// 'x-forwarded-for' es una lista que el propio cliente puede empezar: el
// PRIMER valor es precisamente el que él controla, así que tomarlo permitía
// esquivar el bloqueo cambiando el header en cada intento. El valor de
// confianza es el que añade el proxy de la plataforma — 'x-real-ip' cuando
// está, y si no el ÚLTIMO de la lista, que es el que agregó el salto más
// cercano al servidor.
function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const saltos = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (saltos.length) return saltos[saltos.length - 1];
  }
  return "unknown";
}

export async function POST(request: Request) {
  // Se avisa antes de comparar nada. Si falta la variable, checkPassword
  // devuelve false siempre y la respuesta era "Contraseña incorrecta": quien
  // administra el sitio se pone a buscar un error de tipeo en vez de la
  // variable que falta. La rama de más abajo que sí lo decía era inalcanzable,
  // porque solo se llega después de validar una contraseña que nunca valida.
  if (!isAppPasswordConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El servidor no tiene APP_PASSWORD configurada. Nadie puede entrar hasta definir esa variable de entorno.",
      },
      { status: 503 }
    );
  }

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
    // Inalcanzable en la práctica — la guarda de arriba ya cortó ese caso —,
    // pero createSessionToken puede devolver null y el tipo lo obliga.
    return NextResponse.json({ ok: false, error: "No se pudo crear la sesión" }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Misma fuente que el vencimiento firmado dentro del token: si se cambia
    // la duración, cambian los dos a la vez y no quedan desalineados.
    maxAge: SESSION_SEGUNDOS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2Client, isGoogleConfigured, saveConnection, updateGmailLabelId } from "@/lib/google";

const LABEL_NAME = "CCO";

async function ensureLabel(auth: InstanceType<typeof google.auth.OAuth2>): Promise<string | null> {
  const gmail = google.gmail({ version: "v1", auth });
  const existing = await gmail.users.labels.list({ userId: "me" });
  const found = existing.data.labels?.find((l) => l.name === LABEL_NAME);
  if (found?.id) return found.id;

  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name: LABEL_NAME, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return created.data.id ?? null;
}

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/configuracion?google=error_config", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/configuracion?google=error_code", request.url));
  }

  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      // Google solo manda refresh_token en la primera autorización con
      // prompt=consent — si esto falta, Eduardo tiene que desconectar en
      // Google (myaccount.google.com/permissions) y volver a conectar.
      return NextResponse.redirect(new URL("/configuracion?google=error_no_refresh", request.url));
    }

    // Guardar la conexión es lo crítico — si esto falla, sí es un error real.
    await saveConnection({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600_000,
      scope: tokens.scope ?? "",
    });

    // Crear la etiqueta "CCO" es un extra de conveniencia, no el objetivo
    // de esta ruta — si falla (permiso insuficiente, Gmail API caída),
    // la conexión ya quedó guardada y sigue siendo un éxito real. Eduardo
    // puede crear la etiqueta a mano en Gmail si esto no logra hacerlo.
    try {
      client.setCredentials(tokens);
      const labelId = await ensureLabel(client);
      if (labelId) await updateGmailLabelId(labelId);
    } catch (labelErr) {
      console.error("No se pudo crear la etiqueta CCO en Gmail (no crítico)", labelErr);
    }

    return NextResponse.redirect(new URL("/configuracion?google=success", request.url));
  } catch (err) {
    console.error("Error en callback de Google OAuth", err);
    return NextResponse.redirect(new URL("/configuracion?google=error", request.url));
  }
}

import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db/client";
import { googleConnection } from "./db/schema";
import { ensureGoogleSchema } from "./db/migrations";

// Alcance mínimo necesario: leer correo (para el barrido de Gmail),
// gestionar SOLO etiquetas de Gmail (gmail.labels — necesario para crear
// la etiqueta "CCO" al conectar; no da acceso de escritura al contenido
// de los correos, gmail.readonly ya cubre eso), crear/editar/borrar
// eventos de Calendar (para la sincronización de doble vía), y
// crear/editar/borrar tareas de Google Tasks (para sincronizar Acciones)
// — nunca acceso a la bandeja completa de Calendar ni a otros datos de la cuenta.
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
];

const CONNECTION_ID = "default";

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    // Fuerza que Google devuelva refresh_token también en reconexiones,
    // no solo la primera vez que Eduardo autoriza la app.
    prompt: "consent",
    scope: SCOPES,
  });
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
}

export async function saveConnection(tokens: StoredTokens): Promise<void> {
  await ensureGoogleSchema();
  const db = getDb();
  const row = {
    id: CONNECTION_ID,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: String(tokens.expiry_date),
    scope: tokens.scope,
    connectedAt: new Date().toISOString(),
  };
  await db
    .insert(googleConnection)
    .values(row)
    .onConflictDoUpdate({
      target: googleConnection.id,
      set: {
        accessToken: row.accessToken,
        refreshToken: row.refreshToken,
        expiryDate: row.expiryDate,
        scope: row.scope,
        connectedAt: row.connectedAt,
      },
    });
}

export async function getConnection() {
  if (!isDbConfigured()) return null;
  await ensureGoogleSchema();
  const rows = await getDb().select().from(googleConnection).where(eq(googleConnection.id, CONNECTION_ID));
  return rows[0] ?? null;
}

export async function disconnectGoogle(): Promise<void> {
  await ensureGoogleSchema();
  await getDb().delete(googleConnection).where(eq(googleConnection.id, CONNECTION_ID));
}

// Cliente autorizado listo para llamar Gmail/Calendar. Si el access_token
// se refresca solo (por expirar), guarda el nuevo token para no perder la
// sesión en la siguiente llamada.
export async function getAuthorizedClient() {
  const connection = await getConnection();
  if (!connection) return null;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: Number(connection.expiryDate),
    scope: connection.scope,
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    saveConnection({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? connection.refreshToken,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600_000,
      scope: tokens.scope ?? connection.scope,
    }).catch(() => {});
  });

  return client;
}

export async function updateGmailLabelId(labelId: string): Promise<void> {
  await getDb().update(googleConnection).set({ gmailLabelId: labelId }).where(eq(googleConnection.id, CONNECTION_ID));
}

export async function updateGmailProcessedLabelId(labelId: string): Promise<void> {
  await getDb()
    .update(googleConnection)
    .set({ gmailProcessedLabelId: labelId })
    .where(eq(googleConnection.id, CONNECTION_ID));
}

export async function updateLastGmailSync(isoDate: string): Promise<void> {
  await getDb().update(googleConnection).set({ lastGmailSync: isoDate }).where(eq(googleConnection.id, CONNECTION_ID));
}

export async function updateCalendarSyncToken(token: string | null): Promise<void> {
  await getDb()
    .update(googleConnection)
    .set({ calendarSyncToken: token })
    .where(eq(googleConnection.id, CONNECTION_ID));
}

export async function updateLastTasksSync(isoDate: string): Promise<void> {
  await getDb().update(googleConnection).set({ lastTasksSync: isoDate }).where(eq(googleConnection.id, CONNECTION_ID));
}

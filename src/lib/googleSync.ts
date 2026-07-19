import { google, type calendar_v3, type gmail_v1 } from "googleapis";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db/client";
import {
  agenda,
  bandeja,
  historial,
  personas as personasTable,
  proyectos as proyectosTable,
} from "./db/schema";
import { genId } from "./id";
import { clasificarTexto } from "./classify";
import {
  getAuthorizedClient,
  getConnection,
  isGoogleConfigured,
  updateCalendarSyncToken,
  updateGmailLabelId,
  updateGmailProcessedLabelId,
  updateLastGmailSync,
} from "./google";
import type { ClasificacionSugerida } from "./types";

const CCO_LABEL = "CCO";
const CCO_PROCESSED_LABEL = "CCO-Sincronizado";
const MAX_MESSAGES_PER_RUN = 15;

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractBody(payload?: gmail_v1.Schema$MessagePart | null): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function headerValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const found = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
}

async function ensureGmailLabel(gmail: gmail_v1.Gmail, name: string): Promise<string | null> {
  const list = await gmail.users.labels.list({ userId: "me" });
  const found = list.data.labels?.find((l) => l.name === name);
  if (found?.id) return found.id;
  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return created.data.id ?? null;
}

export interface GmailSyncResult {
  nuevos: number;
  revisados: number;
  error?: string;
}

// Barre los correos con la etiqueta "CCO" que aún no tengan la etiqueta
// "CCO-Sincronizado", los convierte en ítems de Bandeja (con la misma
// clasificación por IA que usa la captura manual), y marca cada correo como
// sincronizado para no volver a procesarlo en la siguiente pasada.
export async function syncGmail(): Promise<GmailSyncResult> {
  if (!isDbConfigured() || !isGoogleConfigured()) return { nuevos: 0, revisados: 0 };
  const connection = await getConnection();
  if (!connection) return { nuevos: 0, revisados: 0 };

  const client = await getAuthorizedClient();
  if (!client) return { nuevos: 0, revisados: 0 };
  const gmail = google.gmail({ version: "v1", auth: client });

  let labelId = connection.gmailLabelId;
  if (!labelId) {
    labelId = await ensureGmailLabel(gmail, CCO_LABEL);
    if (labelId) await updateGmailLabelId(labelId);
  }
  if (!labelId) return { nuevos: 0, revisados: 0, error: "No se pudo preparar la etiqueta CCO en Gmail" };

  let processedLabelId = connection.gmailProcessedLabelId;
  if (!processedLabelId) {
    processedLabelId = await ensureGmailLabel(gmail, CCO_PROCESSED_LABEL);
    if (processedLabelId) await updateGmailProcessedLabelId(processedLabelId);
  }
  if (!processedLabelId) {
    return { nuevos: 0, revisados: 0, error: "No se pudo preparar la etiqueta CCO-Sincronizado en Gmail" };
  }

  const list = await gmail.users.messages.list({
    userId: "me",
    q: `label:${CCO_LABEL} -label:${CCO_PROCESSED_LABEL}`,
    maxResults: MAX_MESSAGES_PER_RUN,
  });
  const messages = list.data.messages ?? [];
  if (messages.length === 0) {
    await updateLastGmailSync(new Date().toISOString());
    return { nuevos: 0, revisados: 0 };
  }

  const db = getDb();
  const [proyectosRows, personasRows] = await Promise.all([
    db.select().from(proyectosTable),
    db.select().from(personasTable),
  ]);
  const proyectosRef = proyectosRows.map((p) => ({ id: p.id, nombre: p.nombre }));
  const personasRef = personasRows.map((p) => ({ nombre: p.nombre, proyectoIds: p.proyectoIds }));

  let nuevos = 0;
  for (const msg of messages) {
    if (!msg.id) continue;
    try {
      const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
      const headers = full.data.payload?.headers ?? undefined;
      const from = headerValue(headers, "From");
      const subject = headerValue(headers, "Subject") || "(sin asunto)";
      const body = extractBody(full.data.payload).slice(0, 1600);
      const texto = `Correo de ${from || "remitente desconocido"} — asunto: "${subject}"\n\n${
        body || full.data.snippet || ""
      }`.trim();
      const fecha = full.data.internalDate
        ? new Date(Number(full.data.internalDate)).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      let clasificacion: ClasificacionSugerida;
      try {
        const result = await clasificarTexto(texto, proyectosRef, personasRef);
        clasificacion = result ?? {
          destino: "registro",
          proyectoId: null,
          confianza: 0.3,
          razon: "Correo importado de Gmail — sin clave de IA disponible, revísalo manualmente.",
        };
      } catch (classifyErr) {
        console.error("No se pudo clasificar un correo del barrido de Gmail", classifyErr);
        clasificacion = {
          destino: "registro",
          proyectoId: null,
          confianza: 0.3,
          razon: "Correo importado de Gmail — la clasificación automática falló, revísalo manualmente.",
        };
      }
      const estado: "Nuevo" | "Necesita confirmación" =
        clasificacion.confianza < 0.6 ? "Necesita confirmación" : "Nuevo";

      const id = genId("bnd");
      await db.insert(bandeja).values({ id, texto, fecha, estado, clasificacion });
      await db.insert(historial).values({
        id: genId("hist"),
        timestamp: new Date().toISOString(),
        entidadTipo: "bandeja",
        entidadId: id,
        cambio: `Recibido por barrido de Gmail — "${subject}"`,
        autor: "ia",
      });
      nuevos++;

      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { addLabelIds: [processedLabelId] },
      });
    } catch (err) {
      console.error("Error procesando un correo del barrido de Gmail", err);
    }
  }

  await updateLastGmailSync(new Date().toISOString());
  return { nuevos, revisados: messages.length };
}

export interface CalendarSyncResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  error?: string;
}

function eventoFechaHora(event: calendar_v3.Schema$Event): { fecha: string; hora: string } {
  const start = event.start;
  if (start?.date) return { fecha: start.date, hora: "" };
  if (start?.dateTime) {
    const [fecha, resto] = start.dateTime.split("T");
    return { fecha, hora: (resto ?? "").slice(0, 5) };
  }
  return { fecha: new Date().toISOString().slice(0, 10), hora: "" };
}

// Trae a la tabla agenda los eventos nuevos, editados o eliminados en Google
// Calendar desde la última pasada (usando el syncToken incremental de la
// API), y crea/actualiza/borra las filas correspondientes. Los eventos que
// ya vinieron de la app (creados por pushAgendaEventoCreado) se emparejan
// por googleEventId, así que no se duplican en cada pasada.
export async function syncCalendarPull(): Promise<CalendarSyncResult> {
  if (!isDbConfigured() || !isGoogleConfigured()) return { creados: 0, actualizados: 0, eliminados: 0 };
  const connection = await getConnection();
  if (!connection) return { creados: 0, actualizados: 0, eliminados: 0 };
  const client = await getAuthorizedClient();
  if (!client) return { creados: 0, actualizados: 0, eliminados: 0 };

  const calendar = google.calendar({ version: "v3", auth: client });
  const db = getDb();

  const events: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;
  const syncToken = connection.calendarSyncToken ?? undefined;

  try {
    do {
      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId: "primary",
        singleEvents: true,
        maxResults: 250,
        pageToken,
      };
      if (syncToken) {
        params.syncToken = syncToken;
      } else {
        params.timeMin = new Date(Date.now() - 7 * 86400000).toISOString();
        params.timeMax = new Date(Date.now() + 180 * 86400000).toISOString();
        // Sin syncToken la API omite los eventos cancelados por defecto —
        // sin esto, algo borrado en Google Calendar nunca se borraría acá.
        params.showDeleted = true;
      }
      const res = await calendar.events.list(params);
      events.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
    } while (pageToken);
  } catch (err) {
    const status = (err as { code?: number }).code;
    if (status === 410) {
      // El syncToken quedó inválido (expiró o el calendario cambió demasiado)
      // — se reinicia con un sync completo desde cero.
      await updateCalendarSyncToken(null);
      return syncCalendarPull();
    }
    throw err;
  }

  let creados = 0;
  let actualizados = 0;
  let eliminados = 0;

  for (const event of events) {
    if (!event.id) continue;
    const existingRows = await db.select().from(agenda).where(eq(agenda.googleEventId, event.id));
    const existing = existingRows[0];

    if (event.status === "cancelled") {
      if (existing) {
        await db.delete(agenda).where(eq(agenda.id, existing.id));
        await db.insert(historial).values({
          id: genId("hist"),
          timestamp: new Date().toISOString(),
          entidadTipo: "agenda",
          entidadId: existing.id,
          cambio: `Evento "${existing.titulo}" eliminado desde Google Calendar`,
          autor: "ia",
        });
        eliminados++;
      }
      continue;
    }

    const { fecha, hora } = eventoFechaHora(event);
    const titulo = event.summary || "(Sin título)";
    const descripcion = event.description ?? "";

    if (existing) {
      if (
        existing.titulo !== titulo ||
        existing.fecha !== fecha ||
        existing.hora !== hora ||
        existing.descripcion !== descripcion
      ) {
        await db.update(agenda).set({ titulo, fecha, hora, descripcion }).where(eq(agenda.id, existing.id));
        actualizados++;
      }
    } else {
      const id = genId("evt");
      await db.insert(agenda).values({
        id,
        titulo,
        fecha,
        hora,
        proyectoId: null,
        descripcion,
        tipo: "Reunión",
        googleEventId: event.id,
      });
      await db.insert(historial).values({
        id: genId("hist"),
        timestamp: new Date().toISOString(),
        entidadTipo: "agenda",
        entidadId: id,
        cambio: `Evento "${titulo}" importado desde Google Calendar`,
        autor: "ia",
      });
      creados++;
    }
  }

  if (nextSyncToken) await updateCalendarSyncToken(nextSyncToken);
  return { creados, actualizados, eliminados };
}

function buildEventBody(
  titulo: string,
  fecha: string,
  hora: string,
  descripcion: string
): calendar_v3.Schema$Event {
  if (!hora) {
    const siguiente = new Date(`${fecha}T00:00:00Z`);
    siguiente.setUTCDate(siguiente.getUTCDate() + 1);
    return {
      summary: titulo,
      description: descripcion || undefined,
      start: { date: fecha },
      end: { date: siguiente.toISOString().slice(0, 10) },
    };
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const inicio = new Date(`${fecha}T${hora}:00`);
  const fin = new Date(inicio.getTime() + 60 * 60000);
  const finFecha = `${fin.getFullYear()}-${pad(fin.getMonth() + 1)}-${pad(fin.getDate())}`;
  const finHora = `${pad(fin.getHours())}:${pad(fin.getMinutes())}`;
  return {
    summary: titulo,
    description: descripcion || undefined,
    start: { dateTime: `${fecha}T${hora}:00`, timeZone: "America/Bogota" },
    end: { dateTime: `${finFecha}T${finHora}:00`, timeZone: "America/Bogota" },
  };
}

// Crea el evento en Google Calendar para un ítem de agenda recién creado en
// la app, y guarda su googleEventId para poder editarlo/borrarlo después.
export async function pushAgendaEventoCreado(
  id: string,
  evento: { titulo: string; fecha: string; hora: string; descripcion?: string }
): Promise<void> {
  if (!isDbConfigured() || !isGoogleConfigured()) return;
  const connection = await getConnection();
  if (!connection) return;
  const client = await getAuthorizedClient();
  if (!client) return;
  const calendar = google.calendar({ version: "v3", auth: client });

  const requestBody = buildEventBody(evento.titulo, evento.fecha, evento.hora, evento.descripcion ?? "");
  const created = await calendar.events.insert({ calendarId: "primary", requestBody });
  if (created.data.id) {
    await getDb().update(agenda).set({ googleEventId: created.data.id }).where(eq(agenda.id, id));
  }
}

// Borra en Google Calendar el evento vinculado a un ítem de agenda que se
// acaba de eliminar en la app.
export async function pushAgendaEventoEliminado(googleEventId: string): Promise<void> {
  if (!isDbConfigured() || !isGoogleConfigured()) return;
  const connection = await getConnection();
  if (!connection) return;
  const client = await getAuthorizedClient();
  if (!client) return;
  const calendar = google.calendar({ version: "v3", auth: client });

  try {
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  } catch (err) {
    // El evento ya no existía en Google (borrado a mano ahí, por ejemplo) —
    // no es un error real.
    const status = (err as { code?: number }).code;
    if (status !== 404 && status !== 410) throw err;
  }
}

export interface GoogleSyncSummary {
  gmail: GmailSyncResult;
  calendar: CalendarSyncResult;
}

// Orquesta el barrido de Gmail y la sincronización de Calendar. Cada mitad
// falla de forma independiente — un problema con Gmail no debe bloquear la
// sincronización del calendario, y viceversa.
export async function runGoogleSync(): Promise<GoogleSyncSummary> {
  let gmail: GmailSyncResult;
  try {
    gmail = await syncGmail();
  } catch (err) {
    console.error("Error en el barrido de Gmail", err);
    gmail = { nuevos: 0, revisados: 0, error: "Error en el barrido de Gmail" };
  }

  let calendar: CalendarSyncResult;
  try {
    calendar = await syncCalendarPull();
  } catch (err) {
    console.error("Error en la sincronización de Google Calendar", err);
    calendar = { creados: 0, actualizados: 0, eliminados: 0, error: "Error en la sincronización de Google Calendar" };
  }

  return { gmail, calendar };
}

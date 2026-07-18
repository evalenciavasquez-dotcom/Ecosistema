import { sql } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "./client";

// Tablas propias del sistema de notificaciones. Se crean bajo demanda porque
// pueden no existir en una base inicializada antes de esta funcionalidad.
export async function ensurePushTables() {
  const db = getDb();
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS app_config (
      key text PRIMARY KEY,
      value text NOT NULL
    )`)
  );
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint text PRIMARY KEY,
      data jsonb NOT NULL,
      creado_en text NOT NULL
    )`)
  );
}

function resultRows(res: unknown): Record<string, unknown>[] {
  const rows = (res as { rows?: Record<string, unknown>[] }).rows;
  return Array.isArray(rows) ? rows : [];
}

async function getConfig(key: string): Promise<string | null> {
  const db = getDb();
  const res = await db.execute(sql`SELECT value FROM app_config WHERE key = ${key}`);
  const row = resultRows(res)[0];
  return typeof row?.value === "string" ? row.value : null;
}

async function setConfig(key: string, value: string) {
  const db = getDb();
  await db.execute(
    sql`INSERT INTO app_config (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = ${value}`
  );
}

export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  await ensurePushTables();
  const publicKey = await getConfig("vapid_public");
  const privateKey = await getConfig("vapid_private");
  if (publicKey && privateKey) return { publicKey, privateKey };

  const keys = webpush.generateVAPIDKeys();
  await setConfig("vapid_public", keys.publicKey);
  await setConfig("vapid_private", keys.privateKey);
  return keys;
}

export interface StoredSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(subscription: StoredSubscription) {
  await ensurePushTables();
  const db = getDb();
  const data = JSON.stringify(subscription);
  await db.execute(
    sql`INSERT INTO push_subscriptions (endpoint, data, creado_en)
        VALUES (${subscription.endpoint}, ${data}::jsonb, ${new Date().toISOString()})
        ON CONFLICT (endpoint) DO UPDATE SET data = ${data}::jsonb`
  );
}

export async function deleteSubscription(endpoint: string) {
  await ensurePushTables();
  const db = getDb();
  await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`);
}

export async function listSubscriptions(): Promise<StoredSubscription[]> {
  await ensurePushTables();
  const db = getDb();
  const res = await db.execute(sql`SELECT data FROM push_subscriptions`);
  return resultRows(res).map(
    (r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as StoredSubscription
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Envía a todas las suscripciones; elimina las que el navegador ya invalidó
// (410 Gone / 404). Devuelve cuántas se entregaron.
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails("mailto:notificaciones@cco-ev.local", publicKey, privateKey);

  const subs = await listSubscriptions();
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deleteSubscription(sub.endpoint).catch(() => {});
      }
    }
  }

  return { sent, failed };
}

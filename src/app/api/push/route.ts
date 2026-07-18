import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import {
  deleteSubscription,
  getVapidKeys,
  listSubscriptions,
  saveSubscription,
  sendPushToAll,
} from "@/lib/db/push";

// GET: clave pública VAPID + estado de suscripciones.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }
  try {
    const { publicKey } = await getVapidKeys();
    const subs = await listSubscriptions();
    return NextResponse.json({ configured: true, publicKey, subscriptions: subs.length });
  } catch (err) {
    console.error("Error obteniendo claves VAPID", err);
    return NextResponse.json({ error: "No se pudo preparar el sistema de notificaciones" }, { status: 500 });
  }
}

// POST: { action: "subscribe", subscription } | { action: "unsubscribe", endpoint } | { action: "test" }
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "Las notificaciones requieren la base de datos configurada" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: "Falta 'action'" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "subscribe": {
        const sub = body.subscription;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
          return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
        }
        await saveSubscription({ endpoint: sub.endpoint, keys: sub.keys });
        return NextResponse.json({ ok: true });
      }
      case "unsubscribe": {
        if (!body.endpoint) return NextResponse.json({ error: "Falta 'endpoint'" }, { status: 400 });
        await deleteSubscription(body.endpoint);
        return NextResponse.json({ ok: true });
      }
      case "test": {
        const result = await sendPushToAll({
          title: "C.C.O. E.V. — prueba",
          body: "Las notificaciones están funcionando. Así te avisaré cuando algo importe.",
          url: "/",
        });
        return NextResponse.json({ ok: true, ...result });
      }
      default:
        return NextResponse.json({ error: `Acción desconocida: ${body.action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("Error en /api/push", err);
    return NextResponse.json({ error: "Error procesando la solicitud de notificaciones" }, { status: 500 });
  }
}

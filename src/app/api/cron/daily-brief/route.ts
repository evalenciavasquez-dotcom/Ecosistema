import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { acciones, agenda, decisiones, movimientos, personas } from "@/lib/db/schema";
import { sendPushToAll } from "@/lib/db/push";
import { computeProyeccion, computeRunway } from "@/lib/finanzas";
import { getConnection, isGoogleConfigured } from "@/lib/google";
import { runGoogleSync } from "@/lib/googleSync";
import type { MovimientoEconomico } from "@/lib/types";

function hoyISO(): string {
  // Fecha "hoy" en hora de Colombia (UTC-5), independiente del reloj del servidor.
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function diasHasta(fechaISO: string, hoy: string): number {
  return Math.round((new Date(fechaISO).getTime() - new Date(hoy).getTime()) / 86400000);
}

export async function GET(request: Request) {
  // Si Eduardo define CRON_SECRET en Vercel, se exige; sin definirla, el
  // endpoint solo permite el user-agent del cron de Vercel o una sesión válida
  // (la protección del proxy ya cubrió el caso de sesión).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    const db = getDb();
    const hoy = hoyISO();
    const lineas: string[] = [];
    let urgente = false;

    // Sincronización con Google (Gmail + Calendar) primero, para que el
    // resumen de abajo ya cuente con lo que trajo el barrido de hoy. No es
    // crítica — un fallo aquí no debe romper el push del día.
    if (isGoogleConfigured()) {
      try {
        const connection = await getConnection();
        if (connection) {
          const { gmail, calendar } = await runGoogleSync();
          if (gmail.nuevos > 0) {
            lineas.push(`${gmail.nuevos} correo(s) nuevo(s) en tu Bandeja desde Gmail`);
          }
          if (calendar.creados > 0) {
            lineas.push(`${calendar.creados} evento(s) nuevo(s) desde Google Calendar`);
          }
        }
      } catch (err) {
        console.error("Error sincronizando con Google desde el resumen diario", err);
      }
    }

    const [accionesRows, decisionesRows, personasRows, agendaRows, movimientosRows] = await Promise.all([
      db.select().from(acciones),
      db.select().from(decisiones),
      db.select().from(personas),
      db.select().from(agenda),
      db.select().from(movimientos),
    ]);

    const abiertas = accionesRows.filter((a) => a.estado === "Pendiente" || a.estado === "En curso");
    const vencidas = abiertas.filter((a) => a.fecha && a.fecha < hoy);
    const paraHoy = abiertas.filter((a) => a.fecha === hoy);
    if (vencidas.length > 0) {
      urgente = true;
      lineas.push(`${vencidas.length} acción(es) vencida(s) — la más vieja: "${vencidas[0].titulo}"`);
    }
    if (paraHoy.length > 0) {
      lineas.push(`${paraHoy.length} acción(es) para hoy — "${paraHoy[0].titulo}"`);
    }

    const eventosHoy = agendaRows.filter((e) => e.fecha === hoy);
    if (eventosHoy.length > 0) {
      const primero = eventosHoy.sort((a, b) => a.hora.localeCompare(b.hora))[0];
      lineas.push(`Hoy: ${primero.titulo} a las ${primero.hora}`);
    }

    const decisionesUrgentes = decisionesRows.filter((d) => {
      if (d.estado !== "Abierta" || !d.fechaLimite) return false;
      const dias = diasHasta(d.fechaLimite, hoy);
      return dias >= 0 && dias <= 3;
    });
    if (decisionesUrgentes.length > 0) {
      const d = decisionesUrgentes[0];
      const dias = diasHasta(d.fechaLimite, hoy);
      urgente = urgente || dias <= 1;
      lineas.push(`Decisión "${d.pregunta}" vence ${dias === 0 ? "HOY" : `en ${dias} día(s)`}`);
    }

    const esperando = personasRows.filter((p) => (p.diasSinResponder ?? 0) >= 5);
    if (esperando.length > 0) {
      const p = esperando.sort((a, b) => (b.diasSinResponder ?? 0) - (a.diasSinResponder ?? 0))[0];
      lineas.push(`${p.nombre} lleva ${p.diasSinResponder} días sin responder`);
    }

    const runway = computeRunway(movimientosRows as MovimientoEconomico[], hoy);
    const proyeccion = computeProyeccion(movimientosRows as MovimientoEconomico[], hoy);
    const runwayCorto = runway.filter((r) => r.mesesRunway !== null && r.mesesRunway < 2);
    if (runwayCorto.length > 0) {
      urgente = true;
      const r = runwayCorto[0];
      lineas.push(
        r.mesesRunway! < 0
          ? `Caja en déficit en ${r.moneda} — revisa Economía`
          : `Runway de ${r.mesesRunway!.toFixed(1)} meses en ${r.moneda} — caja baja`
      );
    }
    const proyeccionNegativa = proyeccion.filter((p) => p.proyeccion30 < 0);
    if (proyeccionNegativa.length > 0) {
      urgente = true;
      const p = proyeccionNegativa[0];
      lineas.push(`Caja proyectada a 30 días se vuelve negativa en ${p.moneda}`);
    }

    if (lineas.length === 0) {
      lineas.push("Sin pendientes críticos registrados. Buen momento para revisar la Bandeja.");
    }

    const payload = {
      title: urgente ? "⚠ Tu día — hay algo urgente" : "Tu día — C.C.O. E.V.",
      body: lineas.slice(0, 5).join("\n"),
      url: "/",
    };

    const result = await sendPushToAll(payload);
    return NextResponse.json({ ok: true, brief: payload, ...result });
  } catch (err) {
    console.error("Error generando el resumen diario", err);
    return NextResponse.json({ error: "No se pudo generar el resumen diario" }, { status: 500 });
  }
}

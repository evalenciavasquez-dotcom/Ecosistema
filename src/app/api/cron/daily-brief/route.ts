import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { acciones, agenda, decisiones, movimientos, personas, strategicCases } from "@/lib/db/schema";
import { ensureStrategicCaseColumns } from "@/lib/db/migrations";
import { sendPushToAll } from "@/lib/db/push";
import { generarCierreMensual } from "@/lib/cierreMensualEngine";
import { actualizarRetosIA } from "@/lib/goalsEngine";
import { construirBrief } from "@/lib/brief";
import { getConnection, isGoogleConfigured } from "@/lib/google";
import { runGoogleSync } from "@/lib/googleSync";
import type { MovimientoEconomico } from "@/lib/types";

// El plan de Vercel de este proyecto permite un solo cron job (ver
// vercel.json) — por eso esta ruta hace de anfitrión de todo lo que necesita
// correr diario o mensual: el resumen diario, los retos de la IA (todos los
// días) y el cierre económico mensual (día 1). Cualquier tarea programada
// nueva debe colgarse de aquí en vez de agregar otra entrada a "crons" en
// vercel.json, o el deploy puede fallar por exceder el límite del plan.

function hoyISO(): string {
  // Fecha "hoy" en hora de Colombia (UTC-5), independiente del reloj del servidor.
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function mesAnteriorAHoy(hoy: string): string {
  const [y, m] = hoy.slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  // Esta ruta queda fuera del proxy de sesión (para que el cron de Vercel
  // pueda llamarla sin cookie) — por eso CRON_SECRET es obligatoria: sin
  // ella, cualquiera en internet podría disparar el barrido de Google y leer
  // el resumen del día. Vercel manda automáticamente el header Authorization
  // con este valor cuando la variable está configurada.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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

    // Todos los días: verifica retos de la IA cumplidos por criterio
    // automático y repone el pool hasta 3 activos. No es crítico.
    try {
      await actualizarRetosIA();
    } catch (err) {
      console.error("Error actualizando los retos de la IA desde el resumen diario", err);
    }

    // El día 1 de cada mes, cierra el mes recién terminado (general + por
    // proyecto). No es crítico — un fallo aquí no debe romper el push del día.
    if (hoy.slice(8, 10) === "01") {
      try {
        const resultado = await generarCierreMensual(mesAnteriorAHoy(hoy));
        if (resultado.generado) {
          lineas.push(`📊 Cierre de ${resultado.mes} listo — revísalo en Economía.`);
        }
      } catch (err) {
        console.error("Error generando el cierre mensual desde el resumen diario", err);
      }
    }

    await ensureStrategicCaseColumns();
    const [accionesRows, decisionesRows, personasRows, agendaRows, movimientosRows, strategicCasesRows] =
      await Promise.all([
        db.select().from(acciones),
        db.select().from(decisiones),
        db.select().from(personas),
        db.select().from(agenda),
        db.select().from(movimientos),
        db.select().from(strategicCases),
      ]);

    // El resumen sale de la misma función que alimenta la tarjeta de Inicio
    // (src/lib/brief.ts). Antes esta lógica vivía suelta aquí, así que el
    // push y la pantalla podían decir cosas distintas sobre el mismo día.
    // El push va con el encuadre de la mañana porque el cron dispara a esa
    // hora; la pantalla usa el momento en que Eduardo la abre.
    const brief = construirBrief(
      {
        acciones: accionesRows,
        decisiones: decisionesRows,
        agenda: agendaRows,
        personas: personasRows,
        movimientos: movimientosRows as MovimientoEconomico[],
        strategicCases: strategicCasesRows,
      },
      hoy,
      "manana"
    );
    urgente = brief.hayCritico;
    lineas.push(...brief.senales.map((s) => s.texto));

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

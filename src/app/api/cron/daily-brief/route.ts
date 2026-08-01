import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { acciones, agenda, decisiones, movimientos, personas, strategicCases } from "@/lib/db/schema";
import { ensureStrategicCaseColumns } from "@/lib/db/migrations";
import { sendPushToAll } from "@/lib/db/push";
import { generarCierreMensual } from "@/lib/cierreMensualEngine";
import { actualizarRetosIA } from "@/lib/goalsEngine";
import { computeProyeccion, computeRunway } from "@/lib/finanzas";
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

function diasHasta(fechaISO: string, hoy: string): number {
  return Math.round((new Date(fechaISO).getTime() - new Date(hoy).getTime()) / 86400000);
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

    // Cerrar el ciclo (Bloque 3): si decidiste algo hace exactamente 30, 60 o
    // 90 días y nunca registraste qué pasó, una sola pregunta al día — sin
    // esto los campos de resultado quedan vacíos para siempre.
    const paraCierre = decisionesRows.filter((d) => {
      if (!d.fechaDecision || d.resultadoPosterior) return false;
      const diasDesde = -diasHasta(d.fechaDecision, hoy);
      return diasDesde === 30 || diasDesde === 60 || diasDesde === 90;
    });
    if (paraCierre.length > 0) {
      const d = paraCierre[0];
      const diasDesde = -diasHasta(d.fechaDecision as string, hoy);
      const caso = strategicCasesRows.find((c) => c.decisionId === d.id);
      lineas.push(
        `Hace ${diasDesde} días decidiste "${d.pregunta}". ¿Qué pasó?` +
          (caso?.hipotesisCritica ? ` La hipótesis crítica era: ${caso.hipotesisCritica}. ¿Se cumplió?` : "")
      );
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

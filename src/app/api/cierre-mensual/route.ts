import { NextResponse } from "next/server";
import { generarCierreMensual } from "@/lib/cierreMensualEngine";

function mesRecienTerminado(): string {
  // Hora de Colombia (UTC-5), independiente del reloj del servidor.
  const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1) - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  let mes: string | undefined;
  try {
    const body = await request.json();
    mes = typeof body?.mes === "string" ? body.mes : undefined;
  } catch {
    // sin body: usar el mes recién terminado
  }

  try {
    const resultado = await generarCierreMensual(mes ?? mesRecienTerminado());
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("Error generando el cierre mensual", err);
    return NextResponse.json(
      { generado: false, error: "No se pudo generar el cierre mensual" },
      { status: 500 }
    );
  }
}

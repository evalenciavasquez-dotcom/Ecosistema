import { NextResponse } from "next/server";
import { actualizarRetosIA } from "@/lib/goalsEngine";

export async function POST() {
  try {
    const resultado = await actualizarRetosIA();
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("Error actualizando los retos de la IA", err);
    return NextResponse.json({ error: "No se pudo actualizar los retos" }, { status: 500 });
  }
}

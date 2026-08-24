import { NextResponse } from "next/server";

// La llave de la IA, en un solo lugar.
//
// Trece rutas la comprobaban por separado y las trece devolvían la misma
// frase seca: "ANTHROPIC_API_KEY no está configurada". Un nombre de variable
// no le dice a nadie qué se rompió, qué sigue funcionando ni dónde se
// arregla — probando con una artista real, el síntoma que se vio fue que la
// pantalla no hacía nada.
//
// Acá vive el mensaje una vez. Y dice las tres cosas que hacen falta para
// actuar: qué falta, qué NO depende de esto, y dónde se toca.
//
// La distinción del medio importa más de lo que parece. Sin llave el sistema
// no está caído: todo lo que CALCULA —cuello de botella, fan rate,
// concentración del catálogo, plazas, presupuesto— sigue igual, porque nada
// de eso pasa por un modelo. Lo que se apaga es lo que REDACTA. Decir
// "no está configurada" a secas hace parecer que se cayó todo.

export const FALTA_LLAVE =
  "Falta la llave de la IA (ANTHROPIC_API_KEY). Sin ella el sistema sigue calculando todos los indicadores " +
  "—cuello de botella, fan rate, concentración del catálogo, plazas, presupuesto—, pero no puede leer archivos " +
  "ni redactar lecturas. Se configura en las variables de entorno del despliegue, y hay que redesplegar para que tome efecto.";

export function hayLlaveDeIA(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Devuelve la llave, o la respuesta de error ya armada si no está. Se usa así:
//
//   const llave = exigirLlaveDeIA();
//   if (typeof llave !== "string") return llave;
//
// El tipo obliga a manejar el caso: no se puede seguir sin decidir qué pasa
// cuando falta.
export function exigirLlaveDeIA(): string | NextResponse {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: FALTA_LLAVE }, { status: 500 });
  }
  return apiKey;
}

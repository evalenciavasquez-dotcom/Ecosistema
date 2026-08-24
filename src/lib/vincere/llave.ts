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

// Dónde se está ejecutando esto.
//
// Nació de perder una tarde: la variable estaba bien puesta en Vercel para
// Production y Preview, y la app seguía diciendo que faltaba — porque las
// pruebas eran en local, donde las variables de Vercel no aplican. Desde
// afuera los dos casos se ven idénticos, y sin saber en cuál estás no se
// puede saber dónde arreglarlo.
//
// Vercel define VERCEL_ENV en sus despliegues; si no está, esto corre en la
// máquina de alguien.
export function dondeCorre(): "production" | "preview" | "local" {
  const env = process.env.VERCEL_ENV;
  if (env === "production") return "production";
  if (env === "preview") return "preview";
  return "local";
}

export const DONDE_SE_ARREGLA: Record<ReturnType<typeof dondeCorre>, string> = {
  production:
    "Corriendo en producción de Vercel. La variable va en Settings → Environment Variables con Production marcado, y hay que redesplegar después de guardarla.",
  preview:
    "Corriendo en un preview de Vercel. La variable va en Settings → Environment Variables con Preview marcado — tenerla solo en Production no alcanza acá — y hay que redesplegar la rama.",
  local:
    "Corriendo en local, no en Vercel: las variables del panel de Vercel NO aplican acá. Va en un archivo .env.local en la raíz del proyecto, con la línea ANTHROPIC_API_KEY=sk-ant-… y reiniciando el servidor.",
};

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
    return NextResponse.json(
      { error: `${FALTA_LLAVE} ${DONDE_SE_ARREGLA[dondeCorre()]}` },
      { status: 500 }
    );
  }
  return apiKey;
}

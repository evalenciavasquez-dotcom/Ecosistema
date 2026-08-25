// ¿Qué hago ahora con este artista?
//
// El sistema tiene veintitrés pantallas. Ordenarlas ayuda, pero no contesta la
// pregunta que uno se hace de verdad al abrir un lunes: dónde va MI atención
// hoy, con ESTE artista. Una lista ordenada sigue obligando a recorrerla.
//
// Este módulo la contesta con una sola respuesta y su razón. No es un resumen
// de estado: es una instrucción.
//
// ---------------------------------------------------------------------------
// El orden de prioridad, y por qué
// ---------------------------------------------------------------------------
//
// 1. LO VENCIDO SIN CERRAR. Una predicción que venció y nadie verificó, o un
//    lanzamiento que pasó su fecha de corte sin cierre. Va primero aunque sea
//    lo menos emocionante, porque es lo único que convierte al sistema en
//    decorado: un marcador que no se cierra siempre parece que va ganando.
//
// 2. NO HAY DATA. Sin números no hay nada que dirigir. Todo lo demás sería
//    opinar con formato de análisis.
//
// 3. HAY DATA Y NADIE LA INTERPRETÓ. Cargar y no leer deja la data muerta.
//
// 4. UNA ETAPA CIEGA ANTES DEL CUELLO. Si no se puede ver una etapa que va
//    antes del problema encontrado, el problema encontrado puede no ser el
//    problema. Cargar ese dato vale más que trabajar sobre el cuello.
//
// 5. EL CUELLO. Acá es donde va el trabajo — y el módulo dice a qué pantalla
//    ir, no solo cuál es la etapa rota.
//
// 6. NADA ROTO. Se dice, con lo que corresponde hacer: sostener y medir.
//
// El sesgo es el mismo que el del tablero global: abre por lo que está sin
// cerrar, no por lo que va bien.

import { VincereProyecto, VincereSeccion, VINCERE_SECCION_LABEL, calcularMarcador } from "./types";
import { motoresDelProyecto } from "./motores";
import { cuelloDeBotella, Etapa, ETAPA_LABEL } from "./cuello";
import { proyectoTieneMedicion } from "./entrada";

// La ventana móvil de oyentes mensuales de Spotify. Un lanzamiento no se puede
// evaluar antes: la cifra todavía mezcla con el mes anterior.
const VENTANA_OYENTES = 28;

function masDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export interface SiguientePaso {
  // A dónde ir. Es lo que hace del paso una instrucción y no un diagnóstico.
  seccion: VincereSeccion;
  titulo: string;
  porQue: string;
  // Vencido y sin cerrar. Se pinta distinto porque no es "lo próximo": es algo
  // que ya se pasó de fecha.
  urgente: boolean;
  // Cuando no hay nada pendiente. El sistema lo dice en vez de inventar tarea.
  alDia: boolean;
}

// Dónde se trabaja cada etapa de la cadena. Sin este mapa, saber que el cuello
// está en "conversión" deja al usuario buscando en qué pantalla se arregla eso
// — que es exactamente el problema que este módulo existe para quitar.
const DONDE_SE_TRABAJA: Record<Etapa, VincereSeccion> = {
  // La obra no aguanta: se mira el catálogo, tema por tema.
  obra: "song",
  // El que escucha no se queda: es identidad y perfil, no pauta.
  conversion: "marca",
  // El que llega no vuelve: es producto — qué tema retiene y cuál no.
  retencion: "song",
  // El crecimiento es del curador: hay que mover la aguja algorítmica antes de
  // escalar, y eso se decide al planear el lanzamiento.
  propiedad: "lanzamiento",
  // La audiencia está y no se cobra: es trabajo comercial.
  monetizacion: "monetizacion",
  // Todo lo demás aguanta y falta gente: acá sí, la pauta.
  alcance: "lanzamiento",
};

// Qué cargar para dejar de estar ciego en cada etapa, y dónde.
const DONDE_SE_CARGA: Record<Etapa, { seccion: VincereSeccion; que: string }> = {
  obra: { seccion: "ingesta", que: "el catálogo con los streams de cada canción" },
  conversion: { seccion: "resumen", que: "los oyentes mensuales, y una segunda foto para poder comparar" },
  retencion: { seccion: "resumen", que: "los oyentes mensuales del mes junto con los streams" },
  propiedad: { seccion: "resumen", que: "el desglose de fuentes de Spotify for Artists" },
  monetizacion: { seccion: "monetizacion", que: "los ingresos, aunque sea de un par de meses" },
  alcance: { seccion: "resumen", que: "una segunda foto para saber si sube o está frenado" },
};

export function siguientePaso(p: VincereProyecto): SiguientePaso {
  const hoy = new Date().toISOString().slice(0, 10);

  // --- 1. Lo vencido sin cerrar ---------------------------------------------
  const marcador = calcularMarcador(p.predicciones ?? []);
  if (marcador.vencidas > 0) {
    return {
      seccion: "predicciones",
      titulo: `Cierra ${marcador.vencidas} predicci${marcador.vencidas === 1 ? "ón vencida" : "ones vencidas"}`,
      porQue:
        "Ya pasó su plazo y nadie las verificó. Es lo primero porque un marcador que no se cierra siempre parece que va ganando, y ahí es donde este sistema se vuelve decorado.",
      urgente: true,
      alDia: false,
    };
  }

  // La fecha en que un lanzamiento ya se puede evaluar no se guarda: se
  // deriva. La ventana móvil de oyentes mensuales de Spotify son 28 días, así
  // que antes de eso la cifra mezcla el lanzamiento con el mes anterior y
  // cerrar sería medir ruido.
  const lanzamientoVencido = (p.lanzamientos ?? []).find(
    (l) => !l.cierre && l.fechaSalida && masDias(l.fechaSalida, VENTANA_OYENTES) < hoy
  );
  if (lanzamientoVencido) {
    const evaluable = masDias(lanzamientoVencido.fechaSalida, VENTANA_OYENTES);
    return {
      seccion: "lanzamiento",
      titulo: `Cierra el lanzamiento de «${lanzamientoVencido.nombreCancion}»`,
      porQue: `Salió el ${lanzamientoVencido.fechaSalida} y desde el ${evaluable} ya se puede medir, pero sigue abierto. Un lanzamiento sin cerrar no deja aprender nada: lo que pasó no se compara nunca con lo que se esperaba.`,
      urgente: true,
      alDia: false,
    };
  }

  // --- 2. No hay MEDICIÓN ----------------------------------------------------
  //
  // La pregunta no es si algún motor puede correr: es si hay números. Un
  // proyecto puede llegar con diagnóstico y marca escritos —texto de criterio—
  // y ningún motor se quejaría, pero interpretar prosa no es dirigir. Se usa la
  // misma función que decide el techo de evidencia en el Triage: si no alcanza
  // para sostener un veredicto de entrada, tampoco para sostener una estrategia.
  if (!proyectoTieneMedicion(p)) {
    return {
      seccion: "ingesta",
      titulo: `Carga data de ${p.nombre}`,
      porQue:
        "No hay una sola cifra medida todavía. Puede haber notas y criterio cargados, y aun así el sistema solo puede opinar: sin números no hay nada que dirigir.",
      urgente: false,
      alDia: false,
    };
  }

  const motores = motoresDelProyecto(p);
  const listos = motores.filter((m) => m.listo);

  // --- 3. Hay data y nadie la interpretó -------------------------------------
  const sinLectura = listos.filter((m) => !(p.insights?.[m.seccion] ?? []).length);
  if (sinLectura.length >= 2) {
    return {
      seccion: sinLectura[0].seccion,
      titulo: `Corre los ${sinLectura.length} motores que tienen data sin leer`,
      porQue: `Hay data cargada en ${sinLectura
        .slice(0, 3)
        .map((m) => m.label)
        .join(", ")}${sinLectura.length > 3 ? " y otros" : ""} y todavía nadie la interpretó. Cargar y no leer deja la data muerta.`,
      urgente: false,
      alDia: false,
    };
  }

  // --- 4 y 5. El cuello, y lo que puede taparlo ------------------------------
  const c = cuelloDeBotella(p);

  if (c.ciegasAntesDelCuello.length) {
    const etapa = c.ciegasAntesDelCuello[0];
    const donde = DONDE_SE_CARGA[etapa];
    return {
      seccion: donde.seccion,
      titulo: `Carga ${donde.que}`,
      porQue: `Sin eso no se puede ver ${ETAPA_LABEL[etapa].toLowerCase()}, que va ANTES del problema que el sistema encontró. Si esa etapa estuviera rota, el trabajo iría a otro lado — y arreglar el cuello equivocado es la forma más cara de avanzar.`,
      urgente: false,
      alDia: false,
    };
  }

  if (c.cuello) {
    const destino = DONDE_SE_TRABAJA[c.cuello.etapa];
    return {
      seccion: destino,
      titulo: `${ETAPA_LABEL[c.cuello.etapa]}: trabaja en ${VINCERE_SECCION_LABEL[destino]}`,
      porQue: `${c.cuello.porQue}. ${c.queHacer}`,
      urgente: false,
      alDia: false,
    };
  }

  // --- 6. Nada roto ----------------------------------------------------------
  if (c.ciegas.length) {
    const etapa = c.ciegas[0];
    const donde = DONDE_SE_CARGA[etapa];
    return {
      seccion: donde.seccion,
      titulo: `Carga ${donde.que}`,
      porQue: `Nada de lo que se puede ver está roto, pero ${ETAPA_LABEL[etapa].toLowerCase()} sigue sin data. Concluir que todo va bien sin poder verlo entero es la conclusión cómoda, no la cierta.`,
      urgente: false,
      alDia: false,
    };
  }

  return {
    seccion: "predicciones",
    titulo: "La cadena aguanta entera: pon una predicción",
    porQue:
      "Ninguna etapa está rota y no hay nada vencido. Este es el momento de comprometer al sistema con algo falsable — si no, dentro de tres meses nadie va a poder decir si acertó.",
    urgente: false,
    alDia: true,
  };
}

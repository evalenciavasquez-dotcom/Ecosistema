import {
  calcularMarcador,
  temperaturaDe,
  VincereAudioAnalisis,
  VincereLetraMetrica,
  VincereProyecto,
  VincereSeccion,
  VINCERE_SECCION_LABEL,
} from "./types";
import { describirTextura } from "./audio";
import type { LoMio, ResumenDinero } from "./dinero";
import { formatFollowers, formatStreams } from "./format";
import { calcularFanRate } from "./fanrate";
import { ACCION_QUE_HACER, mapaDePlazas } from "./plazas";

// Versión compacta de las medidas del audio para el contexto. No se manda la
// curva de energía completa: son 64 números que la IA no puede leer mejor que
// el resumen, y ocuparían el contexto de varias canciones.
function resumenAudio(a: VincereAudioAnalisis) {
  return {
    bpm: a.bpm > 0 ? a.bpm : null,
    // Un BPM medido con poca confianza no debe citarse como hecho: se dice.
    fiabilidadDelBpm: a.bpmConfianza >= 0.6 ? "alta" : a.bpmConfianza >= 0.3 ? "media" : "baja",
    tonalidad: a.tonalidad,
    duracionSeg: a.duracionSeg,
    ganchoEntraEnSeg: a.ganchoSeg,
    seccionesTotal: a.secciones.length,
    energiaMedia: a.energiaMedia,
    rangoDinamicoDb: a.rangoDinamico,
    textura: describirTextura(a),
    aviso: "La textura describe el espectro medido. NO se detectaron instrumentos: no afirmes que hay guitarra, piano ni voz.",
  };
}

function resumenMetrica(m: VincereLetraMetrica) {
  return {
    versos: m.versos,
    silabasPorVersoDominante: m.metricaDominante,
    regularidadPct: m.regularidad,
    esquemaRima: m.esquemaRima,
    tipoRima: m.tipoRima,
    densidadLexicaPct: m.densidadLexica,
    versoMasRepetido: m.repeticiones[0] ?? null,
  };
}

// Construye el contexto compacto que se le entrega a la IA por sección —
// solo la data de ESA sección, para que la interpretación sea específica y
// no un resumen genérico de todo el proyecto.
// Últimas fotos de los indicadores, de más antigua a más reciente. Es lo que
// permite que la lectura hable de evolución ("cayó respecto al mes pasado")
// en vez de describir una foto suelta.
function historialReciente(p: VincereProyecto, cuantas = 8) {
  const h = p.historial ?? [];
  if (h.length < 2) return undefined;
  return h.slice(-cuantas).map((s) => ({
    fecha: s.fecha,
    streamsMes: s.streamsMes,
    seguidores: s.seguidores,
    momentumIndex: s.momentumIndex,
    cancionesEnCatalogo: s.cancionesTotal,
    origen: s.etiqueta,
  }));
}

// Lo que el sistema encontró afuera. Se entrega aparte y etiquetado como
// externo a propósito: la IA nunca debe mezclarlo con la data propia, porque
// una cifra leída en una nota de prensa no tiene el peso de una de Spotify.
// 'respaldo' dice si el hallazgo venía con fuente o era criterio del motor.
export function investigacionExterna(
  p: VincereProyecto,
  foco: "plazas" | "catalogo" | "general" | "todo",
  cuantas = 3
): unknown | undefined {
  const invs = (p.investigaciones ?? []).slice(0, cuantas);
  if (!invs.length) return undefined;

  const lista = invs.map((inv) => {
    const comun = {
      consulta: inv.consulta,
      fecha: inv.creadoEn.slice(0, 10),
      resumen: inv.resumen,
      hallazgos: inv.hallazgos.map((h) => ({
        hallazgo: h.texto,
        implicacion: h.implicacion,
        nivel: h.nivel,
        respaldo: h.fuentes.length ? `${h.fuentes.length} fuente(s) web` : "sin fuente — criterio del motor",
      })),
      preguntasSinResponder: inv.preguntasAbiertas,
    };
    if (foco === "todo") {
      return {
        ...comun,
        senalesDePlaza: inv.senalesPlaza,
        implicacionesParaElCatalogo: inv.implicacionesCatalogo,
      };
    }
    if (foco === "plazas") {
      return { ...comun, senalesDePlaza: inv.senalesPlaza };
    }
    if (foco === "catalogo") {
      return { ...comun, implicacionesParaElCatalogo: inv.implicacionesCatalogo };
    }
    return comun;
  });

  return {
    advertencia:
      "Esto viene de búsquedas en la web, NO de la data propia del artista. Trátalo como referencia externa: nómbralo como tal y nunca lo presentes como una métrica del proyecto.",
    investigaciones: lista,
  };
}

// La marca declarada, en la forma en que la IA la necesita. Se marca
// explícitamente como declaración y no como hecho: es lo que el artista DICE
// ser, y todo el motor de Marca existe para contrastarlo, no para creerlo.
export function marcaDeclarada(p: VincereProyecto): unknown | undefined {
  const m = p.marca;
  if (!m) return undefined;
  const algo = m.posicionamiento.trim() || m.promesa.trim() || m.atributos.length || m.antipatron.trim();
  if (!algo) return undefined;
  return {
    advertencia: "Esto es lo que el artista DECLARA ser, no un hecho verificado. Contrástalo contra la data.",
    posicionamiento: m.posicionamiento || null,
    promesa: m.promesa || null,
    atributos: m.atributos.length ? m.atributos : null,
    territorio: m.territorio || null,
    loQueNoEs: m.antipatron || "no declarado — la marca no excluye nada",
    puntosContacto: m.puntosContacto.length
      ? m.puntosContacto.map((pc) => ({ canal: pc.canal, queProyecta: pc.queProyecta, coherencia: pc.coherencia }))
      : null,
  };
}

// Contexto del motor de Marca. A diferencia del resto de secciones —
// deliberadamente estrechas — aquí se entrega ancho a propósito: una brecha de
// marca solo se ve cruzando lo declarado con catálogo, audiencia y zonas.
export function buildMarcaContext(p: VincereProyecto): unknown {
  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    marcaDeclarada:
      marcaDeclarada(p) ??
      "el artista NO ha declarado marca todavía: deduce de la data qué marca proyecta hoy sin saberlo",
    diagnostico: p.diagnostico,
    // El catálogo es donde la marca se verifica o se desmiente: lo que la gente
    // realmente retiene dice más que cualquier declaración.
    catalogo: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.analisis
            ? { tema: c.analisis.tema, gancho: c.analisis.gancho, fitMarcaSegunAnalisisPrevio: c.analisis.fitMarca }
            : {}),
        }))
      : "sin catálogo cargado",
    audiencia: p.audiencia,
    zonasCalor: p.zonasCalor.length ? p.zonasCalor : "sin zonas cargadas",
    ...(investigacionExterna(p, "general", 3) ? { investigacionExterna: investigacionExterna(p, "general", 3) } : {}),
  };
}

// Los shows con su conversión calculada. El porcentaje se hace acá y no se le
// pide a la IA: dividir asistencia entre aforo es aritmética exacta, y un
// modelo de lenguaje la falla lo justo como para arruinar la lectura.
function showsConConversion(p: VincereProyecto) {
  const shows = p.shows ?? [];
  if (!shows.length) return undefined;
  return shows.map((s) => ({
    ciudad: s.ciudad,
    fecha: s.fecha,
    sala: s.sala,
    aforo: s.aforo,
    asistencia: s.asistencia,
    // Sin taquilla reportada no hay conversión que calcular. Se dice en vez de
    // mandar un cero, que la IA leería como "no fue nadie".
    conversionPct:
      s.asistencia != null && s.aforo > 0 ? Math.round((s.asistencia / s.aforo) * 100) : null,
    ...(s.asistencia == null
      ? { avisoDeTaquilla: "el empresario no reportó cuánta gente entró: no hay conversión medible en este show" }
      : {}),
    ...(s.ingresoNeto != null ? { ingresoNeto: s.ingresoNeto, moneda: s.moneda } : {}),
    ...(s.nota.trim() ? { nota: s.nota.trim() } : {}),
  }));
}

// Contactos propios que pueden servir de puente hacia un sello o una marca.
//
// Vienen del C.C.O., no de VINCERE: es el primer punto donde los dos sistemas
// se hablan. Se manda solo lo mínimo para reconocer un puente —nombre, empresa,
// rol, cómo está la relación e influencia— y se dejan fuera los campos
// sensibles de esa ficha (pagos, riesgos, conversaciones pendientes), que no
// aportan nada a escribir un pitch.
export interface ContactoPuente {
  nombre: string;
  empresa: string;
  rol: string;
  relacion: string;
  influencia: string;
  ultimoContacto: string;
}

// Todo lo que se sabe de UNA ciudad, junto. Sin esto, el pitch a un promotor
// tendría que buscar la plaza entre la data nacional y terminaría citando
// números del país entero — que es exactamente lo que un empresario detecta y
// castiga. El aforo máximo probado y la conversión se calculan acá: son
// aritmética, no interpretación.
function contextoDePlaza(p: VincereProyecto, ciudad: string) {
  const clave = ciudad.trim().toLocaleLowerCase("es");
  const zona = p.zonasCalor.find((z) => z.ciudad.trim().toLocaleLowerCase("es") === clave);
  const showsAqui = (p.shows ?? []).filter((s) => s.ciudad.trim().toLocaleLowerCase("es") === clave);

  const conTaquilla = showsAqui.filter((s) => s.asistencia != null && s.aforo > 0);
  const mejorAsistencia = conTaquilla.length
    ? Math.max(...conTaquilla.map((s) => s.asistencia as number))
    : null;

  const plazaEvaluada = (p.touringDiagnostico?.plazas ?? []).find(
    (pl) => pl.ciudad.trim().toLocaleLowerCase("es") === clave
  );

  return {
    ciudad,
    calor: zona
      ? { valor: zona.calor, temperatura: temperaturaDe(zona.calor), escala: "0-100, relativo a las demás plazas del artista" }
      : "esta ciudad no está entre las zonas de calor cargadas: no hay medida de demanda local",
    showsPrevios: showsAqui.length
      ? showsAqui.map((s) => ({
          fecha: s.fecha,
          sala: s.sala,
          aforo: s.aforo,
          asistencia: s.asistencia,
          conversionPct:
            s.asistencia != null && s.aforo > 0 ? Math.round((s.asistencia / s.aforo) * 100) : null,
          ...(s.asistencia == null
            ? { avisoDeTaquilla: "el empresario no reportó cuánta gente entró: este show no prueba convocatoria" }
            : {}),
          ...(s.nota.trim() ? { nota: s.nota.trim() } : {}),
        }))
      : "nunca se ha tocado en esta ciudad: no hay prueba de taquilla y el pitch tiene que decirlo",
    mejorAsistenciaProbada:
      mejorAsistencia != null
        ? {
            personas: mejorAsistencia,
            nota: "Es el techo demostrado en esta plaza. Proponer una sala muy por encima de esta cifra es apostar, y hay que decirlo como apuesta.",
          }
        : "no hay ninguna asistencia reportada en esta ciudad: cualquier aforo que propongas es una estimación, no un dato",
    ...(plazaEvaluada
      ? {
          lecturaDeTouring: {
            veredicto: plazaEvaluada.veredicto,
            tamanoSala: plazaEvaluada.tamanoSala,
            lectura: plazaEvaluada.lectura,
          },
        }
      : {}),
  };
}

// Contexto del Pitch. Lo arma el cliente porque necesita cruzar el proyecto de
// VINCERE con los contactos del C.C.O., que viven en otro store.
export function buildPitchContext(
  p: VincereProyecto,
  contactos: ContactoPuente[],
  plaza?: string | null
): unknown {
  return {
    ...(plaza?.trim() ? { laPlaza: contextoDePlaza(p, plaza.trim()) } : {}),
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      streamsCambioPct: p.resumen.streamsCambioPct,
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
      seguidoresCambioPct: p.resumen.seguidoresCambioPct,
      momentumIndex: p.resumen.momentumIndex,
    },
    diagnostico: p.diagnostico,
    marca: marcaDeclarada(p) ?? "el artista no ha declarado su marca",
    catalogo: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
          ...(c.analisis
            ? { tema: c.analisis.tema, gancho: c.analisis.gancho, potencial: c.analisis.clasificacionPotencial }
            : {}),
        }))
      : "sin catálogo cargado",
    audiencia: p.audiencia,
    zonasCalor: p.zonasCalor.length ? p.zonasCalor : "sin zonas cargadas",
    // La taquilla real es el dato más convincente que existe frente a un
    // tercero: demuestra que la audiencia paga, no solo que escucha.
    shows: showsConConversion(p) ?? "sin shows registrados",
    // Si ya se analizó el negocio, el pitch no lo reinventa: lo usa.
    ...(p.oportunidad
      ? {
          analisisDeOportunidad: {
            puntaje: p.oportunidad.puntaje,
            viaRecomendada: p.oportunidad.viaRecomendada,
            loQueLoBaja: p.oportunidad.loQueLoBaja,
            vias: p.oportunidad.vias.map((v) => ({
              modalidad: v.modalidad,
              participacion: v.participacion,
              queAportamos: v.queAportamos,
            })),
          },
        }
      : {}),
    contactosPropios: contactos.length
      ? {
          nota: "Contactos reales de la agenda de Eduardo. Úsalos solo para señalar puentes que existan de verdad; nunca inventes personas ni relaciones.",
          lista: contactos,
        }
      : "no hay contactos cargados en la agenda: no propongas puentes personales",
    ...(investigacionExterna(p, "general", 3) ? { investigacionExterna: investigacionExterna(p, "general", 3) } : {}),
  };
}

// Contexto de Monetización. Las cifras llegan resueltas desde dinero.ts: la IA
// interpreta, no calcula.
export function buildMonetizacionContext(
  p: VincereProyecto,
  r: ResumenDinero,
  loMio: LoMio,
  cargaSemanalTotal?: number
): unknown {
  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    // El lado de la atención: lo que se mide todos los días.
    alcance: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      streamsCambioPct: p.resumen.streamsCambioPct,
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
    },
    dinero: r.ingresos.length
      ? {
          ...(r.variasMonedas
            ? {
                avisoDeMonedas: `Hay ingresos en varias monedas (${r.monedas.map((m) => m.moneda).join(", ")}) y NO se convirtieron. Todo el análisis de abajo es solo sobre ${r.monedaPrincipal}. No sumes monedas distintas ni inventes un tipo de cambio.`,
              }
            : {}),
          moneda: r.monedaPrincipal,
          totalCargado: r.totalPrincipal,
          mesesConDatos: r.meses,
          promedioMensual: r.promedioMensual,
          repartoPorFuente: r.porFuente.map((f) => ({
            fuente: f.tipo,
            total: f.total,
            porcentaje: f.pct,
          })),
          concentracionPct: r.concentracionPct,
          fuenteDominante: r.fuenteDominante,
          // Los dos números que ponen el alcance en su lugar.
          ingresoPorMilStreams_soloStreaming:
            r.porMilStreams != null
              ? Number(r.porMilStreams.toFixed(2))
              : "no calculable: falta ingreso de streaming o cifra de streams",
          ingresoPorMilStreams_todasLasFuentes:
            r.porMilStreamsTotal != null ? Number(r.porMilStreamsTotal.toFixed(2)) : "no calculable",
          notaSobreEsosDos:
            "El primero es lo que paga el streaming; el segundo, lo que vale esa misma audiencia contando todo lo que entra. La distancia entre ambos ES la lectura: si el segundo es varias veces el primero, el streaming está siendo el foco equivocado.",
          detalle: r.ingresos.map((i) => ({
            fuente: i.tipo,
            monto: i.monto,
            moneda: i.moneda,
            periodo: i.periodo,
            ...(i.nota ? { nota: i.nota } : {}),
          })),
        }
      : "no hay ingresos cargados: no se puede leer de qué vive este artista. Dilo, y trabaja solo sobre las vías que su data sugiere",
    // Evidencia de que la audiencia paga, no solo escucha.
    shows: showsConConversion(p) ?? "sin shows registrados",
    audiencia: p.audiencia,
    zonasCalor: p.zonasCalor.length ? p.zonasCalor : "sin zonas cargadas",
    marca: marcaDeclarada(p) ?? "el artista no ha declarado su marca",
    catalogo: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
        }))
      : "sin catálogo cargado",
    loQueNosQueda: loMio.aplica
      ? {
          via: loMio.via,
          mensualEstimado: loMio.mensual,
          moneda: loMio.moneda,
          estado: loMio.hipotetico
            ? "HIPOTÉTICO — el vínculo no está confirmado, trátalo como escenario y no como ingreso"
            : "acordado",
          explicacion: loMio.explicacion,
          ...(cargaSemanalTotal != null
            ? {
                horasSemanalesComprometidasEnTodo: cargaSemanalTotal,
                nota: "Úsalo para decir si lo que deja este proyecto justifica el tiempo que ocupa.",
              }
            : {}),
        }
      : loMio.explicacion || "no aplica: no hay vínculo de negocio con este proyecto",
    ...(investigacionExterna(p, "general", 3) ? { investigacionExterna: investigacionExterna(p, "general", 3) } : {}),
  };
}

// Contexto de Oportunidad. Es el motor que decide si entrar, así que recibe
// todo lo que el sistema sabe del artista — incluidas las lecturas que otros
// motores ya emitieron. Un análisis de negocio que ignora que Marca detectó una
// brecha grave, o que Touring dijo que no está para salir, decide a ciegas.
// Cómo se relaciona hoy Eduardo con este proyecto. Cambia la pregunta que hay
// que responder: a un cliente se le cotiza, a un socio se le calcula
// participación, y lo no confirmado es hipótesis y no ingreso.
function vinculoActual(p: VincereProyecto, cargaSemanalTotal?: number): unknown {
  const v = p.vinculo;
  if (!v || v.tipo === "ninguno") {
    return "no hay vínculo de negocio con este proyecto: es referencia de mercado. No propongas participación ni tarifa";
  }
  return {
    tipo: v.tipo,
    estado: v.confirmado
      ? "ACORDADO — esto ya está en marcha"
      : "SIN CONFIRMAR — es lo que se está pensando pedir, trátalo como hipótesis y nunca como ingreso existente",
    ...(v.participacionPct != null ? { participacionPct: v.participacionPct } : {}),
    ...(v.tarifa != null ? { tarifa: v.tarifa, moneda: v.moneda, periodicidad: v.periodicidad } : {}),
    ...(v.horasSemanales != null ? { horasSemanalesEnEsteProyecto: v.horasSemanales } : {}),
    ...(v.notas.trim() ? { notas: v.notas.trim() } : {}),
    ...(cargaSemanalTotal != null
      ? {
          cargaSemanalTotalComprometida: cargaSemanalTotal,
          nota: "Horas ya comprometidas en TODOS los proyectos, sobre una semana de referencia de 40h. Úsalo para el costo de oportunidad: si queda poco margen, dilo con el número en la mano en vez de hablar de tiempo en abstracto.",
        }
      : {}),
  };
}

export function buildOportunidadContext(p: VincereProyecto, cargaSemanalTotal?: number): unknown {
  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    tipo: p.tipo,
    vinculoActual: vinculoActual(p, cargaSemanalTotal),
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      streamsCambioPct: p.resumen.streamsCambioPct,
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
      seguidoresCambioPct: p.resumen.seguidoresCambioPct,
      momentumIndex: p.resumen.momentumIndex,
      serieStreamsMiles: p.resumen.serie,
    },
    diagnostico: p.diagnostico,
    marca: marcaDeclarada(p) ?? "el artista no ha declarado su marca",
    ...(p.marcaDiagnostico
      ? {
          brechaDeMarca: {
            puntuacion: p.marcaDiagnostico.puntuacionCoherencia,
            coherencia: p.marcaDiagnostico.coherencia,
            veredicto: p.marcaDiagnostico.veredicto,
          },
        }
      : {}),
    catalogo: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
        }))
      : "sin catálogo cargado",
    audiencia: p.audiencia,
    zonasCalor: p.zonasCalor.length ? p.zonasCalor : "sin zonas cargadas",
    // La convocatoria real y el dinero que dejó cada fecha: la señal más
    // cercana a "esto genera ingresos" que tiene el sistema.
    shows: showsConConversion(p) ?? "sin shows registrados",
    ...(p.touringDiagnostico
      ? {
          lecturaDeTouring: {
            listoParaGira: p.touringDiagnostico.listoParaGira,
            veredicto: p.touringDiagnostico.veredicto,
          },
        }
      : {}),
    kpis: p.kpis.length ? p.kpis : "sin KPIs cargados",
    decisionesAbiertas: p.decisiones.filter((d) => d.estado === "Pendiente").map((d) => d.texto),
    historialDeCargas:
      historialReciente(p, 10) ?? "solo hay una foto de indicadores: no se puede leer trayectoria todavía",
    ...(investigacionExterna(p, "todo", 4) ? { investigacionExterna: investigacionExterna(p, "todo", 4) } : {}),
  };
}

// Contexto de A&R. La pregunta central —¿esta colaboración trae gente nueva?—
// solo se puede responder sabiendo quién escucha hoy y qué dice el artista ser,
// así que van audiencia, zonas y marca junto a los candidatos.
export function buildARContext(p: VincereProyecto): unknown {
  const candidatos = p.candidatos ?? [];
  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
      nota: "Este es el tamaño del artista. La asimetría con cada candidato se juzga contra estas cifras.",
    },
    // El antipatrón es lo que decide cuando un nombre grande tienta.
    marcaDeclarada:
      marcaDeclarada(p) ??
      "el artista no ha declarado su marca: no se puede juzgar fit ni antipatrón con solidez, dilo y baja el nivel",
    candidatos: candidatos.length
      ? candidatos.map((c) => ({
          nombre: c.nombre,
          tipo: c.tipo,
          queAporta: c.queAporta,
          origen: c.origen,
          estado: c.estado,
        }))
      : "todavía no hay candidatos cargados: trabaja solo sobre perfilQueFalta y dilo",
    // Quién escucha hoy — la única forma de estimar si un candidato aporta
    // audiencia nueva o la misma de siempre.
    audienciaActual: p.audiencia,
    zonasCalor: p.zonasCalor.length ? p.zonasCalor : "sin zonas cargadas",
    // Qué le funciona de verdad al artista: el criterio para juzgar productores.
    catalogo: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
        }))
      : "sin catálogo cargado",
    ...(investigacionExterna(p, "general", 4) ? { investigacionExterna: investigacionExterna(p, "general", 4) } : {}),
  };
}

// Contexto de Shows y Touring. Cruza tres cosas que hoy viven separadas: dónde
// escuchan (zonas de calor), quién de verdad fue a un show (conversión) y qué
// se sabe de la escena de esa plaza (investigación).
export function buildTouringContext(p: VincereProyecto): unknown {
  const shows = showsConConversion(p);
  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
    },
    // Dónde escuchan. Es la señal de interés, NO de convocatoria.
    zonasCalor: p.zonasCalor.length
      ? {
          advertencia:
            "El calor mide escucha, no asistencia. Una plaza caliente puede vender cero entradas: no lo trates como convocatoria.",
          ciudades: p.zonasCalor,
        }
      : "sin zonas de calor cargadas",
    // La única evidencia dura de conversión que existe en el sistema.
    showsPrevios:
      shows ??
      "no hay shows registrados: no existe conversión medida y todo lo que digas sobre convocatoria es estimación desde streaming, no dato",
    audiencia: p.audiencia,
    ...(marcaDeclarada(p) ? { marcaDeclarada: marcaDeclarada(p) } : {}),
    ...(investigacionExterna(p, "plazas", 3) ? { investigacionExterna: investigacionExterna(p, "plazas", 3) } : {}),
  };
}


// El fan rate va al contexto ya calculado. Es una división, y el modelo la
// falla lo justo para arruinar la lectura — igual que el resto de la
// aritmética de esta plataforma.
function bloqueFanRate(p: VincereProyecto) {
  const f = calcularFanRate(p);
  if (!f.actual) return { fanRate: f.falta };
  return {
    fanRate: {
      acumuladoPct: f.actual.pct,
      seguidores: f.actual.seguidores,
      oyentesMensuales: f.actual.oyentes,
      nota: "Qué proporción de quien escucha terminó siguiendo. Arrastra toda la historia del artista.",
      ...(f.marginal && !f.marginal.audienciaBajo
        ? {
            deLaAudienciaNuevaPct: f.marginal.pct,
            oyentesGanados: f.marginal.oyentesGanados,
            seguidoresGanados: f.marginal.seguidoresGanados,
            desde: f.marginal.desde,
            notaMarginal:
              "De los oyentes ganados desde esa fecha, cuántos se volvieron seguidores. Es el que dice si lo que se está haciendo AHORA atrae gente que se queda. Un marginal muy por debajo del acumulado es tráfico prestado: playlist editorial o pauta mal apuntada.",
          }
        : {}),
      ...(f.marginal?.audienciaBajo
        ? { avisoMarginal: "Los oyentes bajaron respecto a la primera foto: el marginal no se puede leer como conversión." }
        : {}),
      ...(f.falta ? { loQueFalta: f.falta } : {}),
    },
  };
}


// El mapa de plazas va resuelto al contexto. La regla de dónde rinde la pauta
// es determinista a propósito: si la decidiera el modelo, cambiaría entre
// corridas y dejaría de ser algo que se puede defender en una mesa.
function bloqueDePlazas(p: VincereProyecto) {
  const m = mapaDePlazas(p);
  if (!m.plazas.length) return { mapaDePlazas: m.titular };
  return {
    mapaDePlazas: {
      titular: m.titular,
      regla:
        "Calculado por el sistema, no por ti: una plaza CALIENTE ya encontró al artista y pautar ahí compra audiencia que ya se tenía; donde el presupuesto rinde es en la plaza MEDIA (hay señal y hay techo); una FRÍA en un país que ya tiene calientes es expansión con respaldo. Respeta esta clasificación — no propongas invertir en las marcadas como sostener o esperar.",
      plazas: m.plazas.map((z) => ({
        ciudad: z.ciudad,
        pais: z.pais,
        calor: z.calor,
        accion: z.accion,
        porQue: z.razon,
        queSignifica: ACCION_QUE_HACER[z.accion],
        ...(z.prioridadPauta != null ? { prioridadDePauta: z.prioridadPauta } : {}),
        ...(z.mejorConversionPct != null ? { mejorTaquillaPct: z.mejorConversionPct } : {}),
      })),
      ...(m.avisos.length ? { limitacionesDeLaData: m.avisos } : {}),
    },
  };
}

export function buildSectionContext(p: VincereProyecto, seccion: VincereSeccion): unknown {
  const base = { proyecto: p.nombre, genero: p.genero, fase: p.fase, tipo: p.tipo };
  const evolucion = historialReciente(p);
  const conExterno = (foco: "plazas" | "catalogo" | "general") => {
    const externo = investigacionExterna(p, foco);
    return externo ? { investigacionExterna: externo } : {};
  };

  switch (seccion) {
    case "resumen":
      return {
        ...base,
        streamsMes: p.resumen.streamsMes,
        streamsCambioPct: p.resumen.streamsCambioPct,
        seguidores: p.resumen.seguidores,
        seguidoresCambioPct: p.resumen.seguidoresCambioPct,
        momentumIndex: p.resumen.momentumIndex,
        serieStreamsMiles: p.resumen.serie,
        ...bloqueFanRate(p),
    ...bloqueDePlazas(p),
        ...(evolucion ? { historialDeCargas: evolucion } : {}),
        ...conExterno("general"),
      };
    case "diagnostico":
      return { ...base, diagnostico: p.diagnostico, ...conExterno("general") };
    case "marca":
      return {
        ...base,
        marcaDeclarada: marcaDeclarada(p) ?? "el artista todavía no ha declarado su marca",
        ...(p.marcaDiagnostico
          ? {
              diagnosticoDeMarcaYaGenerado: {
                coherencia: p.marcaDiagnostico.coherencia,
                puntuacion: p.marcaDiagnostico.puntuacionCoherencia,
                brechas: p.marcaDiagnostico.brechas.map((b) => `${b.declarado} → ${b.recibido}`),
                veredicto: p.marcaDiagnostico.veredicto,
              },
            }
          : {}),
        ...conExterno("general"),
      };
    case "song":
      return {
        ...base,
        // Con audio medido en varias canciones esta lectura deja de ser sobre
        // temas sueltos y pasa a ser sobre el PATRÓN: qué tempo, qué energía y
        // qué momento de gancho tienen las que de verdad funcionan.
        nota: p.canciones.some((c) => c.audio)
          ? "Varias canciones traen medidas del audio. Busca el patrón: compara tempo, energía, momento del gancho y textura entre las que retienen y las que se saltan."
          : undefined,
        canciones: p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
          ...(c.metrica ? { metrica: resumenMetrica(c.metrica) } : {}),
          ...(c.notasProduccion?.trim()
            ? { observacionExterna: { texto: c.notasProduccion.trim(), origen: "servicio externo o productor, NO medido por la plataforma" } }
            : {}),
        })),
        ...conExterno("catalogo"),
      };
    case "audiencia":
      return { ...base, audiencia: p.audiencia, ...conExterno("general") };
    case "calor":
      return {
        ...base,
        zonasCalor: p.zonasCalor,
        ...bloqueDePlazas(p),
        // Si ya se tocó en alguna de estas ciudades, el calor deja de leerse
        // solo: se puede contrastar contra quién fue de verdad.
        ...(showsConConversion(p) ? { showsPrevios: showsConConversion(p) } : {}),
        ...conExterno("plazas"),
      };
    case "ar":
      return {
        ...base,
        candidatos: p.candidatos ?? "sin candidatos cargados",
        marcaDeclarada: marcaDeclarada(p) ?? "el artista todavía no ha declarado su marca",
        audienciaActual: p.audiencia,
        ...conExterno("general"),
      };
    case "touring":
      return {
        ...base,
        zonasCalor: p.zonasCalor,
        showsPrevios: showsConConversion(p) ?? "sin shows registrados",
        ...(p.touringDiagnostico
          ? {
              diagnosticoYaGenerado: {
                listoParaGira: p.touringDiagnostico.listoParaGira,
                plazas: p.touringDiagnostico.plazas.map((pl) => `${pl.ciudad}: ${pl.veredicto}`),
                veredicto: p.touringDiagnostico.veredicto,
              },
            }
          : {}),
        ...conExterno("plazas"),
      };
    case "management":
      return { ...base, decisiones: p.decisiones, ...conExterno("general") };
    case "kpis":
      return { ...base, kpis: p.kpis, ...(evolucion ? { historialDeCargas: evolucion } : {}) };
    default:
      return base;
  }
}

export function sectionTitle(seccion: VincereSeccion): string {
  return `Lectura VINCERE — ${VINCERE_SECCION_LABEL[seccion]}`;
}

// Contexto del proyecto COMPLETO para el informe final — a diferencia del
// contexto por sección (deliberadamente estrecho), aquí se entrega todo junto,
// incluidas las lecturas ya generadas, para que la IA cruce motores entre sí.
export function buildInformeContext(p: VincereProyecto): unknown {
  const sinData = (arr: unknown[]) => (arr.length === 0 ? "sin data cargada" : arr);

  const lecturasPrevias = Object.entries(p.insights)
    .filter(([, list]) => (list?.length ?? 0) > 0)
    .map(([seccion, list]) => ({
      seccion: VINCERE_SECCION_LABEL[seccion as VincereSeccion] ?? seccion,
      lecturas: (list ?? []).map((i) => ({ texto: i.texto, nivel: i.nivel })),
    }));

  const preguntasTrabajadas = Object.entries(p.qaLog)
    .filter(([, list]) => (list?.length ?? 0) > 0)
    .flatMap(([seccion, list]) =>
      (list ?? []).map((q) => ({
        seccion: VINCERE_SECCION_LABEL[seccion as VincereSeccion] ?? seccion,
        pregunta: q.pregunta,
        respuesta: q.respuesta,
        nivel: q.nivel,
      }))
    );

  return {
    artista: p.nombre,
    genero: p.genero,
    fase: p.fase,
    momentum: {
      streamsMes: p.resumen.streamsMes,
      streamsMesLegible: formatStreams(p.resumen.streamsMes),
      streamsCambioPct: p.resumen.streamsCambioPct,
      seguidores: p.resumen.seguidores,
      seguidoresLegible: formatFollowers(p.resumen.seguidores),
      seguidoresCambioPct: p.resumen.seguidoresCambioPct,
      momentumIndex: p.resumen.momentumIndex,
      serieStreamsMiles: sinData(p.resumen.serie),
    },
    ...bloqueFanRate(p),
    ...bloqueDePlazas(p),
    diagnostico: p.diagnostico,
    marca: marcaDeclarada(p) ?? "el artista no ha declarado su marca en la plataforma",
    diagnosticoDeMarca: p.marcaDiagnostico
      ? {
          coherenciaDeclaradoVsRecibido: p.marcaDiagnostico.coherencia,
          puntuacion: p.marcaDiagnostico.puntuacionCoherencia,
          brechas: p.marcaDiagnostico.brechas.map((b) => ({
            declara: b.declarado,
            recibe: b.recibido,
            lectura: b.lectura,
            nivel: b.nivel,
          })),
          diferenciacion: p.marcaDiagnostico.diferenciacion,
          veredicto: p.marcaDiagnostico.veredicto,
        }
      : "no se ha contrastado la marca contra la data todavía",
    canciones: p.canciones.length
      ? p.canciones.map((c) => ({
          nombre: c.nombre,
          streams: c.streams,
          retencionPct: c.retencionPct,
          skipPct: c.skipPct,
          playlistAdds: c.playlistAdds,
          ...(c.audio ? { audio: resumenAudio(c.audio) } : {}),
          ...(c.metrica ? { metrica: resumenMetrica(c.metrica) } : {}),
          // El análisis de letra, cuando existe, es material de primera para
          // explicar por qué una canción retiene o se salta.
          analisisLetra: c.analisis
            ? {
                tema: c.analisis.tema,
                gancho: c.analisis.gancho,
                audiencia: c.analisis.audiencia,
                fitMarca: c.analisis.fitMarca,
                potencial: c.analisis.clasificacionPotencial,
                decision: c.analisis.decision,
                nivel: c.analisis.nivel,
              }
            : null,
        }))
      : "sin data cargada",
    audiencia: {
      edad: sinData(p.audiencia.edad),
      plataformas: sinData(p.audiencia.plataformas),
      paises: sinData(p.audiencia.paises),
    },
    zonasCalor: sinData(p.zonasCalor),
    shows: showsConConversion(p) ?? "sin shows registrados",
    colaboraciones: (p.candidatos ?? []).length
      ? {
          candidatos: (p.candidatos ?? []).map((c) => ({ nombre: c.nombre, tipo: c.tipo, estado: c.estado })),
          ...(p.arDiagnostico
            ? {
                primeroPerseguir: p.arDiagnostico.primeroPerseguir,
                veredicto: p.arDiagnostico.veredicto,
                senalesDeAlerta: p.arDiagnostico.senalesDeAlerta,
              }
            : {}),
        }
      : "sin candidatos de colaboración cargados",
    diagnosticoDeTouring: p.touringDiagnostico
      ? {
          listoParaGira: p.touringDiagnostico.listoParaGira,
          lectura: p.touringDiagnostico.lecturaGeneral,
          plazas: p.touringDiagnostico.plazas.map((pl) => ({
            ciudad: pl.ciudad,
            veredicto: pl.veredicto,
            conversion: pl.senalDeConversion,
            nivel: pl.nivel,
          })),
          trampas: p.touringDiagnostico.trampas,
          veredicto: p.touringDiagnostico.veredicto,
        }
      : "no se ha evaluado dónde tocar todavía",
    decisiones: sinData(p.decisiones),
    kpis: sinData(p.kpis),
    lecturasVincerePrevias: lecturasPrevias.length ? lecturasPrevias : "todavía no se han generado lecturas por sección",
    preguntasTrabajadas: preguntasTrabajadas.length ? preguntasTrabajadas : "sin preguntas trabajadas",
    historialDeCargas:
      historialReciente(p, 12) ??
      "solo hay una foto de indicadores: todavía no se puede leer evolución en el tiempo",
    investigacionExterna:
      investigacionExterna(p, "todo", 4) ??
      "no se ha investigado nada afuera para este proyecto: el informe se sostiene solo en data propia",
    // El marcador de predicciones es lo único del sistema que no es opinión:
    // dice si sus lecturas anteriores acertaron. Un informe que lo ignora
    // repite el mismo tono seguro aunque el histórico diga que se equivocó.
    marcadorDePredicciones: (() => {
      const preds = p.predicciones ?? [];
      if (!preds.length) return "no hay predicciones registradas: este sistema todavía no tiene historial de aciertos";
      const m = calcularMarcador(preds);
      return {
        acertadas: m.acertadas,
        falladas: m.falladas,
        parciales: m.parciales,
        abiertas: m.abiertas,
        vencidasSinCerrar: m.vencidas,
        pctAcierto: m.pctAcierto,
        losNivelesDeEvidenciaSirven:
          m.nivelesSirven === null
            ? "todavía no hay datos suficientes para saberlo"
            : m.nivelesSirven
              ? "sí: las lecturas de nivel alto aciertan más que las de nivel bajo"
              : "NO: las lecturas de nivel alto no aciertan más que las de nivel bajo. Sé más prudente al asignar niveles altos en este informe",
        falladasConcretas: preds
          .filter((x) => x.estado === "fallada")
          .map((x) => ({ afirmacion: x.afirmacion, queOcurrio: x.queOcurrio })),
      };
    })(),
    informeAnterior: (p.informesArchivados ?? [])[0]
      ? {
          fecha: (p.informesArchivados ?? [])[0].generadoEn.slice(0, 10),
          titulo: (p.informesArchivados ?? [])[0].titulo,
          veredicto: (p.informesArchivados ?? [])[0].veredicto,
          pasosCumplidos: (p.informesArchivados ?? [])[0].proximosPasos.filter((x) => x.hecho).map((x) => x.accion),
          pasosPendientes: (p.informesArchivados ?? [])[0].proximosPasos.filter((x) => !x.hecho).map((x) => x.accion),
        }
      : "no hay informe anterior con el que comparar",
  };
}

export function buildComparacionContext(a: VincereProyecto, b: VincereProyecto): unknown {
  const snap = (p: VincereProyecto) => ({
    nombre: p.nombre,
    tipo: p.tipo,
    fase: p.fase,
    streamsMes: p.resumen.streamsMes,
    streamsMesLegible: formatStreams(p.resumen.streamsMes),
    streamsCambioPct: p.resumen.streamsCambioPct,
    seguidores: p.resumen.seguidores,
    seguidoresLegible: formatFollowers(p.resumen.seguidores),
    seguidoresCambioPct: p.resumen.seguidoresCambioPct,
    momentumIndex: p.resumen.momentumIndex,
  });
  return {
    nota: "b es una referencia de mercado; si su tipo es 'competencia' su data suele ser pública/parcial (nivel 2). Ajusta la lectura por macro-fase.",
    a: snap(a),
    b: snap(b),
  };
}

import { z } from "zod";

const nivelSchema = z
  .number()
  .int()
  .min(1)
  .max(4)
  .describe("Nivel de evidencia: 4 alta, 3 sólida, 2 parcial/no verificada, 1 especulativo");

export const insightSchema = z.object({
  texto: z.string().describe("Un insight de lectura VINCERE — interpretación, no repetición del dato. 1-3 frases."),
  nivel: nivelSchema,
});

export const interpretResponseSchema = z.object({
  insights: z.array(insightSchema).min(1).max(4).describe("Entre 1 y 4 insights de lectura estratégica"),
});

export const askResponseSchema = z.object({
  respuesta: z.string().describe("Respuesta directa a la pregunta, en español, tono de dirección de carrera — máx ~90 palabras"),
  nivel: nivelSchema,
});

export const triageResponseSchema = z.object({
  veredicto: z.string().describe("Veredicto de una a dos frases con la razón concreta"),
  prioridad: z.enum(["Alta", "Media", "Baja"]).describe("Prioridad de atención del caso"),
  motorRecomendado: z.string().describe("Sección de VINCERE por la que debería empezar el análisis de este caso"),
  nivel: nivelSchema,
});

export const songAnalysisResponseSchema = z.object({
  tema: z
    .string()
    .describe("De qué habla la canción de verdad — el tema real y su subtexto, no la lectura obvia de la superficie. 1-2 frases."),
  arcoEmocional: z
    .string()
    .describe("Cómo lleva la emoción de la primera línea al final — la trayectoria, dónde sube y dónde cae. 1-2 frases."),
  gancho: z
    .string()
    .describe("Fuerza del gancho/hook y si engancha rápido en los primeros segundos; conéctalo con el skip rate cuando exista. Si hay medidas de audio, cita el segundo exacto en que entra. 1-2 frases."),
  sonido: z
    .string()
    .describe(
      "Cómo está construida sonoramente y qué hace eso por la canción: tempo, energía, dónde entra el gancho, textura del espectro, y cómo se cruza con la retención y el skip. Habla SOLO de lo medido — nunca nombres instrumentos, no se midieron. Si no llegaron medidas de audio, dilo en una frase: 'Sin audio medido para esta canción.'"
    ),
  audiencia: z
    .string()
    .describe("A qué audiencia le habla la letra y si cuadra con la que ya escucha al artista (usa la data de audiencia del contexto si está). 1-2 frases."),
  fitMarca: z
    .string()
    .describe(
      "Coherencia con la marca del artista. Si el contexto trae 'marcaDeclarada', júzgalo contra ESA marca — su posicionamiento, sus atributos y sobre todo lo que dice NO ser — y nómbralo. Si no la trae, dilo y juzga contra lo que el catálogo sugiere, con menos nivel de evidencia. 1-2 frases."
    ),
  potencial: z
    .string()
    .describe("Lectura del potencial comercial de la canción, justificada — no solo una etiqueta. 1-2 frases."),
  clasificacionPotencial: z
    .enum(["single", "album", "relleno", "incierto"])
    .describe("Clasificación corta del potencial: single (candidata a sencillo), album (buen tema de disco), relleno (descartable), incierto (falta data)"),
  reescrituras: z
    .array(z.string())
    .max(4)
    .describe("Qué reescribiría o afinaría — el verso flojo, el puente que sobra, el gancho tardío. Máx 4, concretas. Vacío si no aplica."),
  decision: z
    .string()
    .describe("Qué hacer con la canción (gestión de director): próximo single, empujar, sacar de rotación, buscar feature, retrabajar. 1-2 frases accionables."),
  nivel: nivelSchema,
});

const segmentoSchema = z.object({
  label: z.string().describe("Etiqueta del segmento tal como aparece en la fuente"),
  pct: z.number().describe("Porcentaje, número sin el signo"),
});

export const ingestResponseSchema = z.object({
  fuente: z
    .string()
    .describe("Qué es este material, reconocido por su apariencia. Ej. 'Captura de Spotify for Artists — Audiencia', 'Exportación CSV de canciones', 'Texto pegado con notas de campaña'"),
  lectura: z.string().describe("Una o dos frases sobre qué contiene el material y de qué periodo parece ser"),
  confianza: nivelSchema.describe("Qué tan legible y completo era el material en conjunto"),
  propuesta: z
    .object({
      resumen: z
        .object({
          streamsMes: z.number().nullable().describe("Streams mensuales, número entero sin separadores"),
          streamsCambioPct: z.number().nullable().describe("Variación porcentual de streams; negativa si cayó"),
          seguidores: z.number().nullable(),
          seguidoresCambioPct: z.number().nullable(),
          momentumIndex: z.number().nullable().describe("Solo si la fuente lo trae explícito; nunca lo calcules tú"),
          serie: z
            .array(z.object({ mes: z.string().describe("Mes abreviado, ej. 'Jul'"), valor: z.number().describe("Streams en MILES") }))
            .nullable()
            .describe("Serie histórica de streams si la gráfica o la tabla la muestra"),
        })
        .nullable()
        .describe("Métricas generales de carrera. null si el material no trae nada de esto"),
      diagnostico: z
        .object({
          faseActual: z.string().nullable(),
          fortalezaNucleo: z.string().nullable(),
          riesgoPrincipal: z.string().nullable(),
          prioridad: z.string().nullable(),
        })
        .nullable()
        .describe("Solo si el material es un texto de criterio (notas, informe de un tercero), no lo inventes desde números"),
      canciones: z
        .array(
          z.object({
            nombre: z.string(),
            streams: z.number(),
            retencionPct: z.number().describe("0 si la fuente no lo trae"),
            skipPct: z.number().describe("0 si la fuente no lo trae"),
            playlistAdds: z.number().describe("0 si la fuente no lo trae"),
          })
        )
        .nullable()
        .describe("Catálogo detectado, una entrada por canción"),
      audiencia: z
        .object({
          edad: z.array(segmentoSchema).nullable(),
          plataformas: z.array(segmentoSchema).nullable(),
          paises: z.array(segmentoSchema).nullable(),
        })
        .nullable(),
      zonasCalor: z
        .array(z.object({ ciudad: z.string(), calor: z.number().describe("Intensidad 0-100") }))
        .nullable()
        .describe("Ciudades con intensidad de escucha. Si la fuente da oyentes absolutos, normaliza a 0-100 tomando la ciudad mayor como 100"),
      kpis: z
        .array(
          z.object({
            label: z.string(),
            actual: z.number(),
            meta: z.number().describe("Si la fuente no declara meta, repite el valor actual"),
            unidad: z.string().describe("'M', '%' o cadena vacía"),
            nota: z.string().describe("Contexto corto; cadena vacía si no hay"),
          })
        )
        .nullable(),
    })
    .describe("Los datos extraídos, repartidos al motor al que pertenecen. Cada bloque va en null si el material no lo contiene"),
  alertas: z
    .array(
      z.object({
        texto: z.string().describe("Qué viste y por qué importa, en una o dos frases de director"),
        severidad: z
          .enum(["critica", "atencion", "oportunidad"])
          .describe("critica: amenaza el momentum o la caja. atencion: hay que mirarlo. oportunidad: algo que no se está aprovechando"),
        seccion: z
          .enum(["resumen", "diagnostico", "song", "audiencia", "calor", "management", "kpis"])
          .nullable()
          .describe("Motor al que pertenece la alerta"),
        nivel: nivelSchema,
      })
    )
    .max(5)
    .describe("Lo que salta a la vista en este material y merece atención. Vacío si no hay nada destacable — no inventes alarmas"),
  faltante: z
    .array(z.string())
    .max(5)
    .describe("Qué no se pudo leer o quedó ambiguo, para que Eduardo lo complete a mano"),
});

// Estructura la investigación web ya hecha. El campo que sostiene todo el
// motor es 'fuentes': un hallazgo que no puede señalar de dónde salió no
// tiene derecho a un nivel de evidencia alto.
export const researchResponseSchema = z.object({
  titulo: z
    .string()
    .describe("Título corto y concreto de lo investigado. Ej. 'Feid: alcance real en Chile y solape de audiencia'"),
  resumen: z
    .string()
    .describe(
      "Un párrafo (4-7 frases) con la síntesis: qué se buscó, qué se encontró de verdad y qué tan sólido es. Si la web dio poco, dilo aquí sin rodeos."
    ),
  hallazgos: z
    .array(
      z.object({
        texto: z.string().describe("El hallazgo concreto tal como lo sostiene la fuente — hecho, no opinión"),
        implicacion: z
          .string()
          .describe("Qué significa esto para ESTE artista en su fase actual. Aquí está el valor: el hecho solo no sirve"),
        nivel: nivelSchema,
        fuentes: z
          .array(z.number().int())
          .describe(
            "Números de las fuentes de la lista entregada que respaldan este hallazgo (empiezan en 1). Array vacío si es inferencia tuya y no un hecho leído — en ese caso el nivel no puede pasar de 2"
          ),
      })
    )
    .max(8)
    .describe("Hallazgos ordenados por relevancia para la carrera, no por orden de búsqueda"),
  senalesPlaza: z
    .array(
      z.object({
        ciudad: z.string().describe("Ciudad tal como se nombra habitualmente, sin país salvo que haga falta desambiguar"),
        senal: z.string().describe("Qué se encontró de esa plaza y por qué importa para este artista"),
        calorSugerido: z
          .number()
          .describe("Intensidad 0-100 propuesta para Zonas de Calor, justificada por lo encontrado — no un número al azar"),
        nivel: nivelSchema,
      })
    )
    .max(8)
    .describe(
      "Ciudades o plazas que aparecieron en la investigación y merecen entrar al mapa de calor. Vacío si la búsqueda no fue geográfica — no inventes ciudades para llenar"
    ),
  implicacionesCatalogo: z
    .array(z.string())
    .max(5)
    .describe("Qué le dice lo encontrado al catálogo propio: qué tema se parece, qué hueco quedó libre, qué se está repitiendo en el mercado"),
  preguntasAbiertas: z
    .array(z.string())
    .max(5)
    .describe("Lo que la búsqueda NO respondió y sigue haciendo falta. Es información honesta, no un fallo"),
  alertas: z
    .array(
      z.object({
        texto: z.string().describe("Qué encontraste afuera que exige atención adentro, en una o dos frases de director"),
        severidad: z.enum(["critica", "atencion", "oportunidad"]),
        seccion: z
          .enum(["resumen", "diagnostico", "song", "audiencia", "calor", "management", "kpis"])
          .nullable()
          .describe("Motor del sistema al que pertenece la alerta"),
        nivel: nivelSchema,
      })
    )
    .max(4)
    .describe("Solo si lo encontrado cambia algo de lo que el sistema ya sabe. Vacío si no — inventar alarmas destruye la confianza"),
  nivelGlobal: nivelSchema.describe(
    "Nivel de evidencia del conjunto, según cuántas fuentes reales hubo y qué tan directas eran. Sin fuentes útiles el máximo es 2"
  ),
});

export const informeResponseSchema = z.object({
  titulo: z
    .string()
    .describe("Título del informe: descriptivo y concreto sobre la situación real del artista, no genérico. Ej. 'Consolidación de SETTE: catálogo concentrado y presupuesto adelantado'"),
  sinopsis: z
    .string()
    .describe("Sinopsis Central: un solo párrafo denso (5-8 frases) que cuenta dónde está la carrera hoy, de qué depende, dónde está la fragilidad y qué se está apostando. Es el corazón del informe — un director debe entender toda la situación leyendo solo esto."),
  bloques: z
    .array(
      z.object({
        titulo: z.string().describe("Título del bloque temático — nombra la tensión o el asunto real, no la sección de origen"),
        parrafos: z.array(z.string()).min(1).max(3).describe("1-3 párrafos que desarrollan el bloque cruzando data de varios motores"),
        nivel: nivelSchema,
      })
    )
    .min(2)
    .max(5)
    .describe("Bloques temáticos que CRUZAN secciones (nunca uno por panel): la tensión entre catálogo y audiencia, entre ritmo de gasto y meta, entre plaza fuerte y expansión, etc."),
  riesgos: z
    .array(
      z.object({
        riesgo: z.string().describe("El riesgo nombrado directo, sin suavizar"),
        consecuencia: z.string().describe("Qué pasa concretamente si se materializa"),
        nivel: nivelSchema,
      })
    )
    .max(4)
    .describe("Riesgos reales derivados de la data, ordenados del más grave al menos. Vacío solo si de verdad no hay ninguno sostenible con la data."),
  oportunidades: z
    .array(
      z.object({
        oportunidad: z.string().describe("La oportunidad concreta, accionable"),
        porQue: z.string().describe("Qué dato la respalda"),
        nivel: nivelSchema,
      })
    )
    .max(4)
    .describe("Oportunidades que hoy no se están aprovechando, respaldadas por la data"),
  proximosPasos: z
    .array(
      z.object({
        accion: z.string().describe("Acción concreta y ejecutable, no una intención vaga"),
        responsable: z.string().describe("Quién la ejecuta — Eduardo (dirección), el artista, el equipo, un tercero nombrado en la data"),
        plazo: z.string().describe("Plazo concreto: 'esta semana', 'antes del cierre de trimestre', 'próximos 30 días'"),
        prioridad: z.enum(["Alta", "Media", "Baja"]),
      })
    )
    .min(2)
    .max(7)
    .describe("Próximos pasos con responsable y plazo — lo que se mueve al salir de esta lectura"),
  veredicto: z
    .string()
    .describe("La postura del director: qué se hace con este proyecto ahora y por qué. Clara y argumentada, nunca un 'depende' neutral. 2-4 frases."),
  nivelGlobal: nivelSchema.describe("Nivel de evidencia global del informe, según qué tan completa es la data disponible"),
});

export const stressTestResponseSchema = z.object({
  titulo: z.string().describe("Nombre corto del plan evaluado, sacado del propio material"),
  fuente: z.string().describe("De quién viene el plan según el material: un manager, un sello, un promotor, un socio. 'No identificado' si no se dice"),
  resumenPlan: z.string().describe("Qué propone el plan, en dos o tres frases. Sin juicio todavía — primero hay que entenderlo bien"),
  supuestos: z
    .array(z.string())
    .max(5)
    .describe("Lo que el plan da por hecho SIN decirlo y de lo que depende que funcione. Es la parte más valiosa del análisis: los planes se caen por sus supuestos ocultos, no por lo que declaran"),
  variables: z
    .array(
      z.object({
        variable: z.string().describe("La variable concreta del plan"),
        lectura: z.string().describe("Por qué esta variable juega a favor o en contra, contra la realidad de ESTE artista"),
        tipo: z
          .enum(["ganadora", "perdedora", "incierta"])
          .describe("ganadora: empuja el plan. perdedora: lo compromete. incierta: no hay data para saberlo"),
        impacto: z.enum(["alto", "medio", "bajo"]).describe("Cuánto mueve el resultado final"),
        nivel: nivelSchema,
      })
    )
    .min(3)
    .max(8)
    .describe("Las variables que deciden si este plan funciona. Ordénalas por impacto, de mayor a menor"),
  escenarios: z
    .array(
      z.object({
        nombre: z.enum(["Pierde", "Break-even", "Probable", "Gana", "Expansión"]),
        queOcurre: z.string().describe("Qué pasa en este escenario, concreto"),
        quePasaSiSeDa: z.string().describe("Impacto real en la carrera del artista si se materializa"),
        probabilidad: z.string().describe("Qué tan plausible es y por qué, según la data del artista — no un porcentaje inventado"),
        nivel: nivelSchema,
      })
    )
    .length(5)
    .describe("Los cinco escenarios, siempre en este orden: Pierde, Break-even, Probable, Gana, Expansión"),
  puntoDeQuiebre: z
    .string()
    .describe("Qué tiene que fallar para que el plan entero se caiga. Una sola cosa, la más frágil de todas"),
  condiciones: z
    .array(z.string())
    .max(5)
    .describe("Qué habría que exigir, negociar o dejar por escrito ANTES de aceptar. Concretas y negociables, no deseos"),
  veredicto: z
    .string()
    .describe("La postura del director: aceptar, aceptar condicionado, renegociar, pilotear o rechazar — y por qué. Clara y argumentada, nunca un 'depende'"),
  nivelGlobal: nivelSchema.describe("Qué tan completo estaba el plan y cuánta data del artista respalda esta evaluación"),
});

export const marcaResponseSchema = z.object({
  coherencia: z
    .string()
    .describe("Si la marca declarada se sostiene contra la data real del artista. Directo: se sostiene, se sostiene a medias, o no se sostiene — y por qué. 2-4 frases"),
  puntuacionCoherencia: z
    .number()
    .min(0)
    .max(100)
    .describe("0-100: qué tanto coincide lo declarado con lo que la data muestra. No lo infles por cortesía — una marca declarada sin data que la respalde no pasa de 40"),
  brechas: z
    .array(
      z.object({
        declarado: z.string().describe("Lo que la marca dice ser en este punto concreto"),
        recibido: z.string().describe("Lo que la data sugiere que la gente realmente recibe. Cita el dato: la canción que más retiene, el país que más escucha, el canal que dice otra cosa"),
        lectura: z.string().describe("Por qué se abre la brecha y qué le cuesta al artista. Aquí está el valor del motor"),
        nivel: nivelSchema,
      })
    )
    .max(5)
    .describe("Las grietas entre lo declarado y lo recibido, de la más costosa a la menos. Si no hay data suficiente para sostener una brecha, no la inventes: mejor devolver dos con evidencia que cinco especulativas"),
  diferenciacion: z
    .string()
    .describe("Si el posicionamiento distingue de verdad o es genérico. Sé duro: la mayoría de los posicionamientos de artista emergente son frases que le sirven a cualquiera. Di si esta lo es"),
  senalesDeMarca: z
    .array(z.string())
    .max(5)
    .describe("Qué dice la data propia sobre la marca que el artista tiene HOY, se declare o no. Lo que el catálogo, la audiencia y las zonas revelan por sí solos"),
  riesgos: z.array(z.string()).max(4).describe("Riesgos de marca concretos que se ven venir con esta data"),
  movimientos: z
    .array(z.string())
    .max(5)
    .describe("Qué hacer, concreto y ejecutable ('reordenar los temas populares de Spotify para que abra Otra Vida'), nunca un deseo ('ser más coherente')"),
  veredicto: z
    .string()
    .describe("La postura del director sobre la marca: sostenerla, afilarla, corregirla o replantearla — y por qué. Clara, nunca un 'depende'"),
  nivelGlobal: nivelSchema.describe("Qué tan respaldada está esta lectura. Sin marca declarada o sin data del catálogo, no puede ser alto"),
});

export const touringResponseSchema = z.object({
  lecturaGeneral: z
    .string()
    .describe("Si este artista está para salir a tocar hoy o todavía no, y por qué. Directo. 2-4 frases"),
  listoParaGira: z
    .boolean()
    .describe("true solo si la data sostiene una serie de fechas. Un artista con streams pero sin ningún show con buena conversión NO está listo: eso es false y se explica arriba"),
  plazas: z
    .array(
      z.object({
        ciudad: z.string().describe("Ciudad evaluada. Solo ciudades presentes en el contexto — zonas de calor, shows previos o señales de investigación"),
        veredicto: z
          .enum(["ir", "probar", "esperar", "no"])
          .describe("ir: hay evidencia para agendar. probar: solo en sala chica y sin riesgo. esperar: la plaza aún no está. no: hoy sería un error"),
        tamanoSala: z
          .string()
          .describe("Aforo que la convocatoria real aguanta hoy, con su razón. Concreto ('150-250, la mitad de lo que sugiere el calor'), no 'sala mediana'"),
        lectura: z.string().describe("Por qué este veredicto, citando el dato: el calor, la asistencia del show anterior, la señal de investigación"),
        senalDeConversion: z
          .string()
          .describe("La distancia entre lo que la plaza escucha y lo que se puede esperar que asista. Si hubo show previo, usa la asistencia real contra el aforo. Si no lo hubo, dilo y baja el nivel — sin show, la conversión es estimación, no dato"),
        nivel: nivelSchema,
      })
    )
    .max(8)
    .describe("Las plazas evaluadas, de la más lista a la menos. No inventes ciudades que no estén en el contexto"),
  ruta: z
    .array(
      z.object({
        orden: z.number().int().min(1),
        ciudad: z.string(),
        porQueVaAqui: z.string().describe("Por qué esta ciudad ocupa este lugar: arrancar donde hay certeza, cerrar donde hay riesgo, aprovechar cercanía o un momento concreto"),
      })
    )
    .max(6)
    .describe("Orden sugerido de fechas. Vacío si el artista todavía no está para una ruta — no la inventes por completar"),
  trampas: z
    .array(z.string())
    .max(4)
    .describe("Plazas que la data hace ver bien y no lo están: mucho streaming y poca conversión esperable, escucha pasiva, o un solo show malo que se está leyendo como plaza muerta cuando fue la sala equivocada. Es la parte más valiosa — evita el show con sala vacía en la ciudad de más streams"),
  queFaltaSaber: z
    .array(z.string())
    .max(5)
    .describe("Qué averiguar antes de reservar: si hay escena local, quién programa, si el público de esa plaza paga entrada, qué sala corresponde al aforo real"),
  veredicto: z
    .string()
    .describe("La postura del director: salir ahora, salir con estas dos fechas y nada más, o esperar y qué tiene que pasar antes. Clara, nunca un 'depende'"),
  nivelGlobal: nivelSchema.describe("Sin shows previos registrados esto no puede pasar de 2: sin conversión medida, todo es estimación desde streaming"),
});

export const arResponseSchema = z.object({
  lecturaGeneral: z
    .string()
    .describe("Qué necesita hoy este artista de una colaboración, y si los candidatos que tiene sobre la mesa responden a eso. 2-4 frases"),
  candidatos: z
    .array(
      z.object({
        nombre: z.string().describe("Nombre exacto del candidato, tal como viene en el contexto. No inventes candidatos"),
        veredicto: z
          .enum(["perseguir", "explorar", "esperar", "descartar"])
          .describe("perseguir: vale la pena ir tras esto ya. explorar: hay algo pero falta averiguar. esperar: buena idea en otra fase. descartar: hoy resta más de lo que suma"),
        fitMarca: z
          .string()
          .describe("Coherencia con la marca declarada, y sobre todo con su antipatrón — lo que el artista dijo que NO es. Si la colaboración lo contradice, dilo aunque el candidato sea grande: ahí es donde el tamaño hace tomar malas decisiones"),
        solapamiento: z
          .string()
          .describe("Si la audiencia del candidato ya es la del artista o le abre una nueva. Es la trampa más común del feature: colaborar con alguien que comparte tu mismo público no trae gente nueva, se paga por llegar a quien ya escucha. Usa la data de audiencia y zonas si está"),
        asimetria: z
          .string()
          .describe("Quién gana más según la diferencia de tamaño. Muy por encima: el artista queda de invitado en su propia canción y el tráfico vuelve al grande. Muy por debajo: le está haciendo un favor sin retorno. El punto dulce es cerca o un escalón arriba"),
        queGana: z.string().describe("Qué gana concretamente el artista si esto sale bien"),
        queArriesga: z.string().describe("Qué pone en juego: marca, tiempo, dinero, posición frente a su audiencia"),
        nivel: nivelSchema,
      })
    )
    .max(8)
    .describe("Un objeto por candidato del contexto, del más recomendable al menos. Solo candidatos que estén en el contexto"),
  primeroPerseguir: z
    .string()
    .describe("A quién ir primero y por qué. Uno solo — elegir es el trabajo. Si ninguno vale la pena hoy, dilo con esas palabras"),
  senalesDeAlerta: z
    .array(z.string())
    .max(4)
    .describe("Colaboraciones que se ven bien y no lo son: el nombre grande que rompe la marca, el amigo del circuito que comparte el mismo público, el productor de moda que no encaja con lo que a este artista le funciona"),
  perfilQueFalta: z
    .string()
    .describe("Qué tipo de colaborador le falta a este artista hoy, mire o no la lista actual. Descríbelo por lo que aportaría —audiencia de otra plaza, voz que contraste, producción que refuerce lo que ya retiene— no con nombres inventados"),
  queFaltaSaber: z
    .array(z.string())
    .max(5)
    .describe("Qué averiguar antes de mover: tamaño real y solapamiento de audiencia del candidato, si está disponible, qué pide, cómo quedan los splits"),
  veredicto: z
    .string()
    .describe("La postura del director sobre la estrategia de colaboraciones de este artista ahora. Clara, nunca un 'depende'"),
  nivelGlobal: nivelSchema.describe("Sin marca declarada o sin investigación de los candidatos esto no puede ser alto: el solapamiento de audiencia sería suposición"),
});

export const oportunidadResponseSchema = z.object({
  puntaje: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Múltiplo de 10 entre 0 y 100. 0 = no tiene sentido entrar. 50 = probable, la decisión está pareja. 100 = habría que estar adentro ya. Solo múltiplos de 10: un 63 finge una precisión que no existe cuando media evaluación es criterio, y un número redondo se puede discutir"),
  porQueEsePuntaje: z
    .string()
    .describe("Qué sostiene ese número exactamente. Tiene que quedar claro qué tendría que cambiar para que suba o baje diez puntos. 2-4 frases"),
  loQueLoSube: z.array(z.string()).max(5).describe("Lo concreto que juega a favor de entrar, con el dato que lo respalda"),
  loQueLoBaja: z
    .array(z.string())
    .max(5)
    .describe("Lo concreto que juega en contra. Nunca dejes esta lista vacía: si no encuentras nada en contra, no miraste lo suficiente"),
  vias: z
    .array(
      z.object({
        modalidad: z.enum([
          "management",
          "management-360",
          "por-proyecto",
          "servicios",
          "sociedad",
          "distribucion",
          "solo-asesoria",
        ]),
        comoFunciona: z.string().describe("Cómo se articula esta vía en la práctica para ESTE caso"),
        participacion: z
          .string()
          .describe("La participación o estructura económica, en RANGO y con su razón ('15-20% de ingresos netos por management, en el rango bajo porque el catálogo todavía no genera'). Nunca inventes una cifra de mercado como si fuera un hecho verificado: si no la sabes, describe la lógica y manda el número a queFaltaSaber"),
        queAportamos: z.string().describe("Qué pone nuestro lado concretamente: trabajo, red, capital, estructura"),
        queEsperamosRecuperar: z
          .string()
          .describe("El retorno esperado en términos concretos y con plazo: de dónde saldría, en cuánto tiempo, y qué tendría que pasar para que se dé"),
        compromisosNuestros: z.array(z.string()).max(4).describe("A qué nos obligamos, medible"),
        compromisosDelArtista: z.array(z.string()).max(4).describe("A qué se obliga el artista, medible. Un trato donde solo una parte se compromete no es un trato"),
        clausulaDeRevision: z
          .string()
          .describe("Cuándo y contra qué se revisa o se sale. Obligatorio: los acuerdos sin puerta de salida son cómo se termina atado años a un proyecto que dejó de moverse"),
        riesgo: z.string().describe("El riesgo principal de ESTA vía en particular"),
        nivel: nivelSchema,
      })
    )
    .min(2)
    .max(4)
    .describe("Formas concretas de entrar, de la más recomendable a la menos. Al menos dos, para que haya algo que comparar"),
  viaRecomendada: z
    .string()
    .describe("Cuál de las vías y por qué. Una sola — elegir es el trabajo. Si el veredicto es no entrar, dilo aquí también"),
  escenarios: z
    .array(
      z.object({
        nombre: z.string().describe("Nombre corto del escenario"),
        queOcurre: z.string(),
        queSignificaParaNosotros: z.string().describe("Qué pasa de nuestro lado si esto se da: económicamente y en tiempo"),
        probabilidad: z.string().describe("Qué tan plausible y por qué, según la data — no un porcentaje inventado"),
        nivel: nivelSchema,
      })
    )
    .min(3)
    .max(5)
    .describe("Escenarios estratégicos, incluyendo siempre al menos uno donde esto sale mal"),
  serviciosQueOfrecemos: z
    .array(z.string())
    .max(6)
    .describe("Qué se le puede ofrecer a ESTE artista según lo que su data muestra que necesita — no un catálogo genérico de servicios"),
  porQueNosotros: z
    .string()
    .describe("Qué nos hace los indicados para este artista en particular. El artista también nos elige: sin esto el análisis mira una sola cara de la mesa"),
  costoDeOportunidad: z
    .string()
    .describe("Qué dejamos de hacer si tomamos esto. Para un equipo chico el cuello de botella es el tiempo, no las ganas: un caso de 70 que consume seis meses puede ser peor que dos de 50 que no"),
  senalesDeAlerta: z.array(z.string()).max(4).describe("Lo que haría replantear todo: banderas rojas del artista, de su entorno o del trato"),
  queFaltaSaber: z
    .array(z.string())
    .max(6)
    .describe("Qué averiguar antes de comprometerse, incluidas las cifras de mercado que no se pudieron afirmar con certeza"),
  veredicto: z.string().describe("La postura: entrar, entrar condicionado, esperar o pasar — y por qué. Clara, nunca un 'depende'"),
  nivelGlobal: nivelSchema.describe("Con poca data del artista esto no puede ser alto, por convincente que suene la lectura"),
});

export type OportunidadResponse = z.infer<typeof oportunidadResponseSchema>;
export type ARResponse = z.infer<typeof arResponseSchema>;
export type TouringResponse = z.infer<typeof touringResponseSchema>;
export type MarcaResponse = z.infer<typeof marcaResponseSchema>;
export type ResearchResponse = z.infer<typeof researchResponseSchema>;
export type InterpretResponse = z.infer<typeof interpretResponseSchema>;
export type InformeResponse = z.infer<typeof informeResponseSchema>;
export type IngestResponse = z.infer<typeof ingestResponseSchema>;
export type StressTestResponse = z.infer<typeof stressTestResponseSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
export type TriageResponse = z.infer<typeof triageResponseSchema>;
export type SongAnalysisResponse = z.infer<typeof songAnalysisResponseSchema>;

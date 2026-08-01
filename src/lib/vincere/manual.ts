// Documentación de VINCERE — fuente única de la sección "Documentación".
// Vive dentro de la plataforma en vez de en archivos del repositorio, para
// estar donde Eduardo trabaja (también en el celular). El README apunta aquí.
//
// Son dos documentos con propósitos distintos:
//   · Guía del Usuario  — cómo se trabaja: primeros pasos, el ciclo, tareas.
//   · Manual del Sistema — qué es y cómo funciona por dentro: motores, capa
//     de IA, niveles de evidencia, dónde vive la información, alcance.

export interface ManualPaso {
  numero: number;
  titulo: string;
  descripcion: string;
  detalle: string[];
}

export interface ManualMotor {
  motor: string;
  cuandoUsarlo: string;
  queCargar: string;
}

export interface ManualPunto {
  termino: string;
  texto: string;
}

export interface ManualBloque {
  titulo: string;
  parrafos?: string[];
  puntos?: ManualPunto[];
}

export interface ManualTarea {
  tarea: string;
  pasos: string[];
}

// ---------------------------------------------------------------------------
// GUÍA DEL USUARIO
// ---------------------------------------------------------------------------

export const GUIA_INTRO =
  "VINCERE no es un tablero que se mira: es donde se dirige. La data la cargas tú; el valor está en la capa que la interpreta con tu método y en el informe que emite al final. Esta guía es el ritmo de trabajo, no una lista de botones.";

export const GUIA_PRIMEROS_PASOS: ManualBloque = {
  titulo: "Primeros pasos",
  parrafos: [
    "Los primeros quince minutos, en orden. La plataforma abre con SETTE y LUNA REBEL cargados con cifras de muestra para que veas todo funcionando — no son datos reales.",
  ],
  puntos: [
    {
      termino: "1. Crea tu proyecto",
      texto: "Botón «+ Proyecto» arriba. Nombre del artista, género y fase de carrera. Elige «Proyecto propio» si lo diriges tú.",
    },
    {
      termino: "2. Si no tienes data todavía, investiga",
      texto: "El motor de Investigación no necesita que cargues nada: escribes el nombre del artista y sale a buscar a la web. Es la forma de arrancar un proyecto en frío.",
    },
    {
      termino: "3. Carga un motor, no diez",
      texto: "Empieza por Resumen · Momentum con los números que ya tengas a mano. Un motor con data real vale más que ocho vacíos.",
    },
    {
      termino: "4. Genera tu primera lectura",
      texto: "En esa misma sección, «Generar lectura VINCERE». Ahí ves si la interpretación suena a tu criterio o hay que presionarla.",
    },
    {
      termino: "5. Presiónala con una pregunta",
      texto: "Usa la zona de preguntas de la sección. Si la respuesta no te convence, eso también es información — dímelo y ajustamos el método.",
    },
    {
      termino: "6. Cuando tengas 3 o 4 motores, emite el informe",
      texto: "Ahí es donde la plataforma muestra lo que ninguna otra hace: cruzar todo y tomar postura.",
    },
  ],
};

export const GUIA_CICLO: ManualPaso[] = [
  {
    numero: 1,
    titulo: "Cargar la data del proyecto",
    descripcion: "La vía rápida es Ingesta: sueltas el material y la IA lo reparte. A mano solo lo que falte.",
    detalle: [
      "En «Cargar data» sueltas una captura (Spotify for Artists, Instagram, YouTube Studio), un PDF, o pegas un CSV o un texto. La IA lo lee, extrae los números y los reparte al motor que les corresponde.",
      "Antes de escribir nada te muestra qué entendió, motor por motor. Desmarcas lo que leyó mal y aplicas solo lo bueno — nada entra sin tu aprobación.",
      "Lo que no pudo leer queda anotado para que lo completes a mano en su sección.",
      "Cada sección sigue siendo editable directamente: «Editar data» para ajustar un número suelto sin volver a cargar nada.",
      "En Song Intelligence, además de las métricas, pega la letra de cada canción — es lo que permite leerla como obra y no como fila de números.",
      "Lo que no tengas y no puedas conseguir, búscalo: «Investigación» sale a la web y trae el contexto de mercado con sus fuentes. No llena los paneles, pero alimenta todas las lecturas.",
    ],
  },
  {
    numero: 2,
    titulo: "Generar la lectura VINCERE de cada sección",
    descripcion: "El botón que convierte data en criterio. Es el corazón de la plataforma.",
    detalle: [
      "En cada sección: «Generar lectura VINCERE». Devuelve qué significa, por qué pasa, qué riesgo crece y qué decisión conviene — con nivel de evidencia en cada afirmación.",
      "Si cambias la data, vuelve a generarla. La lectura no se actualiza sola.",
      "En canciones, «Analizar canción con VINCERE» hace la lectura profunda de la letra cruzada con sus métricas.",
    ],
  },
  {
    numero: 3,
    titulo: "Preguntar lo que la lectura no resolvió",
    descripcion: "Cada sección tiene su zona de preguntas abiertas, con la data cargada como contexto.",
    detalle: [
      "Pregunta como le preguntarías a un socio: «¿por qué cayó esto?», «¿lanzo en octubre o diciembre?».",
      "Las preguntas y respuestas quedan guardadas en la sección y el informe final las integra después.",
    ],
  },
  {
    numero: 4,
    titulo: "Emitir el Informe Final y trabajarlo",
    descripcion: "La IA entrega el borrador; el documento se termina aquí, con tu criterio encima.",
    detalle: [
      "Cruza todos los motores entre sí — no repite los paneles. Sale con sinopsis, veredicto, riesgos, oportunidades y próximos pasos con responsable y plazo.",
      "Se alimenta de lo que ya trabajaste: mientras más lecturas y preguntas tengas hechas, más sólido sale. En frío sale correcto pero flaco, y él mismo baja su nivel de evidencia.",
      "«Editar informe» abre el documento: corriges cualquier texto, añades o quitas bloques, riesgos, oportunidades y pasos, y ajustas los niveles de evidencia. Se guarda solo.",
      "Los próximos pasos se marcan como cumplidos desde el propio informe — es tu bitácora de ejecución, no una foto fija.",
      "Cuando esté como lo quieres: se descarga (para Word o Notion) o se imprime a PDF con formato de documento.",
      "«Volver a emitir» genera un borrador nuevo y archiva el anterior con todo lo que hubieras editado — queda en «Informes anteriores» y se puede recuperar.",
      "Del segundo informe en adelante la IA compara contra el anterior: qué recomendó, qué pasos cumpliste y si los resultados le dan la razón.",
    ],
  },
  {
    numero: 5,
    titulo: "Archivar",
    descripcion: "Lo trabajado queda como histórico, sin transcribir nada a mano.",
    detalle: [
      "«Archivar en Notion» desde el informe guarda el documento completo.",
      "La plataforma es donde se trabaja; Notion es el registro histórico.",
    ],
  },
];

export const GUIA_TAREAS: ManualTarea[] = [
  {
    tarea: "Cargar data desde una captura o un archivo",
    pasos: [
      "Cargar data → suelta la imagen o el PDF en la zona, o pega el texto abajo.",
      "Opcional: escribe una nota que oriente la lectura («esto es del último trimestre»).",
      "«Leer y extraer». La IA devuelve qué entendió, repartido por motor.",
      "Revisa cada bloque y desmarca el que no sirva. Lo que no pudo leer aparece listado aparte.",
      "«Aplicar». La data entra a sus secciones, las alertas quedan guardadas y se archiva una foto de los indicadores para el histórico.",
    ],
  },
  {
    tarea: "Crear un proyecto nuevo",
    pasos: [
      "Botón «+ Proyecto» en la barra superior.",
      "Escribe nombre y género, elige la fase de carrera.",
      "Tipo «Proyecto propio» si lo diriges; «Referencia de mercado» si es competencia para comparar.",
      "Crear proyecto. Queda seleccionado y listo para cargarle data.",
    ],
  },
  {
    tarea: "Declarar la marca y ver si la data la respalda",
    pasos: [
      "Marca → «Editar marca». Escribe el posicionamiento, la promesa, los atributos y el territorio.",
      "Llena «Lo que NO es». Es el campo que casi nadie completa y el que más filo da: una marca que no excluye nada no distingue nada.",
      "Añade los puntos de contacto —Spotify, Instagram, vivo— y marca en cada uno si está alineado, tibio o desalineado.",
      "«Analizar marca». El sistema la contrasta contra el catálogo, la audiencia y las zonas, y devuelve dónde se abre la brecha entre lo que declaras y lo que la gente recibe.",
      "Hazlo antes de analizar canciones: con la marca declarada, el análisis de cada tema juzga su coherencia contra algo concreto en vez de adivinarla.",
    ],
  },
  {
    tarea: "Cargar una canción con su letra y su audio",
    pasos: [
      "Song Intelligence → «+ Agregar canción». Nombre y métricas (streams, retención, skip, playlist adds).",
      "Haz clic en la canción de la lista para abrir su panel.",
      "Pega la letra. Al salir del campo se calcula sola la métrica: sílabas por verso, esquema de rima y densidad léxica.",
      "Suelta el MP3 o WAV en la zona de Audio. Se analiza en tu navegador — el archivo no se sube a ningún servidor — y devuelve BPM, tonalidad, secciones y el segundo en que entra el gancho.",
      "Si tienes un análisis externo (Cyanite, Music.ai) o notas del productor, pégalas en «Análisis externo y notas de producción». Ahí van los instrumentos, el mood y los artistas similares — lo que la medición propia no alcanza.",
      "«Analizar canción con VINCERE». La lectura cruza cuatro cosas: la letra, el sonido medido, la observación externa y los números de plataforma.",
    ],
  },
  {
    tarea: "Usar los artistas similares que detectó un servicio externo",
    pasos: [
      "Pega el análisis externo en la canción, con la lista de similares incluida.",
      "Pulsa «Investigar los artistas similares →». Salta a Investigación con la consulta ya escrita.",
      "Revísala y ajústala si quieres — no se lanza sola.",
      "«Investigar». El sistema sale a la web a averiguar quiénes son, en qué fase están y qué plazas pisan.",
      "Si aparecen ciudades, llévalas a Zonas de Calor y luego pasa a Shows y Touring: ahí el mapa se convierte en una decisión de dónde tocar. Ese es el recorrido completo, de cómo suena la canción a qué fecha firmar.",
    ],
  },
  {
    tarea: "Entender qué le funcionó al artista en el pasado",
    pasos: [
      "Carga varias canciones viejas con sus métricas reales y el audio de cada una.",
      "Analiza cada una por separado para tener su lectura individual.",
      "Vuelve arriba y pulsa «Generar lectura VINCERE» del catálogo completo.",
      "Ahí es donde aparece el patrón: qué tempo, qué energía y qué momento de gancho comparten las que retuvieron, frente a las que se saltaron.",
      "Esa lectura es el material para decidir cómo se produce lo próximo, no solo cuál se empuja.",
    ],
  },
  {
    tarea: "Presentar el artista a un DSP o a una disquera",
    pasos: [
      "Pitch y Presentación → elige el destino. Son tres documentos distintos: un editor de DSP lee cientos por semana y descarta el largo; una disquera espera una tesis de negocio; una marca compra audiencia, no artista.",
      "Escribe qué quieres conseguir, concreto. «Una oportunidad» no es un pedido y produce un pitch igual de vago.",
      "«Generar pitch». Sale texto final, listo para mandar — no un borrador con huecos para completar.",
      "Si es DSP, el bloque «Para pegar en Spotify for Artists» trae el texto con su contador de 500 caracteres y un botón de copiar.",
      "Si es sello o marca, revisa «Puentes que ya tienes»: cruza el destinatario con tus Personas del C.C.O. y te dice a quién conoces adentro.",
      "No borres el bloque de riesgo antes de mandarlo. Es lo que hace que te crean el resto: todos llegan con números buenos, y quien nombra su punto débil es el único que no suena a vendedor.",
    ],
  },
  {
    tarea: "Decidir si sumarte a un artista",
    pasos: [
      "Carga lo que tengas del artista en los motores que apliquen. El puntaje se sostiene en data: con un proyecto vacío, el motor lo dice y no infla la confianza.",
      "Oportunidad de Negocio → «Evaluar oportunidad». Si tienes contexto que el sistema no sabe («me lo presentó su manager», «este trimestre estoy corto de tiempo»), escríbelo en la nota.",
      "Lee el puntaje con su escala: bajo 40 es rojo, de 40 a 69 amarillo, de 70 arriba verde. El número va de diez en diez a propósito — un 63 fingiría una precisión que no existe.",
      "Lo importante no es el número sino «lo que lo baja». Si esa lista viene corta, desconfía: todo caso tiene contras.",
      "Compara las vías de entrada. Cada una trae qué se pide, qué se da, qué se espera recuperar y —obligatorio— cómo se revisa o se sale.",
      "Antes de decidir, lee «Costo de oportunidad». Un caso de 70 que te consume seis meses puede ser peor que dos de 50 que no.",
    ],
  },
  {
    tarea: "Decidir si un feature conviene",
    pasos: [
      "Declara la marca primero, con su antipatrón. Sin eso el motor no puede señalar el nombre grande que rompe la identidad, que es justo para lo que sirve.",
      "A&R y Colaboraciones → «+ Añadir candidato». Nombre, tipo, qué se supone que aporta y quién lo propuso.",
      "Pulsa «Investigar a [nombre] →» en cada candidato. Sin investigación, el solapamiento de audiencia es suposición y el motor lo dirá con nivel bajo.",
      "«Evaluar candidatos». Devuelve, por cada uno, fit de marca, si su audiencia ya es la tuya, y quién gana según la diferencia de tamaño.",
      "Lee «A quién ir primero»: el motor elige uno solo a propósito. Una lista de tres no es una decisión.",
    ],
  },
  {
    tarea: "Decidir dónde tocar",
    pasos: [
      "Shows y Touring → «+ Registrar show» por cada fecha que ya hiciste: ciudad, sala, aforo y cuánta gente fue.",
      "Escribe la nota de cada noche. «Agotado con dos semanas de anticipación» y «mucha reventa sin vender» son dos historias distintas, y el sistema las lee.",
      "«Evaluar plazas». Cruza el mapa de calor, la conversión real de esos shows y lo que se haya investigado de cada ciudad.",
      "Lee primero las plazas trampa: son las ciudades que la data hace ver bien y no lo están. Ahí es donde se pierde dinero.",
      "El tamaño de sala sugerido importa tanto como la ciudad. Media sala llena se ve peor que una sala chica agotada, y el agotado construye la próxima fecha.",
    ],
  },
  {
    tarea: "Investigar algo que no está en tu data",
    pasos: [
      "Investigación → elige el tipo: Artista, Canción, Plaza / mercado o Pregunta abierta.",
      "Escribe qué quieres saber, concreto. «Feid» funciona mejor que «reggaetón colombiano».",
      "«Investigar». El sistema hace varias búsquedas en la web y lee las páginas: tarda más que una lectura de sección.",
      "Cada hallazgo llega con su implicación para tu artista y con la fuente enlazada — se puede abrir y verificar. Lo que dice «sin fuente · criterio» es lectura del motor, no evidencia.",
      "Si aparecieron ciudades, «Llevar a Zonas de Calor» las traslada al mapa. No entran solas: la decides tú.",
      "A partir de ahí, todas las lecturas del proyecto tienen esa investigación como contexto de mercado.",
    ],
  },
  {
    tarea: "Cargar un panel de industria (Chartmetric y similares)",
    pasos: [
      "Toma la captura o descarga el resumen en PDF desde el panel.",
      "Cargar data → suéltalo ahí. El lector reconoce material de Chartmetric, Songstats, Soundcharts y Luminate.",
      "Reparte cada bloque a su motor; las métricas que no tienen motor propio quedan registradas en KPIs con el nombre del panel en vez de perderse.",
      "Revisa lo extraído y aplica. Las ciudades y países del panel llenan Zonas de Calor y Audiencia.",
    ],
  },
  {
    tarea: "Comparar con la competencia",
    pasos: [
      "Crea el artista de referencia con «+ Proyecto», tipo «Referencia de mercado».",
      "Cárgale al menos sus números de Resumen · Momentum.",
      "Pulsa «Comparar con …» en la barra superior.",
      "Genera la lectura comparativa: la IA ajusta por fase de carrera y marca la data de referencia con nivel más bajo.",
    ],
  },
  {
    tarea: "Emitir y trabajar el informe",
    pasos: [
      "Informe Final → «Emitir informe final». Tarda más que una lectura de sección: razona sobre todo el proyecto junto.",
      "Léelo entero antes de tocarlo.",
      "«Editar informe» y corrige lo que no corresponda a tu criterio. Se guarda solo.",
      "Marca los próximos pasos conforme los cumples.",
      "«Imprimir / PDF» para presentarlo, o «Descargar» para llevarlo a Word o Notion.",
    ],
  },
  {
    tarea: "Someter a prueba un plan que te propusieron",
    pasos: [
      "Plan Stress-Test → suelta el PDF o la captura de la propuesta, o pégala como texto.",
      "Opcional: escribe qué te preocupa («me inquieta el anticipo»). La evaluación lo tiene en cuenta.",
      "«Evaluar plan». Tarda: cruza la propuesta con la fase, el catálogo, la audiencia y los KPIs del artista.",
      "Lee primero el veredicto y los supuestos ocultos — ahí suele estar lo que el plan no te dijo.",
      "Las condiciones son tu lista para la negociación: qué exigir antes de aceptar.",
    ],
  },
  {
    tarea: "Evaluar un caso nuevo que llegó",
    pasos: [
      "Triage → escribe nombre, género, fase percibida y una descripción libre del caso.",
      "«Analizar caso». Devuelve prioridad, motor de entrada recomendado y la razón.",
      "Si entra al sistema, créalo como proyecto y empieza por el motor que recomendó.",
    ],
  },
];

export const GUIA_EVIDENCIA: ManualBloque = {
  titulo: "Cómo leer los niveles de evidencia",
  parrafos: [
    "Cada afirmación de la IA lleva un nivel de 1 a 4. No es decoración: es el freno que evita que una interpretación se te presente como un hecho. Úsalo para decidir cuánto peso le das.",
  ],
  puntos: [
    { termino: "Nivel 4 — Alta evidencia", texto: "Data completa y consistente. Se puede decidir sobre esto." },
    { termino: "Nivel 3 — Evidencia sólida", texto: "La lectura se sostiene, pero falta un pedazo. Decide, con la reserva anotada." },
    {
      termino: "Nivel 2 — Evidencia parcial",
      texto: "Fuente incompleta o no verificada (típico de data pública de competencia). Sirve para calibrar posición, no para decisiones de precisión como presupuesto o timing.",
    },
    {
      termino: "Nivel 1 — Especulativo",
      texto: "Es criterio, no dato. Úsalo como hipótesis a validar, nunca como base de una decisión con dinero encima.",
    },
  ],
};

export const GUIA_CADENCIA: ManualBloque = {
  titulo: "Cadencia sugerida",
  puntos: [
    { termino: "Cuando llega data nueva", texto: "Actualiza la sección y vuelve a generar su lectura. Toma dos minutos." },
    { termino: "Cada semana", texto: "Revisa KPIs y Management: si el ritmo de gasto o una decisión pendiente se movió, ahí se ve primero. Marca en el informe los pasos que ya cumpliste." },
    { termino: "Cada mes o al cerrar un hito", texto: "Emite el Informe Final y archívalo. Ese es el histórico que después muestra la evolución." },
    { termino: "Antes de una reunión o demo", texto: "Emite informe fresco, edítalo a tu criterio e imprímelo a PDF. Es el documento que se presenta." },
  ],
};

export const GUIA_PROBLEMAS: ManualBloque = {
  titulo: "Si algo no funciona",
  puntos: [
    {
      termino: "«ANTHROPIC_API_KEY no está configurada»",
      texto: "El servidor no tiene la llave de la IA. Se configura en las variables de entorno del despliegue; sin ella, la data y la edición funcionan, pero no la interpretación.",
    },
    {
      termino: "Abrí en otro dispositivo y no está mi data",
      texto: "Mira el indicador del encabezado. Si dice «Solo este dispositivo», falta configurar DATABASE_URL en el servidor y la data no viaja. Si dice «Guardado», recarga: se lee de la base al abrir.",
    },
    {
      termino: "El indicador dice «Sin guardar»",
      texto: "No se pudo escribir en la base. Lo que hiciste sigue en el navegador y se reintenta con el próximo cambio — no lo has perdido. Si persiste, revisa DATABASE_URL.",
    },
    {
      termino: "«Notion no está configurado»",
      texto: "Faltan sus dos variables en el servidor. La descarga a archivo funciona igual y no depende de eso.",
    },
    {
      termino: "La investigación volvió sin fuentes",
      texto: "La web no tenía nada utilizable sobre eso. El sistema te lo avisa y baja todo a nivel 2 en vez de fingir evidencia. Prueba con el nombre exacto, o con una pregunta más concreta y menos abstracta.",
    },
    {
      termino: "El informe salió flaco o genérico",
      texto: "Casi siempre es falta de insumo: pocos motores con data o pocas lecturas generadas. Carga más, genera lecturas por sección y vuelve a emitirlo.",
    },
    {
      termino: "Perdí lo que había editado en el informe",
      texto: "«Volver a emitir» descarta la edición y pide un borrador nuevo. Si vas a regenerar, descarga antes la versión trabajada.",
    },
    {
      termino: "Me pide entrar de nuevo sin haber hecho nada",
      texto: "La sesión venció — duran 30 días — o se cambió la contraseña del sistema. Entra otra vez y sigue donde estabas: no se pierde nada, la data no vive en la sesión.",
    },
    {
      termino: "Dice «Contraseña incorrecta» y estoy seguro de la contraseña",
      texto: "Si de verdad es la correcta, revisa que no haya un espacio de más al pegarla. Si el mensaje en cambio dice que falta APP_PASSWORD, el problema no eres tú: esa variable no está puesta en el servidor y nadie puede entrar hasta definirla.",
    },
    {
      termino: "«Demasiados intentos fallidos»",
      texto: "Bloqueo temporal tras varios intentos seguidos. Se levanta solo en unos minutos; no hay que hacer nada.",
    },
  ],
};

// Respaldos. Va en la guía y no en el manual técnico a propósito: es lo único
// de esta sección que, si no se hace, se paga con trabajo perdido.
export const GUIA_RESPALDO: ManualBloque = {
  titulo: "Cómo respaldar tu trabajo",
  puntos: [
    {
      termino: "Dónde está el respaldo completo",
      texto: "Fuera de VINCERE, en el C.C.O. → Configuración → «Exportar todos los datos». Descarga un JSON con todo: el C.C.O. entero y VINCERE entero — proyectos de artistas, canciones con su letra y su análisis, marca, investigaciones, stress-tests, informes y triage.",
    },
    {
      termino: "El botón «Exportar» del Informe Final no es un respaldo",
      texto: "Ese baja un solo informe en Markdown, para mandárselo a alguien. No incluye el resto del proyecto.",
    },
    {
      termino: "Cada cuánto",
      texto: "Si el encabezado dice «Guardado», tu data está en la base de datos y el respaldo es una segunda red. Si dice «Solo este dispositivo», el trabajo vive únicamente en este navegador: exporta cada vez que cargues data seria, porque borrar los datos del navegador lo borra sin vuelta atrás.",
    },
  ],
};

export const GUIA_REGLA_ORO =
  "La IA interpreta; tú diriges. Si una lectura no te suena, presiónala con una pregunta abierta en vez de aceptarla — el criterio final es tuyo, y ese es justamente el que ninguna otra plataforma tiene.";

// ---------------------------------------------------------------------------
// MANUAL DEL SISTEMA
// ---------------------------------------------------------------------------

export const SISTEMA_INTRO =
  "VINCERE Intelligence Platform es el instrumento donde el método VINCERE de dirección estratégica musical opera sobre data real. Este manual explica qué es el sistema, de qué partes se compone y cómo funciona por dentro — para entenderlo, para operarlo con criterio y para poder explicarlo a un tercero.";

export const SISTEMA_QUE_ES: ManualBloque = {
  titulo: "Qué es y qué no es",
  puntos: [
    {
      termino: "Es una plataforma de interpretación",
      texto: "Paneles navegables con data, y encima una capa que la lee con el método VINCERE: qué significa, por qué pasa, qué riesgo crece, qué decisión conviene.",
    },
    {
      termino: "No es un proveedor de data",
      texto: "No compite en cobertura con Chartmetric ni pretende tener toda la data del planeta. La ventaja es el criterio, no el volumen.",
    },
    {
      termino: "No es un producto para clientes",
      texto: "Es herramienta interna de un solo operador. Un tercero puede verla en pantalla; no la opera.",
    },
    {
      termino: "No decide por ti",
      texto: "Diagnostica, compara y recomienda con una postura clara. La decisión y su ejecución son del director.",
    },
  ],
};

export const SISTEMA_ARQUITECTURA: ManualBloque = {
  titulo: "Las tres capas de cada sección",
  parrafos: [
    "Todas las secciones están construidas igual, y esa repetición es deliberada: se aprende una vez y sirve para todas.",
  ],
  puntos: [
    {
      termino: "Capa data",
      texto: "Los números y hechos del motor. En las secciones numéricas se ve como paneles y gráficas; en las de criterio, como campos de texto estructurados. Todo editable a mano.",
    },
    {
      termino: "Capa interpretación",
      texto: "La lectura VINCERE sobre esa data, con nivel de evidencia por afirmación. Es lo que un dashboard convencional no tiene.",
    },
    {
      termino: "Capa acción",
      texto: "Preguntas abiertas con la data como contexto, ajuste de escenarios donde aplica, y el registro a Notion.",
    },
  ],
};

export const SISTEMA_MOTORES: ManualMotor[] = [
  {
    motor: "Cargar data (Ingesta)",
    cuandoUsarlo: "La puerta de entrada de información al sistema: capturas, PDF, CSV o texto pegado.",
    queCargar: "El material crudo. La IA extrae, reparte por motor y levanta alertas; tú apruebas antes de que se escriba.",
  },
  {
    motor: "Investigación",
    cuandoUsarlo: "Cuando necesitas saber algo que no está en tu data: quién es un artista, cómo le fue a una canción, qué escena hay en una plaza, cuánto se paga por algo.",
    queCargar: "Nada: escribes qué quieres saber y el sistema busca en la web. Vuelve con hallazgos citados y su fuente enlazada.",
  },
  {
    motor: "Resumen · Momentum",
    cuandoUsarlo: "Para saber dónde está la carrera hoy y hacia dónde va el trimestre.",
    queCargar: "Streams del mes y su variación, seguidores, Momentum Index, serie de los últimos meses.",
  },
  {
    motor: "Diagnóstico Maestro",
    cuandoUsarlo: "Al abrir un proyecto, y cuando algo estructural cambia de fase.",
    queCargar: "Fase actual, fortaleza núcleo, riesgo principal y prioridad #1 — texto de criterio, no números.",
  },
  {
    motor: "Marca",
    cuandoUsarlo: "Al abrir un proyecto, antes de juzgar canciones. Y cada vez que algo se sienta fuera de carril sin saber explicar por qué.",
    queCargar: "Lo que el artista dice ser: posicionamiento, promesa, atributos, territorio y —sobre todo— lo que NO es. Más qué proyecta hoy cada canal (Spotify, redes, vivo).",
  },
  {
    motor: "Song Intelligence",
    cuandoUsarlo: "Para decidir qué canción empujar, cuál es el próximo single y cuál sacar de rotación. También para entender el patrón de lo que ya le funcionó al artista.",
    queCargar: "Por canción: streams, retención, skip, playlist adds, la letra y, si lo tienes, el archivo de audio.",
  },
  {
    motor: "Audiencia y Segmentos",
    cuandoUsarlo: "Antes de decidir inversión de campaña o cambio de sonido.",
    queCargar: "Distribución por edad, plataformas y países, en porcentajes.",
  },
  {
    motor: "Zonas de Calor",
    cuandoUsarlo: "Para decidir gira, shows y dónde expandir con menos riesgo.",
    queCargar: "Ciudades con su intensidad de escucha (0-100).",
  },
  {
    motor: "A&R y Colaboraciones",
    cuandoUsarlo: "Cuando aparece un feature, un productor o un nombre que alguien empuja. Y sobre todo cuando el nombre es grande y cuesta decir que no.",
    queCargar: "Los candidatos sobre la mesa: nombre, si es artista, productor o compositor, qué se supone que aporta y quién lo propuso. Declara la marca primero — el motor juzga sobre todo contra el antipatrón.",
  },
  {
    motor: "Shows y Touring",
    cuandoUsarlo: "Antes de aceptar una fecha o de armar una serie. Y cada vez que el mapa de calor tiente a tocar en la ciudad de más streams.",
    queCargar: "Los shows que ya hiciste: ciudad, sala, aforo, cuánta gente fue de verdad y cómo estuvo la noche. Esa relación entre asistencia y aforo es la única evidencia real de convocatoria que tiene el sistema.",
  },
  {
    motor: "Management / Decisiones",
    cuandoUsarlo: "Como bitácora viva: qué está pendiente de decidir y qué ya se decidió.",
    queCargar: "Las decisiones abiertas y cerradas de la carrera.",
  },
  {
    motor: "Ejecución / KPIs",
    cuandoUsarlo: "Para ver si el trimestre va a cerrar en meta y si el gasto va al ritmo correcto.",
    queCargar: "Métrica, valor actual, meta y una nota de contexto.",
  },
  {
    motor: "Pitch y Presentación",
    cuandoUsarlo: "Cuando hay que presentar el artista afuera: pitchear un tema a los editores de un DSP, proponer un acuerdo a un sello, o buscar una marca.",
    queCargar: "Nada nuevo: usa lo cargado. Escribe qué quieres conseguir con ese pitch — un pedido vago produce un documento vago. Para sello o marca, tener Personas cargadas en el C.C.O. permite que señale qué contactos tienes de puente.",
  },
  {
    motor: "Oportunidad de Negocio",
    cuandoUsarlo: "Antes de comprometerte con un artista nuevo. Y cuando la ilusión por un caso empiece a pesar más que los números.",
    queCargar: "Nada extra: usa todo lo que ya cargaste. Cuanta más data tenga el proyecto, más sostenido es el puntaje — con poco, el motor lo dice y baja el nivel de evidencia.",
  },
  {
    motor: "Triage",
    cuandoUsarlo: "Cuando entra un caso nuevo y hay que decidir si entra al sistema y por dónde.",
    queCargar: "Nombre, género, fase percibida y una descripción libre del caso.",
  },
  {
    motor: "Plan Stress-Test",
    cuandoUsarlo: "Cuando llega una propuesta de un tercero: contrato de sello, oferta de booking, plan de lanzamiento, gira. Antes de responder.",
    queCargar: "El plan tal como te llegó — PDF, captura o texto pegado. Se juzga contra la realidad de este artista, no en abstracto.",
  },
  {
    motor: "Comparación",
    cuandoUsarlo: "Para medir contra el mercado o decidir entre dos proyectos.",
    queCargar: "Nada extra: usa la data ya cargada de ambos. Ajusta la lectura por fase de carrera.",
  },
  {
    motor: "Informe Final",
    cuandoUsarlo: "Al cerrar un ciclo de trabajo, antes de una reunión o de una demo. Es también donde se sigue la ejecución: los pasos se marcan ahí.",
    queCargar: "Nada: se alimenta de todo lo demás. Después se edita a mano dentro de la plataforma.",
  },
];

export const SISTEMA_MOTORES_PENDIENTES = [
  "Marca",
  "A&R y Colaboraciones",
  "Finanzas y Presupuesto",
  "Shows y Touring",
  "Monetización",
  "Valoración de Carrera",
  "Legal y Derechos",
  "Relaciones de Industria",
  "Playbook",
];

export const SISTEMA_IA: ManualBloque = {
  titulo: "Cómo funciona la capa de IA",
  parrafos: [
    "Toda la interpretación la produce Claude (Sonnet 5) siguiendo un prompt propio que codifica el método VINCERE. No es un chat genérico conectado a la plataforma: el modelo recibe reglas estrictas y devuelve una estructura fija que la aplicación sabe leer.",
  ],
  puntos: [
    {
      termino: "Recibe solo la data de su alcance",
      texto: "La lectura de una sección recibe únicamente la data de esa sección, para que interprete específico. El informe final es la excepción: recibe el proyecto entero, y por eso puede cruzar motores.",
    },
    {
      termino: "Tiene prohibido inventar",
      texto: "Las reglas del sistema le impiden crear cifras, canciones, ciudades o fechas que no estén en el contexto. Si falta información, debe decirlo y bajar el nivel de evidencia en vez de rellenar.",
    },
    {
      termino: "Ajusta por fase de carrera",
      texto: "Nunca evalúa a un artista emergente con la vara de uno consolidado. En comparaciones, esto es lo que evita conclusiones falsas.",
    },
    {
      termino: "Declara su confianza",
      texto: "Cada afirmación sale con nivel 1-4. Es obligatorio en el formato de salida, así que no puede omitirlo.",
    },
    {
      termino: "Interpretar, no repetir",
      texto: "Tiene instrucción explícita de no repetir el dato que ya está en pantalla. Si una lectura solo parafrasea el panel, es una lectura fallida.",
    },
    {
      termino: "El análisis de letra cruza con las métricas",
      texto: "Al leer una canción no juzga la letra en el vacío: la contrasta con su retención y su skip, y con la audiencia y la marca del artista.",
    },
    {
      termino: "El audio se mide, no se le manda a la IA",
      texto: "Claude no acepta audio como entrada: solo texto, imagen y PDF. Así que el archivo no viaja a ningún lado — se analiza con procesamiento de señal en tu propio navegador y lo que se le entrega a la IA son los números. Ventaja de paso: el máster no sale de tu equipo y no hay costo de subida ni almacenamiento.",
    },
    {
      termino: "Lo que el audio sí mide",
      texto: "BPM con su fiabilidad, tonalidad, duración, rango dinámico, curva de energía, secciones, y el segundo en que la canción alcanza su estado de alta energía — el 'gancho'. Ese segundo cruzado con el skip rate es la lectura más directa del sistema: si el gancho entra en el 0:50 y la gente se sale, ahí está la causa con número.",
    },
    {
      termino: "Lo que el audio NO mide",
      texto: "No reconoce instrumentos. Describe la TEXTURA del espectro (brillo, peso de graves, densidad rítmica), y la IA tiene prohibido afirmar que hay una guitarra o un piano porque eso no se midió. Nombrar instrumentos requeriría un modelo de reconocimiento aparte.",
    },
    {
      termino: "El análisis externo entra por la puerta correcta",
      texto: "Cada canción tiene un campo de «Análisis externo y notas de producción» donde se pega lo que la plataforma no mide: instrumentos, mood, género y artistas similares de un servicio (Cyanite, Music.ai) o del oído del productor. La IA lo lee marcado como observación externa, nunca como algo medido aquí — y si contradice lo medido, tiene instrucción de decirlo en vez de elegir una de las dos.",
    },
    {
      termino: "El aviso salta una vez, no siempre",
      texto: "Al medir el audio de una canción que aún no tiene análisis externo se levanta una alerta de oportunidad recordándolo. Solo la primera vez por canción: un recordatorio que salta cada vez se vuelve invisible y deja de recordar nada.",
    },
    {
      termino: "De la similitud a la investigación",
      texto: "Si el análisis externo trae artistas similares, el botón «Investigar los artistas similares» salta a Investigación con la consulta ya escrita. Ahí es donde la cadena se cierra: la plataforma mide qué ES la canción, el servicio externo dice a qué SE PARECE, y la búsqueda web averigua qué les ha pasado a esos similares en el mercado. La consulta se deja escrita, no se lanza sola — buscar cuesta y lo decide el director.",
    },
    {
      termino: "La métrica de la letra es cálculo, no interpretación",
      texto: "Sílabas por verso con sinalefa y regla de acento final, esquema y tipo de rima, densidad léxica y repeticiones se calculan solos al guardar la letra. Se hace así a propósito: contar sílabas es una regla y debe dar siempre lo mismo — un modelo de lenguaje se equivoca contando y cambia de respuesta entre llamadas. La IA solo lee qué significan esos números.",
    },
    {
      termino: "En Investigación sale a buscar de verdad",
      texto: "El motor de Investigación usa la búsqueda web del propio modelo: hace varias búsquedas, lee las páginas y vuelve con las URLs consultadas. Trabaja en dos pasos — primero investiga con las fuentes delante, después ordena lo encontrado — porque el criterio nace cuando tiene las páginas en contexto, no al rellenar un formulario.",
    },
    {
      termino: "Un hallazgo sin fuente no puede subir de nivel 2",
      texto: "Es la regla que hace confiable lo que viene de afuera. Cada hallazgo señala de qué fuente salió y esa cita es un enlace que puedes abrir. Si no hay fuente, se marca como criterio del motor y el sistema le pone techo aunque el modelo declare más confianza.",
    },
    {
      termino: "Lo externo nunca se confunde con lo propio",
      texto: "Los hallazgos entran al contexto de los demás motores etiquetados como externos, con instrucción explícita de no mezclarlos con las métricas del artista en la misma frase. Un dato de una nota de prensa no pesa lo que uno de tu Spotify.",
    },
    {
      termino: "En la ingesta extrae, no completa",
      texto: "Al leer un archivo solo registra lo que ve. Lo ausente queda en null y se anota como faltante; el sistema nunca escribe encima de data buena con campos vacíos, ni rellena con conocimiento del artista.",
    },
    {
      termino: "Propone, no escribe",
      texto: "Ninguna extracción entra sola. La propuesta se revisa bloque por bloque y se aplica solo lo aprobado.",
    },
    {
      termino: "Lee evolución, no fotos sueltas",
      texto: "Cuando hay histórico, la interpretación habla de trayectoria: qué se aceleró, qué se frenó, qué se revirtió. Una cifra que sube más lento que el mes pasado es una lectura distinta de una que simplemente sube.",
    },
    {
      termino: "El informe se compara consigo mismo",
      texto: "Del segundo informe en adelante recibe el anterior: qué recomendó, qué pasos se cumplieron y cuáles no. Así el sistema se hace responsable de lo que dijo antes en vez de empezar de cero cada vez.",
    },
  ],
};

export const SISTEMA_HISTORICO: ManualBloque = {
  titulo: "El histórico: cómo el sistema acumula",
  parrafos: [
    "Cada carga de data guarda automáticamente una foto de los indicadores (streams, seguidores, Momentum Index, tamaño del catálogo) con su fecha y su origen. Solo se conserva una por día: interesa la evolución, no cada pulsación.",
    "Eso es lo que convierte la plataforma en memoria en vez de tablero. Sin histórico, cada carga sobrescribe la anterior y el sistema solo sabe cómo está la carrera hoy; con histórico sabe cómo llegó hasta aquí, y la IA puede leer la trayectoria.",
    "Los informes siguen la misma lógica: emitir uno nuevo archiva el anterior en lugar de destruirlo, con todo lo que hubieras editado a mano. Ese archivo es el registro de qué se decidió, cuándo, y si funcionó.",
  ],
};

export const SISTEMA_EVIDENCIA: ManualBloque = {
  titulo: "Por qué existen los niveles de evidencia",
  parrafos: [
    "Es la pieza que separa este sistema de un generador de texto convincente. Una interpretación segura y una especulación se ven exactamente igual escritas; el nivel obliga a distinguirlas y deja el juicio final del lado del director.",
    "Los niveles no son solo de la IA: en el informe se pueden corregir a mano. Si tu criterio dice que una lectura es más floja de lo que declaró el modelo, se baja — y el documento queda con esa reserva registrada.",
  ],
};

export const SISTEMA_DATOS: ManualBloque = {
  titulo: "Dónde vive la información",
  puntos: [
    {
      termino: "En la base de datos, si está configurada",
      texto: "Con DATABASE_URL puesta, cada cambio se guarda solo en Postgres y la misma información aparece en cualquier dispositivo donde entres. El indicador del encabezado dice «Guardado» cuando es así.",
    },
    {
      termino: "En el navegador, siempre",
      texto: "El navegador conserva una copia local que se usa para pintar al instante y como respaldo si la red falla. Sin base configurada, el indicador dice «Solo este dispositivo» y esa copia es lo único que hay.",
    },
    {
      termino: "El servidor manda cuando tiene contenido",
      texto: "Al abrir, se lee la base y lo que esté ahí reemplaza la copia local. La primera vez que se configura la base, lo que ya había en el navegador se sube completo en vez de perderse.",
    },
    {
      termino: "Separada del C.C.O. E.V.",
      texto: "VINCERE tiene su propio almacenamiento, independiente del resto de la aplicación. Vaciar uno no afecta al otro.",
    },
    {
      termino: "Notion como archivo histórico",
      texto: "La plataforma es donde se trabaja; Notion guarda el registro. El informe se archiva completo con un botón, si sus credenciales están configuradas.",
    },
    {
      termino: "El informe descargado es tu copia portátil",
      texto: "Se baja en formato Markdown: se abre en cualquier editor, se pega en Word o en Notion sin perder la estructura.",
    },
  ],
};

export const SISTEMA_ALCANCE: ManualBloque = {
  titulo: "Alcance y límites de esta versión",
  puntos: [
    {
      termino: "Un solo usuario",
      texto: "No hay cuentas, roles ni permisos. El acceso se protege con la contraseña de la aplicación.",
    },
    {
      termino: "Data manual, investigación automática",
      texto: "Los números los cargas tú: no hay conexión directa con Spotify, YouTube ni Meta, y la arquitectura está preparada para conectarlas después sin rehacer las secciones. Lo que sí sale solo a buscar es el motor de Investigación, que consulta la web abierta.",
    },
    {
      termino: "Google Trends no está y no está previsto",
      texto: "Google no publica una API estable de Trends; las librerías que existen son ingeniería inversa y se rompen, y las IPs de servidor quedan bloqueadas — funcionaría en local y fallaría en producción. La búsqueda web de Investigación cubre la misma necesidad con fuentes citables. Para números duros de mercado, la vía es un panel de industria (Chartmetric, Songstats, Soundcharts) cargado por Ingesta.",
    },
    {
      termino: "La investigación depende de lo que haya publicado",
      texto: "Si la web no tiene datos sobre lo que preguntas, el motor lo dice en vez de inventarlo, y toda la lectura queda con techo de nivel 2. Un artista muy pequeño o un mercado poco cubierto por prensa devolverá poco — eso es información honesta, no un fallo.",
    },
    {
      termino: "Audio: medida sí, reconocimiento no",
      texto: "Se miden tempo, tonalidad, estructura, energía y textura. No se reconocen instrumentos ni se separan pistas: eso necesitaría un modelo de reconocimiento, propio o de un servicio de pago (Cyanite, Music.ai). Si algún día hace falta nombrar instrumentos, ese resultado entra por Cargar data como cualquier otra fuente.",
    },
    {
      termino: "Formatos de audio",
      texto: "Lo que el navegador sepa decodificar: MP3, WAV, M4A, OGG, FLAC. Un tema de tres minutos tarda unos segundos. Se analiza uno a uno; no hay carga por lote todavía.",
    },
    {
      termino: "Nueve motores más pendientes",
      texto: "Marca, A&R, Finanzas, Shows, Monetización, Valoración, Legal, Relaciones y Playbook se activan uno a uno según la necesidad real de los proyectos.",
    },
    {
      termino: "Los datos de ejemplo no son reales",
      texto: "SETTE y LUNA REBEL arrancan con cifras de muestra para que la plataforma se vea funcionando. Reemplázalas por las tuyas antes de decidir nada con ellas.",
    },
  ],
};

export const SISTEMA_FOSO =
  "Cualquiera puede suscribirse mañana a una plataforma de data musical. Lo que no se puede comprar es el método: los motores, las reglas de interpretación, el playbook que se acumula con cada análisis y el criterio de quien dirige. Esta plataforma es donde ese método deja de vivir en conversaciones y pasa a operar como instrumento — proyecto tras proyecto, informe tras informe.";

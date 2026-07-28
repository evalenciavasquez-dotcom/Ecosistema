// Manual de operación de VINCERE — fuente única.
// Vive dentro de la plataforma (sección "Cómo se opera") en vez de en un
// archivo del repositorio, para que esté donde Eduardo trabaja, también en el
// celular. El README apunta aquí en vez de duplicar el contenido.

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

export interface ManualBloque {
  titulo: string;
  parrafos?: string[];
  puntos?: { termino: string; texto: string }[];
}

export const MANUAL_INTRO =
  "VINCERE no es un tablero que se mira: es donde se dirige. La data la cargas tú; el valor está en la capa que la interpreta con tu método y en el informe que emite al final. Este manual es el ritmo de trabajo, no una lista de botones.";

export const MANUAL_CICLO: ManualPaso[] = [
  {
    numero: 1,
    titulo: "Cargar la data del proyecto",
    descripcion: "Entra motor por motor y mete lo que tengas. No hace falta tenerlo todo.",
    detalle: [
      "Cada sección tiene sus campos: streams y seguidores en Resumen, catálogo en Song Intelligence, porcentajes en Audiencia, ciudades en Zonas de Calor, metas en KPIs.",
      "Un motor sin data no se rompe: te dice qué falta para activarse. Prefiere cargar cuatro motores bien a ocho a medias.",
      "En Song Intelligence, además de las métricas, pega la letra de cada canción — es lo que permite leerla como obra y no como fila de números.",
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
      "Ojo: «Volver a emitir» pide un borrador nuevo y descarta lo que hayas editado.",
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

export const MANUAL_MOTORES: ManualMotor[] = [
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
    motor: "Song Intelligence",
    cuandoUsarlo: "Para decidir qué canción empujar, cuál es el próximo single y cuál sacar de rotación.",
    queCargar: "Por canción: streams, retención, skip, playlist adds — y la letra.",
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
    motor: "Triage",
    cuandoUsarlo: "Cuando entra un caso nuevo y hay que decidir si entra al sistema y por dónde.",
    queCargar: "Nombre, género, fase percibida y una descripción libre del caso.",
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

export const MANUAL_EVIDENCIA: ManualBloque = {
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

export const MANUAL_CADENCIA: ManualBloque = {
  titulo: "Cadencia sugerida",
  puntos: [
    { termino: "Cuando llega data nueva", texto: "Actualiza la sección y vuelve a generar su lectura. Toma dos minutos." },
    { termino: "Cada semana", texto: "Revisa KPIs y Management: si el ritmo de gasto o una decisión pendiente se movió, ahí se ve primero." },
    { termino: "Cada mes o al cerrar un hito", texto: "Emite el Informe Final y archívalo. Ese es el histórico que después muestra la evolución." },
    { termino: "Antes de una reunión o demo", texto: "Emite informe fresco e imprímelo a PDF. Es el documento que se presenta." },
  ],
};

export const MANUAL_LIMITES: ManualBloque = {
  titulo: "Límites que debes conocer",
  parrafos: [
    "Nada de esto rompe la plataforma, pero saberlo evita sorpresas.",
  ],
  puntos: [
    {
      termino: "La data vive en este navegador",
      texto: "Lo que cargas se guarda en el dispositivo donde lo cargaste. Si abres en el celular no verás lo del computador. Por eso el informe se descarga y se archiva en Notion.",
    },
    {
      termino: "La IA necesita la API key configurada",
      texto: "Sin ANTHROPIC_API_KEY en el servidor, los botones de interpretación avisan con un mensaje en vez de responder.",
    },
    {
      termino: "Notion es opcional",
      texto: "Sin sus variables configuradas, «Archivar» te lo dice y no escribe nada. La descarga a archivo funciona siempre.",
    },
    {
      termino: "La data entra a mano",
      texto: "Todavía no hay conexión con Spotify, YouTube ni Google Trends. La arquitectura está lista para eso, pero hoy se pega manualmente.",
    },
    {
      termino: "Los datos de ejemplo no son reales",
      texto: "SETTE y LUNA REBEL arrancan con cifras de muestra para que veas la plataforma funcionando. Reemplázalas por las tuyas antes de decidir nada con ellas.",
    },
  ],
};

export const MANUAL_REGLA_ORO =
  "La IA interpreta; tú diriges. Si una lectura no te suena, presiónala con una pregunta abierta en vez de aceptarla — el criterio final es tuyo, y ese es justamente el que ninguna otra plataforma tiene.";

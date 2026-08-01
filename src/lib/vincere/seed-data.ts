import { VincereProyecto, VincereTriageCaso } from "./types";

// Caso real de arranque (SETTE) + una referencia de competencia (LUNA REBEL)
// cargada manualmente — mismos números validados en el prototipo de Eduardo,
// para que la plataforma abra ya poblada con el primer diagnóstico real.
export const SEED_VINCERE_PROYECTOS: VincereProyecto[] = [
  {
    id: "vin-sette",
    nombre: "SETTE",
    genero: "Pop urbano",
    fase: "Emergente → Consolidación",
    tipo: "propio",
    moneda: "COP",
    creadoEn: "2026-01-15",
    resumen: {
      streamsMes: 2430000,
      streamsCambioPct: 18,
      seguidores: 186000,
      seguidoresCambioPct: 6,
      momentumIndex: 62,
      serie: [
        { mes: "Feb", valor: 1450 },
        { mes: "Mar", valor: 1610 },
        { mes: "Abr", valor: 1780 },
        { mes: "May", valor: 1920 },
        { mes: "Jun", valor: 2100 },
        { mes: "Jul", valor: 2430 },
      ],
    },
    diagnostico: {
      faseActual: "Emergente, entrando a Consolidación",
      fortalezaNucleo: "Retención de audiencia en temas de tempo medio",
      riesgoPrincipal: "Dependencia de un solo tema para el 40% del streaming activo",
      prioridad: "Diversificar catálogo con al menos 2 lanzamientos en el próximo trimestre",
    },
    // Marca declarada de ejemplo: deliberadamente tiene grietas contra la data
    // de arriba (promete intimidad pero el tema que más suena es el de menor
    // retención) para que el diagnóstico de brecha tenga de qué agarrarse.
    marca: {
      posicionamiento: "Pop urbano de madrugada: canciones de después de la fiesta, no de la fiesta",
      promesa: "Quien lo pone a las 3 a.m. se siente acompañado, no animado",
      atributos: ["íntimo", "nocturno", "melancólico", "sin épica"],
      territorio: "Entre el pop urbano melódico y el R&B en español; referentes de tempo medio y voz cercana",
      antipatron: "No es un artista de perreo ni de himno de estadio. No hace canciones para levantar una pista.",
      puntosContacto: [
        {
          id: "pc-seed-1",
          canal: "Spotify",
          queProyecta: "La foto de perfil y el orden de temas populares abren con lo más bailable",
          coherencia: "desalineado",
        },
        {
          id: "pc-seed-2",
          canal: "Instagram",
          queProyecta: "Fotos nocturnas, paleta fría, textos cortos en minúscula",
          coherencia: "alineado",
        },
        {
          id: "pc-seed-3",
          canal: "Vivo",
          queProyecta: "Set corto con banda; cierra con el tema más movido",
          coherencia: "tibio",
        },
      ],
      actualizadoEn: "2026-01-15T00:00:00.000Z",
    },
    canciones: [
      { id: "song-1", nombre: "Bajo Cero", streams: 890000, retencionPct: 68, skipPct: 22, playlistAdds: 340 },
      { id: "song-2", nombre: "Nadie Como Tú", streams: 640000, retencionPct: 74, skipPct: 15, playlistAdds: 510 },
      { id: "song-3", nombre: "Fuego Lento", streams: 410000, retencionPct: 58, skipPct: 31, playlistAdds: 120 },
      { id: "song-4", nombre: "Otra Vida", streams: 310000, retencionPct: 81, skipPct: 9, playlistAdds: 690 },
      { id: "song-5", nombre: "Sin Aviso", streams: 180000, retencionPct: 45, skipPct: 40, playlistAdds: 40 },
    ],
    audiencia: {
      edad: [
        { label: "18–24", pct: 38 },
        { label: "25–34", pct: 31 },
        { label: "35–44", pct: 17 },
        { label: "45+", pct: 14 },
      ],
      plataformas: [
        { label: "Spotify", pct: 54 },
        { label: "YouTube", pct: 24 },
        { label: "TikTok", pct: 16 },
        { label: "Otros", pct: 6 },
      ],
      paises: [
        { label: "México", pct: 42 },
        { label: "Colombia", pct: 18 },
        { label: "España", pct: 12 },
        { label: "EE.UU.", pct: 11 },
        { label: "Argentina", pct: 9 },
        { label: "Otros", pct: 8 },
      ],
    },
    zonasCalor: [
      { id: "city-1", ciudad: "Bogotá", calor: 92 },
      { id: "city-2", ciudad: "Medellín", calor: 78 },
      { id: "city-3", ciudad: "Cali", calor: 71 },
      { id: "city-4", ciudad: "Barranquilla", calor: 65 },
      { id: "city-5", ciudad: "Madrid", calor: 58 },
      { id: "city-6", ciudad: "Buenos Aires", calor: 44 },
      { id: "city-7", ciudad: "Miami", calor: 39 },
    ],
    // Ingresos con la brecha montada a propósito: 2,43M de streams al mes
    // dejan unos 19.000 al mes, mientras UNA noche agotada de 350 personas
    // dejó 41.000. Los shows entran solos desde Touring, así que acá van solo
    // las fuentes que no vive ya el sistema.
    ingresos: [
      { id: "ing-1", tipo: "streaming", monto: 3900000, moneda: "COP", periodo: "2026-05", nota: "Liquidación distribuidora" },
      { id: "ing-2", tipo: "streaming", monto: 3620000, moneda: "COP", periodo: "2026-04", nota: "Liquidación distribuidora" },
      { id: "ing-3", tipo: "streaming", monto: 3280000, moneda: "COP", periodo: "2026-03", nota: "Liquidación distribuidora" },
      { id: "ing-4", tipo: "merch", monto: 1780000, moneda: "COP", periodo: "2026-05", nota: "Vendido en el show de Medellín" },
      { id: "ing-5", tipo: "sync", monto: 7000000, moneda: "COP", periodo: "2026-03", nota: "Bajo Cero en una serie local — pago único" },
    ],
    // Vínculo de ejemplo: sociedad ya acordada, con horas comprometidas. Es lo
    // que permite que el panel de capacidad muestre algo desde la primera
    // corrida en vez de un cero.
    vinculo: {
      tipo: "socio",
      confirmado: true,
      participacionPct: 18,
      tarifa: null,
      moneda: "COP",
      periodicidad: "mensual",
      horasSemanales: 12,
      notas: "18% sobre ingresos netos, revisable a los 12 meses.",
      actualizadoEn: "2026-02-01T00:00:00.000Z",
    },
    // Candidatos con las dos trampas del motor montadas: uno grande que viola
    // el antipatrón declarado en Marca (no es artista de perreo), y uno que
    // suena ideal pero comparte exactamente la misma audiencia — colaborar con
    // él no trae un solo oyente nuevo.
    candidatos: [
      {
        id: "cand-1",
        nombre: "DVKE",
        tipo: "artista",
        queAporta: "12M de oyentes mensuales y entrada directa a playlists grandes de reggaetón",
        origen: "Lo propuso el manager tras una reunión de sello",
        estado: "descartado",
        creadoEn: "2026-06-02",
      },
      {
        id: "cand-2",
        nombre: "Marea Baja",
        tipo: "artista",
        queAporta: "Mismo circuito indie, tocan las mismas salas y comparten público en GDL",
        origen: "Se conocen del circuito",
        estado: "propuesto",
        creadoEn: "2026-06-20",
      },
      {
        id: "cand-3",
        nombre: "Renata Solís",
        tipo: "artista",
        queAporta: "Voz femenina de R&B en español, audiencia en Bogotá y Madrid donde SETTE es débil",
        origen: "Salió de una investigación de artistas similares",
        estado: "conversando",
        creadoEn: "2026-07-04",
      },
      {
        id: "cand-4",
        nombre: "Tomás Ferrer",
        tipo: "productor",
        queAporta: "Produce el tipo de tema de tempo medio y voz cercana que a SETTE mejor le retiene",
        origen: "Recomendación del ingeniero de mezcla",
        estado: "propuesto",
        creadoEn: "2026-07-11",
      },
    ],
    // Historial con la trampa metida a propósito: CDMX es la plaza de más
    // calor (92) y sin embargo llenó a la mitad, mientras Guadalajara, con
    // menos escucha, agotó. Es el caso exacto que el motor debe cazar —
    // streams altos no son entradas vendidas.
    shows: [
      {
        id: "show-1",
        ciudad: "Medellín",
        fecha: "2026-05-17",
        sala: "Salón Amador",
        aforo: 350,
        asistencia: 350,
        ingresoNeto: 8200000,
        moneda: "COP",
        nota: "Agotado con dos semanas de anticipación. Público cantando la letra.",
      },
      {
        id: "show-2",
        ciudad: "Bogotá",
        fecha: "2026-03-08",
        sala: "Teatro Colsubsidio",
        aforo: 600,
        asistencia: 310,
        ingresoNeto: 4400000,
        moneda: "COP",
        nota: "Sala grande para la convocatoria real. Mucha reventa sin vender.",
      },
      {
        id: "show-3",
        ciudad: "Cali",
        fecha: "2025-11-22",
        sala: "La Topa Tolondra",
        aforo: 250,
        asistencia: 190,
        ingresoNeto: 2900000,
        moneda: "COP",
        nota: "Primera vez en la plaza, sin prensa local.",
      },
    ],
    decisiones: [
      { id: "dec-1", texto: "Lanzar EP en octubre vs diciembre", estado: "Pendiente", creadoEn: "2026-07-01" },
      { id: "dec-2", texto: "Firmar con booking agency regional", estado: "Pendiente", creadoEn: "2026-07-05" },
      {
        id: "dec-3",
        texto: "Rechazar feature con artista de bajo fit de marca",
        estado: "Tomada",
        creadoEn: "2026-06-18",
      },
      {
        id: "dec-4",
        texto: "Aumentar frecuencia de contenido corto (Reels/TikTok)",
        estado: "Tomada",
        creadoEn: "2026-06-02",
      },
    ],
    kpis: [
      { id: "kpi-1", label: "Streams mensuales", actual: 2.43, meta: 3, unidad: "M", nota: "81% de la meta trimestral" },
      {
        id: "kpi-2",
        label: "Shows confirmados (trimestre)",
        actual: 4,
        meta: 6,
        unidad: "",
        nota: "67% — dos por confirmar",
      },
      { id: "kpi-3", label: "Playlist editorial adds", actual: 3, meta: 5, unidad: "", nota: "60% de la meta" },
      {
        id: "kpi-4",
        label: "Presupuesto marketing usado",
        actual: 72,
        meta: 100,
        unidad: "%",
        nota: "72% del gasto con solo 40% del trimestre transcurrido — ritmo adelantado",
      },
    ],
    insights: {},
    qaLog: {},
  },
  {
    id: "vin-luna-rebel",
    nombre: "LUNA REBEL",
    genero: "Pop urbano",
    fase: "Consolidación",
    tipo: "competencia",
    moneda: "COP",
    creadoEn: "2026-07-10",
    resumen: {
      streamsMes: 1800000,
      streamsCambioPct: 4,
      seguidores: 240000,
      seguidoresCambioPct: 2,
      momentumIndex: 71,
      serie: [
        { mes: "Feb", valor: 1620 },
        { mes: "Mar", valor: 1660 },
        { mes: "Abr", valor: 1700 },
        { mes: "May", valor: 1740 },
        { mes: "Jun", valor: 1770 },
        { mes: "Jul", valor: 1800 },
      ],
    },
    diagnostico: {
      faseActual: "Consolidación",
      fortalezaNucleo: "Base de fans consolidada, catálogo profundo",
      riesgoPrincipal: "Crecimiento desacelerado frente a artistas emergentes",
      prioridad: "Sostener relevancia con lanzamientos de mayor frecuencia",
    },
    canciones: [],
    audiencia: { edad: [], plataformas: [], paises: [] },
    zonasCalor: [],
    decisiones: [],
    kpis: [],
    insights: {},
    qaLog: {},
  },
];

export const SEED_VINCERE_TRIAGE: VincereTriageCaso[] = [];

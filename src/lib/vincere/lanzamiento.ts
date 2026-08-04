// Motor de lanzamiento: de un presupuesto en dólares a una hoja de ruta.
//
// Este es el motor que convierte al sistema en lo que tiene que ser. Todo lo
// demás describe dónde está el artista; esto dice qué hacer con la próxima
// canción, por dónde meterla, cuánto cuesta y qué esperar — y después vuelve a
// preguntar si pasó.
//
// LA CADENA. Un presupuesto no produce seguidores directo. Pasa por escalones,
// y cada escalón tiene un coeficiente que hay que declarar:
//
//   dólares → (CPM) → impresiones → (CTR) → clics → (conversión) → oyentes
//   nuevos → (fan rate propio) → seguidores
//
// La honestidad de todo esto vive en una idea: **cada coeficiente lleva su
// fuente y su nivel de evidencia, y el resultado no puede ser más fuerte que su
// eslabón más débil.** Una agencia que dice "con US$2.000 te consigo 50.000
// oyentes" está multiplicando los mismos números; lo que no hace es enseñar de
// dónde salieron ni admitir que uno de ellos es un caso suelto.
//
// EL CONTRASTE. Para Meta hay dos maneras públicas de estimar esto y no
// coinciden: la cadena de arriba, y el costo por oyente que reportan las
// campañas de música (US$0,15-0,40). El motor calcula las dos y muestra la
// brecha en vez de escoger la que le convenga: cuando dos referencias
// independientes no coinciden, esa distancia ES la incertidumbre, medida y no
// escondida. Para YouTube y Spotify ese segundo método NO existe —el benchmark
// está medido en Meta— y el motor lo dice en vez de trasladarlo. Un contraste
// prestado de otra plataforma se vería como rigor y sería lo contrario.
//
// LO QUE NO HACE: no promete. Un rango ancho es un rango ancho, y aquí se
// muestra ancho. El propósito no es dar un número bonito para una reunión, es
// poder volver en 30 días y decir qué falló y por qué.

import { VincereProyecto } from "./types";
import { Plataforma, PLATAFORMA_LABEL, referenciaDe, RangoCosto } from "./costos";
import { mapaDePlazas, AccionDePlaza, PlazaEvaluada } from "./plazas";
import { calcularFanRate } from "./fanrate";

// 1 = un caso suelto, 2 = benchmark público, 3 = medido en el sector,
// 4 = medido en la data propia de este artista. Igual que en el resto del
// sistema, para que se pueda leer sin traducir.
export type NivelSupuesto = 1 | 2 | 3 | 4;

export interface Supuesto {
  clave: string;
  label: string;
  bajo: number;
  alto: number;
  unidad: string;
  nivel: NivelSupuesto;
  fuente: string;
  url: string;
  consultadoEn: string;
  // Qué hay que hacer para subirle el nivel. Sin esto, un nivel bajo es una
  // queja; con esto, es una tarea.
  comoSubirlo?: string;
  nota?: string;
}

const CONSULTA = "2026-08-04";

// ---------------------------------------------------------------------------
// Los coeficientes públicos. Cada uno con su fuente. Ninguno inventado.
// ---------------------------------------------------------------------------

// Cuántos de los que ven el anuncio hacen clic.
const CTR: Record<Plataforma, Supuesto> = {
  youtube: {
    clave: "ctr-youtube",
    label: "Clics sobre impresiones",
    bajo: 0.42,
    alto: 0.65,
    unidad: "%",
    nivel: 2,
    fuente: "Digital Applied / Megadigital — benchmarks de YouTube Ads 2026",
    url: "https://www.digitalapplied.com/blog/youtube-ads-benchmarks-2026-cpv-cpm-ctr-industry",
    consultadoEn: CONSULTA,
    nota: "Promedio 0,65%. Shorts rinde más alto (0,3-1,24%) porque el formato invita al toque.",
    comoSubirlo: "Con el CTR real de la primera campaña de este artista, medido en YouTube Ads.",
  },
  meta: {
    clave: "ctr-meta",
    label: "Clics sobre impresiones",
    bajo: 0.58,
    alto: 1.2,
    unidad: "%",
    nivel: 2,
    fuente: "Adamigo / Marketing LTB — CTR de Meta Ads por industria 2026",
    url: "https://www.adamigo.ai/blog/meta-ads-ctr-benchmarks-industry-2026",
    consultadoEn: CONSULTA,
    nota:
      "Rango de Instagram. El promedio global de Meta es más alto (1,5-1,8%) pero lo levantan comercio y moda, no música.",
    comoSubirlo: "Con el CTR real de la primera campaña de este artista, medido en el administrador de Meta.",
  },
  spotify: {
    clave: "ctr-spotify",
    label: "Clics sobre impresiones",
    bajo: 0.3,
    alto: 0.8,
    unidad: "%",
    nivel: 2,
    fuente: "AdBacklog / Orphiq — benchmarks de Spotify Ads",
    url: "https://adbacklog.com/blog/spotify-ads-benchmarks-per-industry-2025-2",
    consultadoEn: CONSULTA,
    nota:
      "El audio no invita a tocar la pantalla: sirve para recordación, no para clic inmediato. Algunas fuentes reportan hasta 0,04% en audio puro.",
    comoSubirlo: "Con el CTR real de la primera campaña de este artista en Ad Studio.",
  },
};

// Cuántos de los que ven el video lo ven de verdad. Solo aplica a video: es la
// señal de calidad que decide si el algoritmo de YouTube favorece el anuncio.
const VIEW_RATE: Supuesto = {
  clave: "viewrate-youtube",
  label: "Vistas reales sobre impresiones",
  bajo: 15,
  alto: 25,
  unidad: "%",
  nivel: 2,
  fuente: "Digital Applied / OwlClaw — view rate de YouTube 2026",
  url: "https://owlclaw.com/benchmarks/youtube-ads-benchmarks/",
  consultadoEn: CONSULTA,
  nota:
    "Rango de un in-stream saltable bien apuntado. Las campañas fuertes llegan a 30-40%; con mala segmentación cae por debajo de 10%.",
  comoSubirlo: "Con el view rate real de la primera campaña.",
};

// EL ESLABÓN DÉBIL, y hay que decirlo en voz alta: no existe un benchmark
// público confiable de "clic → oyente mensual" para música. Lo único que se
// encuentra es un caso suelto (255 clics → 90 oyentes). Un caso no es un
// benchmark. Se usa como marcador de posición explícito, con nivel 1, y el
// sistema pide reemplazarlo con la campaña propia en cuanto exista.
const CLIC_A_OYENTE: Supuesto = {
  clave: "clic-oyente",
  label: "Clics que se vuelven oyente",
  bajo: 20,
  alto: 35,
  unidad: "%",
  nivel: 1,
  fuente: "Music Marketing Monday — un caso documentado (255 clics → 90 oyentes)",
  url: "https://www.musicmarketingmonday.com/p/spotify-showcase-31-streams-per-listener",
  consultadoEn: CONSULTA,
  nota:
    "Es UN caso, no una media de industria. El borde bajo (20%) se puso por debajo del caso a propósito, porque un caso publicado casi siempre es uno que salió bien.",
  comoSubirlo:
    "Comparando los clics que reportó la plataforma contra los oyentes nuevos que mostró Spotify for Artists en esa misma ventana. Una sola campaña propia ya vale más que este número.",
};

// El contraste top-down: costo por oyente en campañas de música en Meta.
const CPL_MUSICA: Supuesto = {
  clave: "cpl-musica",
  label: "Costo por oyente nuevo",
  bajo: 0.15,
  alto: 0.4,
  unidad: "USD",
  nivel: 2,
  fuente: "Dynamoi — métricas de Meta Ads para campañas de música 2026",
  url: "https://dynamoi.com/learn/instagram-ads/meta-ads-manager-metrics-music-campaigns",
  consultadoEn: CONSULTA,
  nota: "Reportado para Meta en mercados grandes. En LATAM el CPM es más barato, así que el costo por oyente debería ser menor.",
  comoSubirlo: "Dividiendo el gasto real de una campaña entre los oyentes nuevos de esa ventana.",
};

export const SUPUESTOS_PUBLICOS: Supuesto[] = [
  CTR.youtube,
  CTR.meta,
  CTR.spotify,
  VIEW_RATE,
  CLIC_A_OYENTE,
  CPL_MUSICA,
];

// ---------------------------------------------------------------------------
// La cadena
// ---------------------------------------------------------------------------

export interface PasoDeCadena {
  label: string;
  bajo: number;
  alto: number;
  unidad: string;
  // De dónde sale el coeficiente que produjo este escalón.
  supuesto: Supuesto | null;
  // Cómo se leyó el escalón anterior para llegar a este.
  operacion: string;
  // Si es un eslabón de la cadena o una lectura paralela. Las vistas de YouTube
  // no alimentan los clics —el CTR se mide sobre impresiones, no sobre vistas—
  // pero son la señal que más importa en una campaña de música: dicen cuánta
  // gente oyó la canción, hayan hecho clic o no. Dibujarlas como eslabón sería
  // sugerir una multiplicación que no ocurre.
  enCadena: boolean;
}

export interface Ruta {
  id: string;
  canal: Plataforma;
  canalLabel: string;
  plaza: string;
  pais: string | null;
  accionDePlaza: AccionDePlaza;
  porQueEsaPlaza: string;
  presupuestoUsd: number;
  cpm: RangoCosto;
  cadena: PasoDeCadena[];
  oyentesBajo: number;
  oyentesAlto: number;
  seguidoresBajo: number | null;
  seguidoresAlto: number | null;
  costoPorOyenteBajoUsd: number;
  costoPorOyenteAltoUsd: number;
  // El segundo método, para contrastar. null cuando el benchmark no aplica a
  // este canal: mejor no tener contraste que tener uno prestado de otra
  // plataforma.
  contrasteOyentesBajo: number | null;
  contrasteOyentesAlto: number | null;
  // Qué decir cuando los dos métodos no se parecen.
  brecha: string;
  // El eslabón más débil de esta ruta concreta.
  nivelMasDebil: NivelSupuesto;
  porQueEseNivel: string;
  // Si la plataforma exige más presupuesto del que hay.
  noEjecutable: string | null;
  // Qué mirar y cuándo, para poder cerrar el ciclo.
  senal: string;
  riesgos: string[];
}

const r0 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 100) / 100;

function ordenDeMagnitud(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 1;
  return Math.max(a, b) / Math.min(a, b);
}

function construirRuta(
  p: VincereProyecto,
  canal: Plataforma,
  plaza: PlazaEvaluada,
  presupuestoUsd: number,
  fanRatePct: number | null,
  fanRateNivel: NivelSupuesto
): Ruta {
  const cpm = referenciaDe(canal, plaza.pais);
  const cadena: PasoDeCadena[] = [];

  // Escalón 1: dólares → impresiones. Ojo con el cruce: el CPM ALTO produce
  // MENOS impresiones. Invertir esto es el error de aritmética más fácil de
  // cometer aquí y el que haría que todo lo demás mienta.
  const impresionesBajo = (presupuestoUsd / cpm.cpmAltoUsd) * 1000;
  const impresionesAlto = (presupuestoUsd / cpm.cpmBajoUsd) * 1000;
  cadena.push({
    label: "Impresiones",
    bajo: r0(impresionesBajo),
    alto: r0(impresionesAlto),
    unidad: "",
    supuesto: {
      clave: `cpm-${canal}`,
      label: "CPM",
      bajo: cpm.cpmBajoUsd,
      alto: cpm.cpmAltoUsd,
      unidad: "USD por mil",
      nivel: cpm.region === "global" ? 2 : 2,
      fuente: cpm.fuente,
      url: cpm.url,
      consultadoEn: cpm.consultadoEn,
      nota:
        cpm.region === "global"
          ? `No hay dato específico de ${plaza.pais ?? "esta plaza"}: se usa el rango global, que es mucho más ancho.`
          : cpm.nota,
      comoSubirlo: "Con el CPM que efectivamente pagó la campaña, que aparece en el reporte de la plataforma.",
    },
    operacion: `US$${presupuestoUsd} ÷ CPM de US$${cpm.cpmBajoUsd}–${cpm.cpmAltoUsd} × 1.000`,
    enCadena: true,
  });

  // Escalón 2 (solo video): impresiones → vistas reales.
  let baseBajo = impresionesBajo;
  let baseAlto = impresionesAlto;
  if (canal === "youtube") {
    baseBajo = impresionesBajo * (VIEW_RATE.bajo / 100);
    baseAlto = impresionesAlto * (VIEW_RATE.alto / 100);
    cadena.push({
      label: "Vistas reales",
      bajo: r0(baseBajo),
      alto: r0(baseAlto),
      unidad: "",
      supuesto: VIEW_RATE,
      operacion: `${VIEW_RATE.bajo}–${VIEW_RATE.alto}% de las impresiones sobrevive los primeros segundos. No multiplica los clics: el CTR ya se mide sobre impresiones. Es la gente que oyó la canción sin tocar nada.`,
      enCadena: false,
    });
  }

  // Escalón 3: clics.
  const ctr = CTR[canal];
  const clicsBajo = impresionesBajo * (ctr.bajo / 100);
  const clicsAlto = impresionesAlto * (ctr.alto / 100);
  cadena.push({
    label: "Clics",
    bajo: r0(clicsBajo),
    alto: r0(clicsAlto),
    unidad: "",
    supuesto: ctr,
    operacion: `${ctr.bajo}–${ctr.alto}% de las impresiones`,
    enCadena: true,
  });

  // Escalón 4: oyentes. Aquí es donde la cadena se vuelve frágil.
  const oyentesBajo = clicsBajo * (CLIC_A_OYENTE.bajo / 100);
  const oyentesAlto = clicsAlto * (CLIC_A_OYENTE.alto / 100);
  cadena.push({
    label: "Oyentes nuevos",
    bajo: r0(oyentesBajo),
    alto: r0(oyentesAlto),
    unidad: "",
    supuesto: CLIC_A_OYENTE,
    operacion: `${CLIC_A_OYENTE.bajo}–${CLIC_A_OYENTE.alto}% de los clics`,
    enCadena: true,
  });

  // Escalón 5: seguidores, con el fan rate DE ESTE ARTISTA. Es el único
  // coeficiente de la cadena que sale de su propia data, y por eso es el más
  // fuerte. Si no hay oyentes cargados, no hay fan rate y el escalón no existe:
  // no se rellena con un número de industria.
  let seguidoresBajo: number | null = null;
  let seguidoresAlto: number | null = null;
  if (fanRatePct != null && fanRatePct > 0) {
    seguidoresBajo = r0(oyentesBajo * (fanRatePct / 100));
    seguidoresAlto = r0(oyentesAlto * (fanRatePct / 100));
    cadena.push({
      label: "Seguidores nuevos",
      bajo: seguidoresBajo,
      alto: seguidoresAlto,
      unidad: "",
      supuesto: {
        clave: "fanrate-propio",
        label: "Fan rate del artista",
        bajo: fanRatePct,
        alto: fanRatePct,
        unidad: "%",
        nivel: fanRateNivel,
        fuente: "Medido en la data de este artista",
        url: "",
        consultadoEn: CONSULTA,
        nota:
          fanRateNivel === 4
            ? "Marginal: sale de comparar dos cargas de data, así que mide la audiencia que entró de verdad, no la histórica."
            : "Acumulado: arrastra toda la historia del artista y suele sobrestimar lo que convierte la audiencia nueva. Con una segunda carga aparece el marginal.",
      },
      operacion: `${fanRatePct}% de los oyentes nuevos — el fan rate propio, no uno de industria`,
      enCadena: true,
    });
  }

  // El contraste top-down. IMPORTANTE: el costo por oyente de US$0,15-0,40 está
  // reportado PARA META. Aplicárselo a una ruta de Spotify y anunciar que "los
  // métodos se separan 30×" no mediría incertidumbre: estaría comparando el
  // benchmark de una plataforma contra la cadena de otra, que es un error de
  // categoría disfrazado de rigor. Solo se contrasta donde el benchmark aplica.
  const aplicaContraste = canal === "meta";
  const contrasteBajo = aplicaContraste ? presupuestoUsd / CPL_MUSICA.alto : 0;
  const contrasteAlto = aplicaContraste ? presupuestoUsd / CPL_MUSICA.bajo : 0;

  let brecha: string;
  if (!aplicaContraste) {
    brecha = `No hay un segundo método público para ${PLATAFORMA_LABEL[canal]}: el costo por oyente reportado en música está medido en Meta y trasladarlo aquí sería comparar plataformas distintas. Este rango se apoya en una sola cadena, así que aguanta menos peso que el de Meta.`;
  } else {
    const magnitud = ordenDeMagnitud((oyentesBajo + oyentesAlto) / 2, (contrasteBajo + contrasteAlto) / 2);
    if (magnitud < 1.6) {
      brecha = `Los dos métodos coinciden razonablemente (se separan ${r2(
        magnitud
      )}×). Cuando la cadena y el costo por oyente dan lo mismo, el rango se puede defender.`;
    } else if (magnitud < 4) {
      brecha = `Los dos métodos se separan ${r2(magnitud)}×. El rango honesto es el que los cubre a los dos: entre ${r0(
        Math.min(oyentesBajo, contrasteBajo)
      )} y ${r0(Math.max(oyentesAlto, contrasteAlto))} oyentes.`;
    } else {
      brecha = `Los dos métodos se separan ${r2(
        magnitud
      )}× — demasiado para presentar una cifra. Lo que corresponde decir es el orden de magnitud y que la primera campaña sirve para calibrar, no para cumplir una meta.`;
    }
  }

  // El nivel de la ruta es el del eslabón más débil. No el promedio: un
  // promedio escondería que uno de los números es un caso suelto.
  const usados = cadena.map((c) => c.supuesto).filter((s): s is Supuesto => s != null);
  const nivelMasDebil = Math.min(...usados.map((s) => s.nivel)) as NivelSupuesto;
  const debil = usados.find((s) => s.nivel === nivelMasDebil)!;

  const noEjecutable =
    cpm.minimoUsd && presupuestoUsd < cpm.minimoUsd
      ? `${PLATAFORMA_LABEL[canal]} exige un mínimo de US$${cpm.minimoUsd} por campaña. Con US$${presupuestoUsd} esta ruta no se puede ejecutar.`
      : null;

  const riesgos: string[] = [];
  if (cpm.region === "global") {
    riesgos.push(
      `No hay CPM público de ${plaza.pais ?? "este país"} en ${PLATAFORMA_LABEL[canal]}: se usó el rango global, que va de US$${cpm.cpmBajoUsd} a US$${cpm.cpmAltoUsd}. Esa horquilla sola ya multiplica el resultado por ${r2(
        cpm.cpmAltoUsd / cpm.cpmBajoUsd
      )}.`
    );
  }
  if (canal === "spotify") {
    riesgos.push(
      "El audio sirve para recordación, no para clic inmediato: parte del efecto aparece días después y no queda atribuido a la campaña. Este cálculo lo subestima."
    );
  }
  if (cpm.minimoUsd && presupuestoUsd >= cpm.minimoUsd && presupuestoUsd < cpm.minimoUsd * 2) {
    riesgos.push(
      `El presupuesto apenas pasa el mínimo de US$${cpm.minimoUsd} que exige la plataforma. Una campaña pegada al piso no alcanza a salir de la fase de aprendizaje del algoritmo, así que rinde por debajo del benchmark.`
    );
  }
  if (plaza.accion === "abrir") {
    riesgos.push(
      "Plaza fría: la pauta entra sin audiencia previa que la respalde, así que el CTR real suele quedar por debajo del benchmark."
    );
  }
  if (fanRatePct == null) {
    riesgos.push(
      "Sin oyentes mensuales cargados no hay fan rate, así que la cadena se corta en oyentes y no llega a seguidores."
    );
  }

  return {
    id: `${canal}-${plaza.ciudad}`.toLocaleLowerCase("es").replace(/\s+/g, "-"),
    canal,
    canalLabel: PLATAFORMA_LABEL[canal],
    plaza: plaza.ciudad,
    pais: plaza.pais,
    accionDePlaza: plaza.accion,
    porQueEsaPlaza: plaza.razon,
    presupuestoUsd,
    cpm,
    cadena,
    oyentesBajo: r0(oyentesBajo),
    oyentesAlto: r0(oyentesAlto),
    seguidoresBajo,
    seguidoresAlto,
    costoPorOyenteBajoUsd: oyentesAlto > 0 ? r2(presupuestoUsd / oyentesAlto) : 0,
    costoPorOyenteAltoUsd: oyentesBajo > 0 ? r2(presupuestoUsd / oyentesBajo) : 0,
    contrasteOyentesBajo: aplicaContraste ? r0(contrasteBajo) : null,
    contrasteOyentesAlto: aplicaContraste ? r0(contrasteAlto) : null,
    brecha,
    nivelMasDebil,
    porQueEseNivel: `La ruta entera no puede ser más firme que «${debil.label.toLocaleLowerCase("es")}», que es nivel ${
      debil.nivel
    }. ${debil.comoSubirlo ?? ""}`.trim(),
    noEjecutable,
    senal: `Oyentes mensuales en ${plaza.ciudad} (Spotify for Artists → Audiencia) y seguidores totales, medidos el día antes de arrancar y 30 días después.`,
    riesgos,
  };
}

// ---------------------------------------------------------------------------
// El plan completo
// ---------------------------------------------------------------------------

export interface PlanDeLanzamiento {
  rutas: Ruta[];
  // La comparación en una frase: por dónde entra más barato.
  titular: string;
  // Plazas que la regla descartó y por qué. Tan importante como las elegidas:
  // es el argumento contra "¿y por qué no pautamos en Guayaquil, que está hot?".
  descartadas: { ciudad: string; porQue: string }[];
  // Plazas que sí califican pero quedaron fuera del corte de este plan. No es
  // lo mismo que descartar: si se sueltan en el mismo saco, una plaza válida
  // parece rechazada y el argumento se vuelve falso.
  enCola: { ciudad: string; porQue: string; prioridad: number }[];
  avisos: string[];
  fanRatePct: number | null;
  fanRateNivel: NivelSupuesto;
  // Lo que hay que conseguir para que esto deje de ser estimación.
  paraCalibrar: string[];
}

const CANALES: Plataforma[] = ["youtube", "meta", "spotify"];

export function planDeLanzamiento(
  p: VincereProyecto,
  presupuestoUsd: number,
  cuantasPlazas = 2
): PlanDeLanzamiento {
  const mapa = mapaDePlazas(p);
  const fr = calcularFanRate(p);

  // Se prefiere el marginal —mide la audiencia que entró de verdad— y solo si
  // no existe se cae al acumulado, diciéndolo.
  let fanRatePct: number | null = null;
  let fanRateNivel: NivelSupuesto = 1;
  if (fr.marginal && !fr.marginal.audienciaBajo && fr.marginal.oyentesGanados > 0) {
    fanRatePct = fr.marginal.pct;
    fanRateNivel = 4;
  } else if (fr.actual) {
    fanRatePct = fr.actual.pct;
    fanRateNivel = 3;
  }

  const avisos = [...mapa.avisos];
  const paraCalibrar: string[] = [];

  if (fanRatePct == null) {
    avisos.push(
      "Sin oyentes mensuales no hay fan rate: las rutas llegan hasta oyentes nuevos y no pueden estimar seguidores."
    );
    paraCalibrar.push("Oyentes mensuales en Spotify for Artists → Audiencia. Sin ese dato la cadena se corta.");
  } else if (fanRateNivel === 3) {
    avisos.push(
      "El fan rate que se está usando es el acumulado, que arrastra años de historia. Con una segunda carga de data aparece el marginal, que es el que mide la audiencia nueva."
    );
  }

  paraCalibrar.push(
    "El CTR y el costo real por clic de la primera campaña. Con eso, dos de los coeficientes dejan de ser benchmark público y pasan a ser data propia."
  );
  paraCalibrar.push(
    "Oyentes nuevos medidos en la misma ventana de la campaña. Ese número reemplaza al eslabón de nivel 1 y es el que ninguna agencia tiene del artista."
  );

  // Las plazas donde tiene sentido meter peso, según la regla: reforzar
  // primero, abrir después. Nunca las calientes.
  const elegidas = mapa.plazas
    .filter((z) => z.prioridadPauta != null)
    .sort((a, b) => (a.prioridadPauta ?? 99) - (b.prioridadPauta ?? 99))
    .slice(0, cuantasPlazas);

  const descartadas = mapa.plazas
    .filter((z) => z.prioridadPauta == null)
    .map((z) => ({ ciudad: z.ciudad, porQue: z.razon }));

  const idsElegidas = new Set(elegidas.map((z) => z.ciudad));
  const enCola = mapa.plazas
    .filter((z) => z.prioridadPauta != null && !idsElegidas.has(z.ciudad))
    .sort((a, b) => (a.prioridadPauta ?? 99) - (b.prioridadPauta ?? 99))
    .map((z) => ({ ciudad: z.ciudad, porQue: z.razon, prioridad: z.prioridadPauta as number }));

  if (!elegidas.length) {
    return {
      rutas: [],
      titular: mapa.plazas.length
        ? "Ninguna plaza está en el rango donde la pauta rinde. Meter presupuesto hoy sería comprar audiencia que ya tienes o gente que no vuelve."
        : "No hay zonas de calor cargadas: sin saber dónde hay señal, cualquier reparto de presupuesto es una corazonada.",
      descartadas,
      enCola: [],
      avisos,
      fanRatePct,
      fanRateNivel,
      paraCalibrar,
    };
  }

  const rutas: Ruta[] = [];
  for (const plaza of elegidas) {
    for (const canal of CANALES) {
      rutas.push(construirRuta(p, canal, plaza, presupuestoUsd, fanRatePct, fanRateNivel));
    }
  }

  // Se ordenan por costo por oyente en el borde optimista: es la comparación
  // que responde "¿por dónde entra más barato?".
  const ejecutables = rutas.filter((r) => !r.noEjecutable);
  ejecutables.sort((a, b) => a.costoPorOyenteBajoUsd - b.costoPorOyenteBajoUsd);
  const bloqueadas = rutas.filter((r) => r.noEjecutable);

  const mejor = ejecutables[0];
  const peor = ejecutables[ejecutables.length - 1];

  let titular = "Sin rutas ejecutables con este presupuesto.";
  if (mejor) {
    titular = `Con US$${presupuestoUsd}, la ruta más barata por oyente es ${mejor.canalLabel} en ${mejor.plaza}: entre US$${mejor.costoPorOyenteBajoUsd} y US$${mejor.costoPorOyenteAltoUsd} por oyente nuevo.`;
    if (peor && peor.id !== mejor.id && peor.costoPorOyenteBajoUsd > 0) {
      const veces = r2(peor.costoPorOyenteBajoUsd / Math.max(mejor.costoPorOyenteBajoUsd, 0.001));
      if (veces >= 1.5) {
        titular += ` La más cara —${peor.canalLabel} en ${peor.plaza}— sale ${veces}× eso mismo.`;
      }
    }
  }

  if (bloqueadas.length) {
    avisos.push(
      `${bloqueadas.length} ruta(s) quedaron fuera por el mínimo de campaña de la plataforma, no por rendimiento.`
    );
  }

  return {
    rutas: [...ejecutables, ...bloqueadas],
    titular,
    descartadas,
    enCola,
    avisos,
    fanRatePct,
    fanRateNivel,
    paraCalibrar,
  };
}

export const ADVERTENCIA_LANZAMIENTO =
  "Esto es una estimación con coeficientes públicos, no una proyección de resultados. Cada escalón lleva su fuente y su nivel, y el conjunto vale lo que valga su eslabón más débil. Sirve para dimensionar y para poder volver en 30 días a preguntar qué falló; no para comprometer una cifra con nadie.";

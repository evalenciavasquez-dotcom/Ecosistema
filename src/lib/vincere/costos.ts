// Cuánto cuesta pautar, en dólares.
//
// Esta tabla existe para poder decirle a un cliente "esto vale entre X e Y"
// con algo detrás, en vez de una cifra improvisada en una reunión. Pero es una
// REFERENCIA PÚBLICA, no un presupuesto: el CPM real se fija en una subasta y
// se mueve por temporada, segmentación, formato y competencia.
//
// Por eso cada rango va con su fuente y su fecha de consulta, la horquilla se
// muestra completa (nunca un solo número), y cualquier costo real que Eduardo
// cargue tiene prioridad sobre esto. Una cifra inventada presentada como dato
// es exactamente el humo que este sistema existe para no vender.
//
// El hallazgo que más cambia una decisión: en Colombia un CPM de YouTube está
// alrededor de US$1,20-2,50 y uno de Spotify Ad Studio arranca en US$15. No es
// una diferencia de matiz — es un orden de magnitud, y decide por dónde entra
// un lanzamiento con presupuesto chico.

export type Plataforma = "youtube" | "meta" | "spotify";

export const PLATAFORMA_LABEL: Record<Plataforma, string> = {
  youtube: "YouTube Ads",
  meta: "Meta (Instagram / Facebook)",
  spotify: "Spotify Ad Studio",
};

export interface RangoCosto {
  plataforma: Plataforma;
  // País tal como se escribe en las zonas de calor. 'global' es el respaldo
  // cuando no hay dato del país concreto.
  region: string;
  cpmBajoUsd: number;
  cpmAltoUsd: number;
  // Presupuesto mínimo que exige la plataforma, si lo tiene.
  minimoUsd?: number;
  fuente: string;
  url: string;
  consultadoEn: string;
  nota?: string;
}

const CONSULTA = "2026-08-02";

// Rangos de referencia. Se guardan por país donde hay dato específico, porque
// la diferencia entre regiones es mucho mayor que entre plataformas.
export const REFERENCIAS: RangoCosto[] = [
  {
    plataforma: "youtube",
    region: "Colombia",
    cpmBajoUsd: 1.2,
    cpmAltoUsd: 2.5,
    fuente: "Fluxnote — YouTube CPM Latinoamérica por país",
    url: "https://fluxnote.io/guides/youtube-cpm-latin-america-by-country",
    consultadoEn: CONSULTA,
    nota: "Contenido general. El nicho de música suele ir en la parte baja del rango.",
  },
  {
    plataforma: "youtube",
    region: "México",
    cpmBajoUsd: 1.2,
    cpmAltoUsd: 2.5,
    fuente: "Fluxnote — YouTube CPM Latinoamérica por país",
    url: "https://fluxnote.io/guides/youtube-cpm-latin-america-by-country",
    consultadoEn: CONSULTA,
  },
  {
    plataforma: "youtube",
    region: "global",
    cpmBajoUsd: 1.4,
    cpmAltoUsd: 9.3,
    fuente: "Megadigital / Shno — benchmarks de YouTube Ads 2026",
    url: "https://megadigital.ai/en/blog/youtube-ad-benchmarks/",
    consultadoEn: CONSULTA,
    nota: "El nicho de música promedia US$1,36 de CPM, muy por debajo del promedio general de la plataforma. La horquilla ancha es real: va de US$1 a US$23 según país, formato y temporada.",
  },
  {
    plataforma: "meta",
    region: "Colombia",
    cpmBajoUsd: 1.36,
    cpmAltoUsd: 2.0,
    fuente: "Superads / Lebesgue — CPM de Meta por país",
    url: "https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/colombia",
    consultadoEn: CONSULTA,
    nota: "Entre los CPM más bajos del mundo. Estados Unidos está entre US$16 y US$23 — de 4 a 8 veces más caro.",
  },
  {
    plataforma: "meta",
    region: "México",
    cpmBajoUsd: 3.0,
    cpmAltoUsd: 3.92,
    fuente: "Adamigo — benchmarks de Meta Ads por país 2026",
    url: "https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026",
    consultadoEn: CONSULTA,
  },
  {
    plataforma: "meta",
    region: "Estados Unidos",
    cpmBajoUsd: 16.0,
    cpmAltoUsd: 23.0,
    fuente: "Novoads / Adamigo — costos de Meta Ads 2026",
    url: "https://novoads.ai/en/blog/how-much-does-meta-ads-cost",
    consultadoEn: CONSULTA,
  },
  {
    plataforma: "meta",
    region: "global",
    cpmBajoUsd: 2.0,
    cpmAltoUsd: 16.1,
    fuente: "Novoads — costos de Meta Ads 2026",
    url: "https://novoads.ai/en/blog/how-much-does-meta-ads-cost",
    consultadoEn: CONSULTA,
    nota: "El rango cubre desde LATAM hasta Estados Unidos: la región pesa más que cualquier otra variable.",
  },
  {
    plataforma: "spotify",
    region: "global",
    cpmBajoUsd: 10.0,
    cpmAltoUsd: 30.0,
    minimoUsd: 250,
    fuente: "Crazysound / Digimau — costos de Spotify Ad Studio 2026",
    url: "https://crazysound.ai/guides/spotify-ad-cost",
    consultadoEn: CONSULTA,
    nota: "Audio US$15-30, video US$10-25, display US$5-15. No hay tarifa publicada por país de LATAM. Exige mínimo de campaña, así que no sirve para presupuestos chicos.",
  },
];

export function referenciaDe(plataforma: Plataforma, pais: string | null): RangoCosto {
  if (pais) {
    const exacta = REFERENCIAS.find(
      (r) => r.plataforma === plataforma && r.region.toLocaleLowerCase("es") === pais.trim().toLocaleLowerCase("es")
    );
    if (exacta) return exacta;
  }
  return REFERENCIAS.find((r) => r.plataforma === plataforma && r.region === "global")!;
}

export interface EstimacionCampana {
  plataforma: Plataforma;
  region: string;
  impresiones: number;
  bajoUsd: number;
  altoUsd: number;
  minimoUsd?: number;
  // Cuando el mínimo de la plataforma supera lo que costaría la campaña, el
  // presupuesto real es el mínimo. Es la diferencia entre un cálculo y algo
  // que se puede ejecutar.
  porElMinimo: boolean;
  fuente: string;
  url: string;
  consultadoEn: string;
  nota?: string;
}

export function estimarCampana(
  plataforma: Plataforma,
  pais: string | null,
  impresiones: number
): EstimacionCampana {
  const r = referenciaDe(plataforma, pais);
  const miles = impresiones / 1000;
  const bajo = Math.round(miles * r.cpmBajoUsd);
  const alto = Math.round(miles * r.cpmAltoUsd);
  const porElMinimo = !!r.minimoUsd && r.minimoUsd > bajo;
  return {
    plataforma,
    region: r.region,
    impresiones,
    bajoUsd: porElMinimo ? r.minimoUsd! : bajo,
    altoUsd: Math.max(alto, porElMinimo ? r.minimoUsd! : alto),
    minimoUsd: r.minimoUsd,
    porElMinimo,
    fuente: r.fuente,
    url: r.url,
    consultadoEn: r.consultadoEn,
    nota: r.nota,
  };
}

// Qué plataforma rinde más por dólar en esa plaza, de más barata a más cara.
// Es una comparación de precio por impresión, no de calidad de audiencia: un
// oyente de Spotify vale más que una impresión de video vista tres segundos,
// y eso lo decide el criterio, no la tabla.
export function plataformasPorCosto(pais: string | null): RangoCosto[] {
  const todas: Plataforma[] = ["youtube", "meta", "spotify"];
  return todas
    .map((pl) => referenciaDe(pl, pais))
    .sort((a, b) => (a.cpmBajoUsd + a.cpmAltoUsd) / 2 - (b.cpmBajoUsd + b.cpmAltoUsd) / 2);
}

export const ADVERTENCIA_COSTOS =
  "Rangos de referencia pública consultados en agosto de 2026, no cotizaciones. El CPM real se fija en subasta y se mueve por temporada, formato, segmentación y competencia. Sirven para dimensionar un presupuesto en una conversación, nunca para comprometer una cifra.";

export function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}%`;
}

// Un entero largo, legible: 795.444 y no 795444.
//
// Parece cosmético y no lo es. Una cifra de seis dígitos sin separadores
// obliga a contar posiciones con el dedo para saber si son setecientos mil o
// setenta y nueve millones, y ese medio segundo repetido veinte veces por
// pantalla es literalmente por qué una tabla de datos "da pereza".
export function formatNumero(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const decimales = Number.isInteger(n) ? 0 : Math.abs(n) < 10 ? 1 : 0;
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

// ¿Esta meta dice algo?
//
// "Chartmetric Artist Rank · 795.444 de 795.444" es lo que sale cuando el
// indicador no traía meta y quien lo leyó la rellenó copiando el valor actual.
// Mostrado así, TODOS los indicadores de una lectura se ven cumplidos al 100%
// y ninguno informa nada. Una meta que es igual al valor —o que es cero— no es
// una meta: es un hueco, y se calla en vez de fingir.
export function metaSignificativa(actual: number, meta: number | null | undefined): boolean {
  return typeof meta === "number" && Number.isFinite(meta) && meta > 0 && meta !== actual;
}

// El valor de un indicador tal como se lee: cifra agrupada y su unidad pegada
// cuando es un símbolo (%, M, K) o separada cuando es una palabra.
export function valorConUnidad(valor: number, unidad?: string | null): string {
  const cifra = formatNumero(valor);
  const u = (unidad ?? "").trim();
  if (!u) return cifra;
  return u.length <= 2 ? `${cifra}${u}` : `${cifra} ${u}`;
}

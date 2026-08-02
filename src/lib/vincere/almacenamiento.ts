// Cuánto espacio queda en el navegador, y qué lo está ocupando.
//
// El navegador da alrededor de 5 MB por sitio y no avisa cuando se acaba:
// simplemente lanza un error al guardar. Zustand no lo captura, así que la
// app sigue funcionando normal —se ve todo, se edita todo— y nada se guarda.
// Al recargar, el trabajo del día no está.
//
// Ese es el peor modo de falla posible de esta plataforma, porque no se nota
// hasta que ya perdiste algo. Por eso se mide y se avisa antes.

export const LIMITE_APROX_BYTES = 5 * 1024 * 1024;

export interface UsoAlmacenamiento {
  bytes: number;
  pct: number;
  // Qué está pesando, de mayor a menor, para saber qué borrar si hace falta.
  porClave: { clave: string; bytes: number }[];
  estado: "holgado" | "atento" | "critico";
}

function pesar(valor: string, clave: string): number {
  // El navegador guarda en UTF-16: dos bytes por unidad de código. Contar
  // caracteres subestimaría el uso casi a la mitad.
  return (valor.length + clave.length) * 2;
}

export function medirAlmacenamiento(): UsoAlmacenamiento | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const porClave: { clave: string; bytes: number }[] = [];
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      if (!clave) continue;
      const valor = localStorage.getItem(clave) ?? "";
      const b = pesar(valor, clave);
      bytes += b;
      porClave.push({ clave, bytes: b });
    }
    porClave.sort((a, b) => b.bytes - a.bytes);
    const pct = Math.min(100, Math.round((bytes / LIMITE_APROX_BYTES) * 100));
    return {
      bytes,
      pct,
      porClave,
      estado: pct >= 85 ? "critico" : pct >= 60 ? "atento" : "holgado",
    };
  } catch {
    return null;
  }
}

export function formatearBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// Nombres legibles para las claves técnicas del navegador.
export function nombreDeClave(clave: string): string {
  if (clave === "vincere-storage") return "VINCERE — artistas, análisis e informes";
  if (clave.startsWith("cco")) return "C.C.O. — proyectos, personas y decisiones";
  if (clave === "cuartel-storage") return "El Cuartel — decisiones y rutas";
  return clave;
}

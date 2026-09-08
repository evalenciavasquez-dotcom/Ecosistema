// El respaldo que se baja solo cuando borras.
//
// Borrar un artista disparaba un DELETE real contra la fila de la base, sin
// papelera y sin deshacer. La app decía «si quieres guardar algo antes, sal a
// C.C.O. → Configuración → Exportar» — o sea, mandaba a hacer un trámite en
// otra pantalla justo en el segundo en que alguien ya decidió borrar. Nadie
// hace eso, y por eso no sirve como red.
//
// Acá el respaldo no se pide: se entrega. El archivo cae en Descargas en el
// mismo gesto del borrado, sin preguntar nada.

import { VincereProyecto } from "./types";

export interface Respaldo {
  formato: "vincere-proyecto";
  version: 1;
  exportadoEn: string;
  proyecto: VincereProyecto;
}

export function respaldoDeProyecto(p: VincereProyecto): Respaldo {
  return {
    formato: "vincere-proyecto",
    version: 1,
    exportadoEn: new Date().toISOString(),
    // El documento entero, tal como vive en el store. Elegir campos sería
    // decidir hoy qué va a importar dentro de un año.
    proyecto: p,
  };
}

// «TORTTURA» → «torttura». Sin acentos ni signos: este nombre termina siendo
// un archivo en el disco de alguien.
function comoArchivo(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpio || "proyecto";
}

export function nombreDelRespaldo(p: VincereProyecto): string {
  return `vincere-${comoArchivo(p.nombre)}-${new Date().toISOString().slice(0, 10)}.json`;
}

// Devuelve si el archivo llegó a salir. Un respaldo que falla en silencio es
// peor que no tenerlo: quien borra se queda creyendo que tiene copia.
export function descargarRespaldo(p: VincereProyecto): boolean {
  if (typeof window === "undefined") return false;
  try {
    const blob = new Blob([JSON.stringify(respaldoDeProyecto(p), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreDelRespaldo(p);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // El objeto se libera después: revocarlo en el mismo tic corta la descarga
    // en algunos navegadores antes de que llegue a empezar.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

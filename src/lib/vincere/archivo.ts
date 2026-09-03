// Leer un archivo del disco a base64, que es la forma en que viaja a la API.
//
// Estaba copiado en Ingesta y en Triage. Ahora que las dos pantallas son la
// misma puerta, tener dos copias de la función que abre el sobre era pedir que
// una se arreglara y la otra no.

export interface ArchivoLeido {
  data: string;
  mediaType: string;
}

// ---------------------------------------------------------------------------
// Un CSV no es un archivo que haya que rechazar: es texto
// ---------------------------------------------------------------------------
//
// La API acepta imágenes y PDF, y para lo demás decía «pega el contenido como
// texto». Pero la zona de soltar aceptaba CUALQUIER archivo —el atributo
// `accept` solo filtra al hacer clic, no al arrastrar—, así que soltar un CSV
// mostraba su nombre como si estuviera cargado y el error llegaba después de
// mandarlo al servidor. Eduardo preguntó justo eso: si procesa CSV.
//
// La respuesta correcta no es un mensaje de error más claro. Un CSV, un TSV o
// un JSON son texto, y el navegador puede leerlos sin ayuda de nadie: se
// vuelcan al cuadro de pegar, que es la vía que ya funcionaba. El usuario
// suelta el archivo y el sistema hace lo que el usuario iba a hacer a mano.

const EXT_TEXTO = [".csv", ".tsv", ".txt", ".json", ".md", ".tab", ".log"];

// Un tope para lo que se manda a leer. No es una restricción técnica: un CSV
// de más de esto son decenas de miles de filas, muy por encima del catálogo de
// cualquier artista, y mandarlo entero cuesta plata sin mejorar la lectura. Se
// corta y se DICE que se cortó, en vez de perder filas en silencio.
export const TOPE_TEXTO = 100_000;

export type ClaseDeArchivo = "texto" | "imagen" | "pdf" | "noSoportado";

export function claseDeArchivo(file: File): ClaseDeArchivo {
  const nombre = file.name.toLowerCase();
  // Por extensión además de por tipo: Windows reporta un .csv como
  // application/vnd.ms-excel, y a veces el tipo llega vacío.
  if (EXT_TEXTO.some((e) => nombre.endsWith(e))) return "texto";
  if (file.type.startsWith("text/")) return "texto";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "imagen";
  return "noSoportado";
}

export interface TextoLeido {
  texto: string;
  cortado: boolean;
}

export async function leerComoTexto(file: File): Promise<TextoLeido> {
  const crudo = await file.text();
  return {
    texto: crudo.slice(0, TOPE_TEXTO),
    cortado: crudo.length > TOPE_TEXTO,
  };
}

export function leerArchivo(file: File): Promise<ArchivoLeido> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      // readAsDataURL devuelve "data:tipo;base64,XXXX": lo que la API quiere es
      // lo de después de la coma.
      resolve({
        data: result.includes(",") ? result.slice(result.indexOf(",") + 1) : result,
        mediaType: file.type,
      });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

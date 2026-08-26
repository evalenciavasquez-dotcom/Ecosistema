// Leer un archivo del disco a base64, que es la forma en que viaja a la API.
//
// Estaba copiado en Ingesta y en Triage. Ahora que las dos pantallas son la
// misma puerta, tener dos copias de la función que abre el sobre era pedir que
// una se arreglara y la otra no.

export interface ArchivoLeido {
  data: string;
  mediaType: string;
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

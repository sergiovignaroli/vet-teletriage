import { BadRequestException } from "@nestjs/common";

// La foto de perfil del veterinario llega como data URI ya recortada y
// comprimida por el navegador (unos 20-40 KB). Acá se revalida todo: nunca se
// confía en lo que dice el front (tipo, tamaño o contenido).
const MAX_CARACTERES = 90_000; // por debajo del límite de 100 KB del cuerpo JSON
const MAX_BYTES = 65_000;

export interface FotoDecodificada {
  mime: "image/jpeg" | "image/png" | "image/webp";
  buffer: Buffer;
}

export function decodificarFoto(dataUri: string): FotoDecodificada {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!m || dataUri.length > MAX_CARACTERES) {
    throw new BadRequestException("La foto no es válida o es demasiado pesada. Probá con otra.");
  }
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new BadRequestException("La foto es demasiado pesada. Probá con otra.");
  }
  const mime = m[1] as FotoDecodificada["mime"];
  const firmaOk =
    (mime === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mime === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mime === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!firmaOk) throw new BadRequestException("El archivo no es una imagen válida.");
  return { mime, buffer };
}

// Ruta relativa de la imagen pública de un veterinario (con versión para que el
// navegador la renueve cuando cambia).
export function urlFoto(id: string, actualizadaEl: Date | null, tiene: boolean): string | null {
  return tiene ? `/veterinarios/${id}/foto?v=${actualizadaEl ? actualizadaEl.getTime() : 0}` : null;
}

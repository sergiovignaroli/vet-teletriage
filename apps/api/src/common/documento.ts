import { BadRequestException } from "@nestjs/common";

// Documentación del veterinario (identidad, título, matrícula/habilitación).
// Llega como data URI de una imagen que el navegador ya redujo (lado mayor
// ~1600 px, JPEG): se lee bien y pesa unos 200-500 KB. Acá se revalida todo:
// nunca se confía en lo que dice el front (tipo, tamaño o contenido).
const MAX_CARACTERES = 1_300_000; // por debajo del límite de 2 MB del cuerpo JSON de esa ruta
const MAX_BYTES = 950_000;

export const TIPOS_DOCUMENTO = ["DOCUMENTO_FRENTE", "DOCUMENTO_DORSO", "TITULO", "HABILITACION"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
// Los que hacen falta para revisar a una persona (el dorso es opcional: el pasaporte no tiene).
export const TIPOS_DOCUMENTO_OBLIGATORIOS: TipoDocumento[] = ["DOCUMENTO_FRENTE", "TITULO", "HABILITACION"];

export function tipoDocumentoValido(valor: unknown): TipoDocumento {
  if (typeof valor !== "string" || !(TIPOS_DOCUMENTO as readonly string[]).includes(valor)) {
    throw new BadRequestException("Tipo de documento no válido");
  }
  return valor as TipoDocumento;
}

export function validarDocumento(dataUri: unknown): string {
  if (typeof dataUri !== "string") throw new BadRequestException("Elegí una imagen del documento");
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!m || dataUri.length > MAX_CARACTERES) {
    throw new BadRequestException("La imagen no es válida o es demasiado pesada. Probá con otra foto.");
  }
  const buffer = Buffer.from(m[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new BadRequestException("La imagen es demasiado pesada. Probá con otra foto.");
  }
  const mime = m[1];
  const firmaOk =
    (mime === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mime === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mime === "image/webp" && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP");
  if (!firmaOk) throw new BadRequestException("El archivo no es una imagen válida.");
  return dataUri;
}

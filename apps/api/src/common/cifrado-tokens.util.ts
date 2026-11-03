// Cifrado en reposo de los tokens de Mercado Pago de cada veterinario
// (hallazgo H-02 del libro legal, 2026-11-03: se guardaban en texto plano, así
// que una filtración de la base permitía operar la cuenta de cobro de cada
// veterinario).
//
// AES-256-GCM con una clave que vive FUERA de la base de datos
// (TOKEN_ENCRYPTION_KEY: 32 bytes en base64 o 64 caracteres hexadecimales).
// El valor guardado lleva un prefijo con la versión ("enc:v1:") para poder
// distinguir lo ya cifrado de lo que se guardó antes en texto plano: lo viejo
// se sigue leyendo (no se rompe a nadie) y se cifra en el próximo refresco del
// token. Si la clave no está configurada, NO se rompe el cobro: se guarda como
// antes y se avisa en el log (hay que configurar la variable en el hosting).
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIJO = "enc:v1:";

function clave(): Buffer | null {
  const bruta = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!bruta) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(bruta) ? Buffer.from(bruta, "hex") : Buffer.from(bruta, "base64");
  return buf.length === 32 ? buf : null;
}

let avisado = false;

export function cifrarToken(valor: string | null | undefined): string | null {
  if (valor == null || valor === "") return valor ?? null;
  if (valor.startsWith(PREFIJO)) return valor;
  const k = clave();
  if (!k) {
    if (!avisado) {
      avisado = true;
      console.warn(
        "TOKEN_ENCRYPTION_KEY no está configurada (o no mide 32 bytes): los tokens de Mercado Pago se guardan SIN cifrar.",
      );
    }
    return valor;
  }
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", k, iv);
  const datos = Buffer.concat([cifrador.update(valor, "utf8"), cifrador.final()]);
  const tag = cifrador.getAuthTag();
  return PREFIJO + [iv, tag, datos].map((b) => b.toString("base64")).join(":");
}

export function descifrarToken(valor: string | null | undefined): string | null {
  if (valor == null || valor === "") return valor ?? null;
  if (!valor.startsWith(PREFIJO)) return valor; // guardado antes del cifrado
  const k = clave();
  if (!k) throw new Error("Hay tokens cifrados pero falta TOKEN_ENCRYPTION_KEY");
  const [iv, tag, datos] = valor.slice(PREFIJO.length).split(":").map((p) => Buffer.from(p, "base64"));
  const descifrador = createDecipheriv("aes-256-gcm", k, iv);
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}

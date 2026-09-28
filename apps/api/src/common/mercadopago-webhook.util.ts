import { createHmac, timingSafeEqual } from "crypto";

// Verificación de firma del webhook de Mercado Pago (split de pagos).
// Formato oficial del manifest: "id:{data.id en minúsculas};request-id:{x-request-id};ts:{ts};"
// firmado con HMAC-SHA256 usando el secreto de la app, comparado en tiempo
// constante para no filtrar información por timing attack.
// Fuente: documentación de Mercado Pago Developers, sección Webhooks.

interface VerificarFirmaInput {
  xSignatureHeader: string; // ej: "ts=1704908010,v1=618c8534..."
  xRequestId: string;
  dataId: string;
  secret: string;
}

export function verificarFirmaMercadoPago({
  xSignatureHeader,
  xRequestId,
  dataId,
  secret,
}: VerificarFirmaInput): boolean {
  if (!xSignatureHeader || !xRequestId || !dataId || !secret) return false;

  const partes = Object.fromEntries(
    xSignatureHeader.split(",").map((par) => {
      const [clave, valor] = par.split("=");
      return [clave?.trim(), valor?.trim()];
    }),
  );

  const ts = partes["ts"];
  const v1Recibido = partes["v1"];
  if (!ts || !v1Recibido) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const v1Esperado = createHmac("sha256", secret).update(manifest).digest("hex");

  const bufEsperado = Buffer.from(v1Esperado);
  const bufRecibido = Buffer.from(v1Recibido);

  return bufEsperado.length === bufRecibido.length && timingSafeEqual(bufEsperado, bufRecibido);
}

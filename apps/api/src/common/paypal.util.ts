// PayPal — "Payouts, dos pasos" (Sergio, 2026-09-30, ver doc de
// proveedores): a diferencia de Mercado Pago (split automático, cada
// veterinario cobra con SU cuenta), acá la plataforma cobra el total con
// SU PROPIA cuenta de PayPal (Orders v2, este archivo) y recién le paga al
// veterinario, aparte, con la API de Payouts, al cerrar el caso con éxito
// (ver PagosService.liquidarSegunCierre). Elegido por sobre el modelo
// "Marketplace" (Partner Referrals + platform_fees) porque ese requiere
// aprobación previa de PayPal para la cuenta de plataforma — esto no, se
// puede prender apenas Sergio cargue las credenciales.
//
// [Seguro] Verificado contra la documentación oficial de PayPal Developer
// (developer.paypal.com), 2026-09-30:
// - Orders v2 (crear / capturar): https://developer.paypal.com/docs/api/orders/v2/
// - Payouts: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
// - Refunds: https://developer.paypal.com/docs/api/payments/v2/#captures_refund
// - Verificación de firma de webhook: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post
// - Monedas soportadas (ARS NO está en la lista — de ahí que esto cobre en
//   USD, precio fijo, no una conversión del precio en pesos):
//   https://developer.paypal.com/reports/reference/supported-currencies
//
// [Probable] — NO verificado contra una cuenta sandbox real (no hay
// credenciales de PayPal cargadas en este entorno): (1) la forma exacta en
// que PayPal arma el `resource` del webhook PAYMENT.CAPTURE.COMPLETED —
// acá se asume que `custom_id` (seteado al crear la orden, ver
// crearOrdenPayPal) viaja intacto hasta ese evento, tal cual documenta la
// referencia de Orders v2; (2) que un batch de Payouts con un solo item
// resuelve sincrónicamente lo bastante rápido como para leer
// `payout_item_id` de la respuesta inmediata del POST, sin tener que
// hacer polling aparte. Antes de mandar plata real, probar contra el
// sandbox real de PayPal.

const PAYPAL_API_BASE_URL = process.env.PAYPAL_API_BASE_URL || "https://api-m.paypal.com";

function requerirEnvPayPal(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} no configurado en .env`);
  return valor;
}

// -----------------------------------------------------------------------
// Autenticación — client_credentials, con las credenciales PROPIAS de la
// plataforma (nunca las del veterinario ni las del cliente: acá no hay
// OAuth de terceros, a diferencia de Mercado Pago).
// -----------------------------------------------------------------------
let tokenCacheado: { accessToken: string; venceEl: number } | null = null;

export async function obtenerAccessTokenPayPal(): Promise<string> {
  // Cacheado en memoria del proceso — evita pedir un token nuevo en cada
  // llamada (PayPal los emite con ~9hs de vigencia). Margen de 60s para no
  // usar uno que venza en el medio de la llamada siguiente.
  if (tokenCacheado && tokenCacheado.venceEl - Date.now() > 60_000) {
    return tokenCacheado.accessToken;
  }

  const clientId = requerirEnvPayPal("PAYPAL_CLIENT_ID");
  const clientSecret = requerirEnvPayPal("PAYPAL_CLIENT_SECRET");
  const credenciales = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credenciales}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`PayPal (oauth2/token) respondió ${respuesta.status}: ${detalle}`);
  }
  const datos = (await respuesta.json()) as { access_token: string; expires_in: number };
  tokenCacheado = { accessToken: datos.access_token, venceEl: Date.now() + datos.expires_in * 1000 };
  return datos.access_token;
}

// -----------------------------------------------------------------------
// Orders v2 — cobro del TOTAL a la cuenta propia de la plataforma.
// -----------------------------------------------------------------------
export interface CrearOrdenPayPalInput {
  casoId: string;
  montoTotalUsd: number;
  urlRetorno: string; // a dónde PayPal redirige tras la aprobación del cliente
  urlCancelacion: string;
}

export interface OrdenPayPal {
  id: string;
  urlAprobacion: string; // link "approve" — a este se redirige el navegador del cliente
}

export async function crearOrdenPayPal(input: CrearOrdenPayPalInput): Promise<OrdenPayPal> {
  const accessToken = await obtenerAccessTokenPayPal();
  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          // reference_id Y custom_id con el mismo valor a propósito: el
          // primero es el campo "estándar" de PayPal para correlacionar,
          // el segundo es el que efectivamente viaja hasta el webhook de
          // captura (ver nota [Probable] arriba) — no cuesta nada mandar
          // los dos.
          reference_id: input.casoId,
          custom_id: input.casoId,
          description: "Asesoramiento veterinario online — Videollamada Animal",
          amount: {
            currency_code: "USD",
            value: input.montoTotalUsd.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: input.urlRetorno,
        cancel_url: input.urlCancelacion,
        // El cliente ve el cargo con este nombre en su resumen de PayPal —
        // sin esto, PayPal muestra el nombre de la cuenta de plataforma a
        // secas, que puede no decirle nada al cliente.
        brand_name: "Videollamada Animal",
        user_action: "PAY_NOW",
      },
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`PayPal (crear orden) respondió ${respuesta.status}: ${detalle}`);
  }
  const datos = (await respuesta.json()) as { id: string; links: Array<{ rel: string; href: string }> };
  const linkAprobacion = datos.links.find((l) => l.rel === "approve")?.href;
  if (!linkAprobacion) throw new Error("PayPal no devolvió un link de aprobación para la orden creada");
  return { id: datos.id, urlAprobacion: linkAprobacion };
}

export interface CapturaPayPal {
  captureId: string;
  status: string; // "COMPLETED" | "DECLINED" | "PENDING" | ...
}

export async function capturarOrdenPayPal(orderId: string): Promise<CapturaPayPal> {
  const accessToken = await obtenerAccessTokenPayPal();
  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`PayPal (capturar orden) respondió ${respuesta.status}: ${detalle}`);
  }
  const datos = (await respuesta.json()) as {
    status: string;
    purchase_units: Array<{ payments: { captures: Array<{ id: string; status: string }> } }>;
  };
  const captura = datos.purchase_units?.[0]?.payments?.captures?.[0];
  if (!captura) throw new Error("PayPal no devolvió una captura al confirmar el pago");
  return { captureId: captura.id, status: captura.status };
}

// Reembolso puntual sobre una CAPTURA (no sobre la orden) — total o
// parcial según `montoUsd`. A diferencia de Mercado Pago con split, acá NO
// hay reparto proporcional que gestionar: la plataforma cobró el total a
// SU PROPIA cuenta, así que un reembolso de acá no toca ningún payout ya
// mandado al veterinario (ver el comentario grande en
// PagosService.liquidarSegunCierre sobre por qué esto es más simple que
// Mercado Pago).
export async function reembolsarCapturaPayPal(
  captureId: string,
  montoUsd: number,
): Promise<{ id: string; status: string }> {
  const accessToken = await obtenerAccessTokenPayPal();
  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      amount: { value: montoUsd.toFixed(2), currency_code: "USD" },
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`PayPal (reembolsar captura) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

// -----------------------------------------------------------------------
// Payouts — el SEGUNDO paso: la plataforma le paga al veterinario, a su
// dirección de PayPal, recién al cerrar el caso con éxito.
// -----------------------------------------------------------------------
export interface EnviarPayoutPayPalInput {
  emailDestino: string;
  montoUsd: number;
  casoId: string;
}

export async function enviarPayoutPayPal(input: EnviarPayoutPayPalInput): Promise<{ payoutItemId: string }> {
  const accessToken = await obtenerAccessTokenPayPal();
  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sender_batch_header: {
        // Único por caso — si esta llamada se reintenta con el mismo id,
        // PayPal la trata como el mismo batch (idempotencia de su lado),
        // en vez de mandar la plata dos veces.
        sender_batch_id: `honorario-${input.casoId}`,
        email_subject: "Pago de tu honorario — Videollamada Animal",
        email_message: "Se acreditó el honorario de un asesoramiento que atendiste por Videollamada Animal.",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: { value: input.montoUsd.toFixed(2), currency: "USD" },
          receiver: input.emailDestino,
          sender_item_id: input.casoId,
          note: "Honorario por asesoramiento veterinario online",
        },
      ],
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`PayPal (payout) respondió ${respuesta.status}: ${detalle}`);
  }
  const datos = (await respuesta.json()) as {
    items?: Array<{ payout_item_id: string }>;
    batch_header: { payout_batch_id: string };
  };
  // [Probable, ver nota arriba]: con un solo item, se asume que la
  // respuesta síncrona ya trae su payout_item_id — si PayPal lo devuelve
  // vacío (procesamiento asíncrono puro), cae al id del batch como
  // referencia mínima para poder rastrearlo a mano.
  const payoutItemId = datos.items?.[0]?.payout_item_id ?? datos.batch_header.payout_batch_id;
  return { payoutItemId };
}

// -----------------------------------------------------------------------
// Verificación de firma de webhook — vía la API oficial de PayPal
// (POST /v1/notifications/verify-webhook-signature), no un cálculo local
// de HMAC. Evita tener que configurar acceso al body crudo en Nest (que si
// pidiera, sería un cambio más invasivo) — se le manda a PayPal el body ya
// parseado, tal cual la documentación oficial permite.
// -----------------------------------------------------------------------
export interface CabecerasWebhookPayPal {
  "paypal-transmission-id"?: string;
  "paypal-transmission-time"?: string;
  "paypal-cert-url"?: string;
  "paypal-auth-algo"?: string;
  "paypal-transmission-sig"?: string;
}

export async function verificarFirmaWebhookPayPal(
  cabeceras: CabecerasWebhookPayPal,
  cuerpoEvento: unknown,
  webhookId: string,
): Promise<boolean> {
  if (
    !cabeceras["paypal-transmission-id"] ||
    !cabeceras["paypal-transmission-time"] ||
    !cabeceras["paypal-cert-url"] ||
    !cabeceras["paypal-auth-algo"] ||
    !cabeceras["paypal-transmission-sig"] ||
    !webhookId
  ) {
    return false;
  }
  const accessToken = await obtenerAccessTokenPayPal();
  const respuesta = await fetch(`${PAYPAL_API_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      transmission_id: cabeceras["paypal-transmission-id"],
      transmission_time: cabeceras["paypal-transmission-time"],
      cert_url: cabeceras["paypal-cert-url"],
      auth_algo: cabeceras["paypal-auth-algo"],
      transmission_sig: cabeceras["paypal-transmission-sig"],
      webhook_id: webhookId,
      webhook_event: cuerpoEvento,
    }),
  });
  if (!respuesta.ok) return false;
  const datos = (await respuesta.json()) as { verification_status: string };
  return datos.verification_status === "SUCCESS";
}

export { requerirEnvPayPal };

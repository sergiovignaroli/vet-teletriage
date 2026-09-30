// Checkout Pro con split (marketplace_fee) — Sergio, 2026-09-29.
//
// Verificado contra la documentación oficial de Mercado Pago Developers:
// - La preferencia se crea con el access_token del VENDEDOR (el veterinario,
//   obtenido por OAuth — ver mercadopago-oauth.util.ts), NUNCA con el
//   access_token de la plataforma. El campo `marketplace_fee` es lo que la
//   plataforma se queda; el resto lo cobra automáticamente el vendedor, sin
//   que este backend mueva la plata.
//   https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/how-tos/integrate-marketplace
//   https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post
// - [Seguro] Checkout Pro (preferencia hosteada) NO soporta captura
//   diferida (autorizar ahora, capturar después) — esa función es de la
//   Checkout API/Orders API (formulario de pago propio, tokenización de
//   tarjeta, alcance PCI). Por eso el modelo acá es cobro inmediato: se le
//   cobra el total al tutor en el momento de elegir veterinario, no al
//   cerrar la consulta — y lo que corresponda se reembolsa después según la
//   clasificación de cierre (ver CARGO_NO_COMPLETADO en @vet-teletriage/types).
//
// [Seguro, corrección 2026-09-29] — un reembolso sobre un pago con split se
// reparte SIEMPRE de forma proporcional entre vendedor y marketplace, según
// lo que cada uno cobró originalmente — verificado contra la documentación
// oficial:
// https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
// ("the amount due to the final customer will be divided and subtracted
// from the seller's account and the Marketplace's account, in a
// PROPORTIONAL way"). El body del refund es solo {"amount": <número>} — no
// existe ningún campo para pedir "sacale 100% a uno, una porción distinta
// al otro". Esto descarta el diseño anterior de este archivo (dos llamadas
// independientes, una contra cada cuenta, para lograr un reembolso
// asimétrico) — dos llamadas no logran ese resultado, porque cada una
// individualmente ya reparte proporcional entre ambas cuentas.
//
// La consecuencia concreta está en pagos.service.ts (liquidarSegunCierre /
// reembolsarCargoPlataforma): solo se automatiza UNA llamada de reembolso
// parcial cuando el resultado que le importa al tutor (cuánto le vuelve) se
// puede lograr con una sola llamada sin arriesgar de más; el reparto
// interno entre vet y plataforma que quede imperfecto por la
// proporcionalidad se anota para acción manual, nunca se intenta forzar con
// una segunda llamada.
//
// [Probable] — esto sigue sin verificarse contra un pago real (no hay
// credenciales de Mercado Pago cargadas en este entorno, y sandbox no está
// accesible desde acá): (1) qué access_token corresponde usar para leer de
// vuelta el detalle de un pago split desde el webhook — se usa el
// access_token PROPIO de la plataforma (MERCADOPAGO_ACCESS_TOKEN), asumiendo
// que la app marketplace registrada tiene visibilidad sobre los pagos de
// sus vendedores conectados; y (2) que el reembolso parcial automatizado en
// liquidarSegunCierre() se pueda pedir con el access_token del VENDEDOR
// (colector del pago) — si Mercado Pago lo rechaza, probablemente haga
// falta el token de la plataforma en su lugar. Antes de ir a producción con
// plata real, esto se tiene que probar contra el sandbox real de Mercado
// Pago.

const MP_API_URL = "https://api.mercadopago.com";

function requerirEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} no configurado en .env`);
  return valor;
}

export interface PreferenciaMercadoPago {
  id: string;
  init_point: string;
}

export interface CrearPreferenciaInput {
  accessTokenVendedor: string;
  casoId: string;
  montoTotal: number;
  cargoPlataforma: number;
  urlExito: string;
  urlPendiente: string;
  urlFallo: string;
  urlNotificacion: string;
}

// Se llama con el access_token del VETERINARIO elegido (no el de la
// plataforma) — collector_id lo determina Mercado Pago a partir de qué
// cuenta creó la preferencia, no se pasa explícito en el body.
export async function crearPreferenciaDePago(
  input: CrearPreferenciaInput,
): Promise<PreferenciaMercadoPago> {
  const respuesta = await fetch(`${MP_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.accessTokenVendedor}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: input.casoId,
          title: "Asesoramiento veterinario online — Videollamada Animal",
          quantity: 1,
          currency_id: "ARS",
          unit_price: input.montoTotal,
        },
      ],
      external_reference: input.casoId,
      back_urls: {
        success: input.urlExito,
        pending: input.urlPendiente,
        failure: input.urlFallo,
      },
      auto_return: "approved",
      notification_url: input.urlNotificacion,
      marketplace_fee: input.cargoPlataforma,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Mercado Pago (crear preferencia) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

export interface PagoMercadoPago {
  id: number;
  status: string; // "approved" | "pending" | "rejected" | "cancelled" | ...
  external_reference: string | null;
  transaction_amount: number;
}

// Con el access_token PROPIO de la plataforma — ver nota [Probable] arriba.
export async function obtenerPagoMercadoPago(
  paymentId: string,
  accessTokenPlataforma: string,
): Promise<PagoMercadoPago> {
  const respuesta = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessTokenPlataforma}` },
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Mercado Pago (obtener pago) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

// Reembolso (total o parcial, según `monto`) — UNA sola llamada, nunca dos
// para simular un reparto asimétrico (ver nota arriba: el reparto entre
// vendedor y marketplace lo decide Mercado Pago, proporcional, no esta
// llamada).
export async function reembolsarPagoMercadoPago(
  paymentId: string,
  accessToken: string,
  monto: number,
): Promise<{ id: number; status: string }> {
  const respuesta = await fetch(`${MP_API_URL}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ amount: monto }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Mercado Pago (reembolsar) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

export { requerirEnv as requerirEnvMercadoPago };

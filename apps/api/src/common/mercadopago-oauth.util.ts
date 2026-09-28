import { createHmac, timingSafeEqual } from "crypto";

// OAuth de Mercado Pago para el Split de Pagos 1:1 (doc de proveedores):
// cada veterinario conecta SU PROPIA cuenta de Mercado Pago como vendedor;
// la plataforma nunca ve ni guarda su contraseña, solo un access_token +
// refresh_token que Mercado Pago emite. Verificado contra la documentación
// oficial (no solo memoria del modelo):
// https://www.mercadopago.com.ar/developers/es/reference/authentication/oauth/_oauth_token/post

const MP_AUTH_URL = "https://auth.mercadopago.com/authorization";
const MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

export interface TokenMercadoPago {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number; // segundos — default de MP: 15.552.000 (180 días)
  scope: string;
  token_type: string;
}

function requerirEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} no configurado en .env`);
  return valor;
}

// El "state" viaja por el navegador del veterinario (redirect → Mercado
// Pago → redirect de vuelta), así que no es un canal confiable: hay que
// firmarlo para que el callback no acepte un state manipulado que apunte
// a guardar el token en la cuenta de OTRO veterinario.
export function firmarState(veterinarioId: string): string {
  const secret = requerirEnv("JWT_SECRET");
  const firma = createHmac("sha256", secret).update(veterinarioId).digest("hex");
  return Buffer.from(`${veterinarioId}.${firma}`).toString("base64url");
}

export function verificarYExtraerState(state: string): string {
  const secret = requerirEnv("JWT_SECRET");
  const decodificado = Buffer.from(state, "base64url").toString("utf8");
  const [veterinarioId, firmaRecibida] = decodificado.split(".");
  if (!veterinarioId || !firmaRecibida) throw new Error("state inválido");

  const firmaEsperada = createHmac("sha256", secret).update(veterinarioId).digest("hex");
  const bufEsperado = Buffer.from(firmaEsperada);
  const bufRecibido = Buffer.from(firmaRecibida);
  const valido =
    bufEsperado.length === bufRecibido.length && timingSafeEqual(bufEsperado, bufRecibido);

  if (!valido) throw new Error("state con firma inválida — posible manipulación");
  return veterinarioId;
}

export function construirUrlAutorizacionMercadoPago(veterinarioId: string): string {
  const clientId = requerirEnv("MERCADOPAGO_APP_ID");
  const redirectUri = requerirEnv("MERCADOPAGO_OAUTH_REDIRECT_URI");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: redirectUri,
    state: firmarState(veterinarioId),
  });
  return `${MP_AUTH_URL}?${params.toString()}`;
}

export async function intercambiarCodigoPorToken(code: string): Promise<TokenMercadoPago> {
  const clientId = requerirEnv("MERCADOPAGO_APP_ID");
  const clientSecret = requerirEnv("MERCADOPAGO_CLIENT_SECRET");
  const redirectUri = requerirEnv("MERCADOPAGO_OAUTH_REDIRECT_URI");

  const respuesta = await fetch(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Mercado Pago OAuth respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

export async function refrescarTokenMercadoPago(refreshToken: string): Promise<TokenMercadoPago> {
  const clientId = requerirEnv("MERCADOPAGO_APP_ID");
  const clientSecret = requerirEnv("MERCADOPAGO_CLIENT_SECRET");

  const respuesta = await fetch(MP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Mercado Pago OAuth (refresh) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

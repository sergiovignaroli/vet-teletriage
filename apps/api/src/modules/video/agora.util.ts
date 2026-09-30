import { RtcRole, RtcTokenBuilder } from "agora-token";

// Generación de tokens de Agora (Sergio, 2026-09-29: eligió Agora como
// proveedor de video tras el análisis de reliability/costo — ver el PDF de
// flujo). A diferencia del modelo "URL de sala hosteada" de Twilio/Daily/
// Zoom, Agora no entrega un link que se pueda abrir directo: el navegador
// se une a un "canal" con el SDK propio (apps/web, agora-rtc-sdk-ng)
// presentando un token firmado. Ese token SIEMPRE se firma acá, del lado
// del servidor — el App Certificate no puede viajar nunca al navegador,
// porque quien lo tenga puede generarse tokens válidos para cualquier
// canal de la cuenta. Por eso esta pieza es servidor-only y queda fuera de
// ProveedorVideo/crearSala (esa interfaz sigue sirviendo tal cual está
// para el modelo de "URL hosteada" de otros proveedores — ver
// proveedor-video.interface.ts, no se tocó).

const SEGUNDOS_VALIDEZ_TOKEN = 60 * 60 * 4; // 4 h — de sobra para una consulta, no es un token eterno

export class VideoNoConfiguradoError extends Error {
  constructor() {
    super("El proveedor de video todavía no está configurado (faltan las credenciales de Agora)");
  }
}

export interface TokenAgora {
  appId: string;
  token: string;
  uid: number;
  expiraEl: Date;
}

// `canal` = el id del caso, directo — ya es único (UUID) y Agora acepta
// guiones en el nombre de canal (ver límites en la doc de RtcTokenBuilder).
export function generarTokenAgora(canal: string): TokenAgora {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) throw new VideoNoConfiguradoError();

  // uid 0 = "válido para cualquier uid" (convención documentada de Agora):
  // el navegador elige su propio uid al hacer join() y el servidor se lo
  // asigna. Evita tener que inventar acá un uid numérico estable por
  // usuario solo para este token.
  const uid = 0;

  // OJO: tokenExpire/privilegeExpire son segundos relativos A PARTIR DE
  // AHORA, no un timestamp absoluto — pasarle un epoch acá firmaría un
  // token que dura ~2026 años en vez de 4 horas.
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    canal,
    uid,
    RtcRole.PUBLISHER, // los dos lados (cliente y veterinario) publican audio/video
    SEGUNDOS_VALIDEZ_TOKEN,
    SEGUNDOS_VALIDEZ_TOKEN,
  );

  return { appId, token, uid, expiraEl: new Date(Date.now() + SEGUNDOS_VALIDEZ_TOKEN * 1000) };
}

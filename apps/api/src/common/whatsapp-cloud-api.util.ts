// Envío de mensajes vía WhatsApp Cloud API (Meta) — mismo número/esquema que
// ya usa Sergio para "Martín" (n8n + Claude + WhatsApp), pero con el número
// dedicado de la plataforma (WHATSAPP_CLOUD_API_PHONE_NUMBER_ID en .env).
//
// Nota de producción: Meta exige plantillas pre-aprobadas de categoría
// "Authentication" para enviar códigos OTP a un número que no inició la
// conversación en las últimas 24 h (ventana de servicio al cliente). Esta
// función manda texto libre, que funciona mientras el cliente haya escrito
// primero (caso típico acá: pide el código desde la app/web, no por chat) o
// mientras se esté en la ventana de 24 h. Antes de ir a producción con
// volumen, crear y aprobar una plantilla "otp_login" en Meta Business
// Manager y cambiar el payload de "text" a "template" — queda marcado acá
// para no perderlo de vista.
// Fuente: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates

const GRAPH_API_VERSION = "v21.0";

interface EnviarWhatsAppInput {
  telefono: string; // formato E.164 sin "+", ej: "5493411234567"
  texto: string;
}

export async function enviarWhatsApp({ telefono, texto }: EnviarWhatsAppInput): Promise<void> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      "WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_API_PHONE_NUMBER_ID no configurados en .env",
    );
  }

  const respuesta = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: texto },
      }),
    },
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`WhatsApp Cloud API respondió ${respuesta.status}: ${detalle}`);
  }
}

export function normalizarTelefono(telefono: string): string {
  // Deja solo dígitos — WhatsApp Cloud API espera E.164 sin "+", "espacios" ni guiones.
  return telefono.replace(/\D/g, "");
}

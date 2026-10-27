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
// Solo se cambia para pruebas locales contra un servidor de mentira.
const GRAPH_BASE_URL = () => process.env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com";

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
    `${GRAPH_BASE_URL()}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
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

// Mensaje con PLANTILLA aprobada por Meta — la única forma de escribirle a
// alguien que no habló con el número en las últimas 24 h (que es el caso de
// casi todos los avisos de la plataforma). El nombre de la plantilla y sus
// variables tienen que coincidir exactamente con lo aprobado en Meta.
interface EnviarPlantillaInput {
  telefono: string;
  plantilla: string;
  parametrosCuerpo?: string[];
  // Las plantillas de autenticación (códigos) exigen además un botón de
  // "copiar código" cuyo parámetro es el mismo código.
  parametroBotonCodigo?: string;
}

export function whatsappConfigurado(): boolean {
  return !!(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID);
}

export async function enviarWhatsAppPlantilla({
  telefono,
  plantilla,
  parametrosCuerpo = [],
  parametroBotonCodigo,
}: EnviarPlantillaInput): Promise<void> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_CLOUD_API_TOKEN / WHATSAPP_CLOUD_API_PHONE_NUMBER_ID no configurados en .env");
  }

  const components: unknown[] = [];
  if (parametrosCuerpo.length > 0) {
    components.push({ type: "body", parameters: parametrosCuerpo.map((text) => ({ type: "text", text })) });
  }
  if (parametroBotonCodigo) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: parametroBotonCodigo }],
    });
  }

  const respuesta = await fetch(`${GRAPH_BASE_URL()}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "template",
      template: {
        name: plantilla,
        language: { code: process.env.WHATSAPP_PLANTILLA_IDIOMA || "es_AR" },
        ...(components.length > 0 ? { components } : {}),
      },
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`WhatsApp Cloud API respondió ${respuesta.status}: ${detalle}`);
  }
}

export function normalizarTelefono(telefono: string): string {
  // Deja solo dígitos — WhatsApp Cloud API espera E.164 sin "+", "espacios" ni guiones.
  return telefono.replace(/\D/g, "");
}

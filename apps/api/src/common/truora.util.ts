// Integración con la Identity API de Truora (verificación de identidad,
// Sección 6 del contrato: RENAPER + prueba de vida).
//
// [Probable] — a diferencia del webhook de Mercado Pago (verificado contra
// el endpoint oficial línea por línea), esto se armó a partir de un
// resumen de la documentación de Truora (dev.truora.com/guides/verify_identity_api),
// no del JSON crudo de su referencia de API. Los nombres de endpoint y el
// flujo (crear proceso → el cliente sube documentos/selfie por su cuenta o
// vía el SDK de Truora → nosotros consultamos el estado por polling) están
// razonablemente fundados, pero antes de conectar credenciales reales hay
// que confirmar contra https://dev.truora.com/docs/ los nombres exactos de
// los campos de la respuesta (particularmente qué valores puede tomar
// verification_output.status).
//
// Autenticación confirmada contra la doc oficial: header "Truora-API-Key".
// https://dev.truora.com/checks/how-to/authentication/

const TRUORA_IDENTITY_BASE_URL = "https://api.identity.truora.com/v1/processes";

export interface ProcesoTruora {
  process_id: string;
  [key: string]: unknown;
}

export interface EstadoProcesoTruora {
  process_id: string;
  verification_output?: {
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function requerirEnv(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`${nombre} no configurado en .env`);
  return valor;
}

export async function crearProcesoIdentidad(referenciaExterna: string): Promise<ProcesoTruora> {
  const apiKey = requerirEnv("TRUORA_API_KEY");
  const flowId = requerirEnv("TRUORA_FLOW_ID");

  const respuesta = await fetch(`${TRUORA_IDENTITY_BASE_URL}/`, {
    method: "POST",
    headers: {
      "Truora-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flow_id: flowId, external_id: referenciaExterna }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Truora (crear proceso) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

export async function consultarEstadoProcesoIdentidad(processId: string): Promise<EstadoProcesoTruora> {
  const apiKey = requerirEnv("TRUORA_API_KEY");

  const respuesta = await fetch(`${TRUORA_IDENTITY_BASE_URL}/${processId}`, {
    method: "GET",
    headers: { "Truora-API-Key": apiKey },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Truora (consultar estado) respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

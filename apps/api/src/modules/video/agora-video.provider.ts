import { Injectable } from "@nestjs/common";
import type { ProveedorVideo } from "./proveedor-video.interface";

// Proveedor real (Sergio, 2026-09-29: eligió Agora — ver el comparativo de
// proveedores en el chat y el resumen del PDF de flujo). Reemplaza a
// PlaceholderVideoProvider (que se deja en el repo sin usar, por si algún
// día hace falta volver atrás — ver video.module.ts).
//
// Punto importante: Agora NO entrega una "sala" con URL hosteada como
// hubiera hecho Daily/Twilio/Zoom — quien se conecta lo hace con el SDK
// propio, DENTRO de nuestra app (ver agora.util.ts y la pantalla
// apps/web/app/consulta/[casoId]). Por eso `crearSala` acá no habla con
// Agora para nada: solo arma el link a esa pantalla propia. Eso significa
// que esto funciona (devuelve una URL válida) AUNQUE todavía no estén
// cargadas las credenciales AGORA_APP_ID/AGORA_APP_CERTIFICATE en Render —
// recién hacen falta un paso después, cuando esa pantalla pide el token de
// verdad. Activar este provider hoy, antes de cargar esas credenciales, no
// rompe nada: la pantalla de destino ya sabe mostrar "todavía no está
// listo, coordiná por WhatsApp" en vez de romperse.
@Injectable()
export class AgoraVideoProvider implements ProveedorVideo {
  async crearSala(casoId: string): Promise<string | null> {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    return `${webAppUrl}/consulta/${casoId}`;
  }
}

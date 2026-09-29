import { Injectable } from "@nestjs/common";
import type { ProveedorVideo } from "./proveedor-video.interface";

// Implementación de arranque — Sergio (2026-09-29) todavía no eligió
// proveedor real, pendiente de la prueba de carga. Devuelve siempre null:
// el caso pasa a EN_SESION igual (eso no depende del video), pero las
// pantallas muestran "todavía no hay sala conectada" en vez de un link
// roto. Reemplazar por TwilioVideoProvider / DailyVideoProvider /
// ZoomVideoSdkProvider el día que se decida — mismo contrato, cero cambios
// en el resto de la app (ver video.module.ts).
@Injectable()
export class PlaceholderVideoProvider implements ProveedorVideo {
  async crearSala(_casoId: string): Promise<string | null> {
    return null;
  }
}

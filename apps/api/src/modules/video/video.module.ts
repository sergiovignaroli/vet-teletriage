import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { PlaceholderVideoProvider } from "./placeholder-video.provider";
import { PROVEEDOR_VIDEO } from "./proveedor-video.interface";

// Para conectar un proveedor real: cambiar SOLO el `useClass` de acá abajo
// por la implementación real de ProveedorVideo — casos.service.ts y las
// pantallas no se enteran de la diferencia.
@Module({
  providers: [VideoService, { provide: PROVEEDOR_VIDEO, useClass: PlaceholderVideoProvider }],
  exports: [VideoService],
})
export class VideoModule {}

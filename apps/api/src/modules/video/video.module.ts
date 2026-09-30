import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { VideoController } from "./video.controller";
import { AgoraVideoProvider } from "./agora-video.provider";
import { PROVEEDOR_VIDEO } from "./proveedor-video.interface";
import { PrismaService } from "../../prisma.service";

// Proveedor real conectado (Sergio, 2026-09-29: eligió Agora — ver
// agora-video.provider.ts y agora.util.ts). PlaceholderVideoProvider queda
// en el repo sin usar por si hace falta volver atrás. Para cambiar de
// proveedor de nuevo: cambiar SOLO el `useClass` de acá abajo —
// casos.service.ts y las pantallas de "elegir veterinario"/paneles no se
// enteran de la diferencia (VideoController, que sí es específico de
// Agora, es aparte — ver ese archivo).
@Module({
  controllers: [VideoController],
  providers: [VideoService, PrismaService, { provide: PROVEEDOR_VIDEO, useClass: AgoraVideoProvider }],
  exports: [VideoService],
})
export class VideoModule {}

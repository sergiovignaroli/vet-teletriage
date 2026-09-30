import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CasosController } from "./casos.controller";
import { CasosService } from "./casos.service";
import { VideoModule } from "../video/video.module";
import { PagosModule } from "../pagos/pagos.module";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  imports: [VideoModule, PagosModule, ConfiguracionModule],
  controllers: [CasosController],
  providers: [CasosService, PrismaService],
  exports: [CasosService],
})
export class CasosModule {}

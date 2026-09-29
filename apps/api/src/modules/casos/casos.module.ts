import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CasosController } from "./casos.controller";
import { CasosService } from "./casos.service";
import { VideoModule } from "../video/video.module";
import { PagosModule } from "../pagos/pagos.module";

@Module({
  imports: [VideoModule, PagosModule],
  controllers: [CasosController],
  providers: [CasosService, PrismaService],
  exports: [CasosService],
})
export class CasosModule {}

import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CasosModule } from "../casos/casos.module";
import { SolicitudesController } from "./solicitudes.controller";
import { SolicitudesService } from "./solicitudes.service";
import { EventosService } from "./eventos.service";

@Module({
  imports: [CasosModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, EventosService, PrismaService],
  exports: [SolicitudesService, EventosService],
})
export class SolicitudesModule {}

import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { IdentidadController } from "./identidad.controller";
import { IdentidadService } from "./identidad.service";
import { DisputasModule } from "../disputas/disputas.module";

@Module({
  imports: [DisputasModule],
  controllers: [IdentidadController],
  providers: [IdentidadService, PrismaService],
})
export class IdentidadModule {}

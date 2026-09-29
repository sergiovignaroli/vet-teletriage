import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { IdentidadController } from "./identidad.controller";
import { IdentidadService } from "./identidad.service";
import { DisputasModule } from "../disputas/disputas.module";
import { VeterinariosModule } from "../veterinarios/veterinarios.module";

@Module({
  imports: [DisputasModule, VeterinariosModule],
  controllers: [IdentidadController],
  providers: [IdentidadService, PrismaService],
})
export class IdentidadModule {}

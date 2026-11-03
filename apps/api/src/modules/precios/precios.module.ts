import { Module } from "@nestjs/common";
import { PreciosService } from "./precios.service";
import { PreciosController, PreciosPublicoController } from "./precios.controller";
import { PrismaService } from "../../prisma.service";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  imports: [ConfiguracionModule],
  controllers: [PreciosController, PreciosPublicoController],
  providers: [PreciosService, PrismaService],
  exports: [PreciosService],
})
export class PreciosModule {}

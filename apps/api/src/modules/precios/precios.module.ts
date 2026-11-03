import { Module } from "@nestjs/common";
import { PreciosService } from "./precios.service";
import { PreciosController } from "./precios.controller";
import { PrismaService } from "../../prisma.service";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  imports: [ConfiguracionModule],
  controllers: [PreciosController],
  providers: [PreciosService, PrismaService],
  exports: [PreciosService],
})
export class PreciosModule {}

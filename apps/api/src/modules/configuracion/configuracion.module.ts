import { Module } from "@nestjs/common";
import { ConfiguracionService } from "./configuracion.service";
import { ConfiguracionController } from "./configuracion.controller";
import { PrismaService } from "../../prisma.service";

@Module({
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService, PrismaService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}

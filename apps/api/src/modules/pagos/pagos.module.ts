import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";
import { ConfiguracionModule } from "../configuracion/configuracion.module";

@Module({
  // ConfiguracionModule: PagosService necesita ConfiguracionService para
  // leer el precio fijo en USD de PayPal (honorarioPaypalNormalUsd/etc —
  // Sergio, 2026-09-30).
  imports: [ConfiguracionModule],
  controllers: [PagosController],
  providers: [PagosService, PrismaService],
  exports: [PagosService],
})
export class PagosModule {}

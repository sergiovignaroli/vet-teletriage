import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";

@Module({
  controllers: [PagosController],
  providers: [PagosService, PrismaService],
  exports: [PagosService],
})
export class PagosModule {}

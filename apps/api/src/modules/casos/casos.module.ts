import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CasosController } from "./casos.controller";
import { CasosService } from "./casos.service";

@Module({
  controllers: [CasosController],
  providers: [CasosService, PrismaService],
  exports: [CasosService],
})
export class CasosModule {}

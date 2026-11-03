import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AyudaController } from "./ayuda.controller";
import { AyudaService } from "./ayuda.service";

@Module({
  controllers: [AyudaController],
  providers: [AyudaService, PrismaService],
})
export class AyudaModule {}

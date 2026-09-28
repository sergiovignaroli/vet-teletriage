import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { VeterinariosController } from "./veterinarios.controller";
import { VeterinariosService } from "./veterinarios.service";

@Module({
  controllers: [VeterinariosController],
  providers: [VeterinariosService, PrismaService],
  exports: [VeterinariosService],
})
export class VeterinariosModule {}

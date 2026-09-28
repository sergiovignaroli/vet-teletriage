import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PagosModule } from "../pagos/pagos.module";
import { DisputasController } from "./disputas.controller";
import { DisputasService } from "./disputas.service";

@Module({
  imports: [PagosModule],
  controllers: [DisputasController],
  providers: [DisputasService, PrismaService],
  exports: [DisputasService],
})
export class DisputasModule {}

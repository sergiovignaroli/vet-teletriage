import { Module } from "@nestjs/common";
import { VeterinariosModule } from "./modules/veterinarios/veterinarios.module";
import { CasosModule } from "./modules/casos/casos.module";
import { PagosModule } from "./modules/pagos/pagos.module";
import { DisputasModule } from "./modules/disputas/disputas.module";
import { CalificacionesModule } from "./modules/calificaciones/calificaciones.module";

@Module({
  imports: [VeterinariosModule, CasosModule, PagosModule, DisputasModule, CalificacionesModule],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { VeterinariosModule } from "./modules/veterinarios/veterinarios.module";
import { CasosModule } from "./modules/casos/casos.module";
import { PagosModule } from "./modules/pagos/pagos.module";
import { DisputasModule } from "./modules/disputas/disputas.module";
import { CalificacionesModule } from "./modules/calificaciones/calificaciones.module";
import { AuthModule } from "./modules/auth/auth.module";
import { IdentidadModule } from "./modules/identidad/identidad.module";
import { ConfiguracionModule } from "./modules/configuracion/configuracion.module";

@Module({
  imports: [
    AuthModule,
    VeterinariosModule,
    CasosModule,
    PagosModule,
    DisputasModule,
    CalificacionesModule,
    IdentidadModule,
    ConfiguracionModule,
  ],
})
export class AppModule {}

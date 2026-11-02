import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { VeterinariosModule } from "./modules/veterinarios/veterinarios.module";
import { CasosModule } from "./modules/casos/casos.module";
import { PagosModule } from "./modules/pagos/pagos.module";
import { DisputasModule } from "./modules/disputas/disputas.module";
import { CalificacionesModule } from "./modules/calificaciones/calificaciones.module";
import { AuthModule } from "./modules/auth/auth.module";
import { IdentidadModule } from "./modules/identidad/identidad.module";
import { NotificacionesModule } from "./modules/notificaciones/notificaciones.module";
import { SolicitudesModule } from "./modules/solicitudes/solicitudes.module";
import { ConfiguracionModule } from "./modules/configuracion/configuracion.module";

@Module({
  imports: [
    // Límite general por IP: 300 pedidos por minuto. Es generoso a propósito
    // (las pantallas de espera consultan cada 2 s) — frena a un robot, no a
    // una persona. Los endpoints sensibles (código por WhatsApp, logins,
    // registro) tienen límites mucho más bajos, ver auth.controller.ts.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),
    AuthModule,
    VeterinariosModule,
    CasosModule,
    PagosModule,
    DisputasModule,
    CalificacionesModule,
    IdentidadModule,
    ConfiguracionModule,
    SolicitudesModule,
    NotificacionesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

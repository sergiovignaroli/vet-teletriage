import { Module } from "@nestjs/common";
import { VeterinariosModule } from "./modules/veterinarios/veterinarios.module";
import { CasosModule } from "./modules/casos/casos.module";
import { PagosModule } from "./modules/pagos/pagos.module";

// Módulos pendientes de implementar con el mismo patrón (controller +
// service + module, PrismaService inyectado): disputas (Sección 10) y
// calificaciones/premios (Secciones 11-12). El schema de Prisma ya tiene
// los modelos DisputaIdentidad, DisputaCalidad, Calificacion y
// PuntoPremio listos para que estos módulos los usen.
@Module({
  imports: [VeterinariosModule, CasosModule, PagosModule],
})
export class AppModule {}

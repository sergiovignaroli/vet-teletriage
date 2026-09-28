import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class CalificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Sección 10: el botón de confirmación del cliente es NO PUNITIVO — solo
  // alimenta este sistema de calificaciones, nunca dispara un reembolso por
  // sí mismo (eso vive exclusivamente en disputas.service).
  async registrar(veterinarioId: string, casoId: string, estrellas: number, comentario?: string) {
    const calificacion = await this.prisma.calificacion.create({
      data: { veterinarioId, casoId, estrellas, comentario },
    });

    // Regla de puntos placeholder (Sección 12) — el mecanismo ya funciona;
    // el umbral de "calificación sostenida" y el valor en puntos son
    // decisiones de negocio que Sergio todavía no fijó. No inventar un
    // número final acá: dejar esto simple y fácil de ajustar en un solo
    // lugar cuando esa decisión se tome.
    if (estrellas >= 4) {
      await this.prisma.puntoPremio.create({
        data: { veterinarioId, puntos: 10, motivo: "Calificación de 4 o 5 estrellas" },
      });
    }

    return calificacion;
  }

  // Sección 11: la calidad pondera el ranking de búsqueda junto con
  // proximidad y disponibilidad — este promedio es el insumo de esa fórmula
  // (la fórmula de ranking en sí vive en veterinarios.service cuando se
  // implemente el tope de visibilidad paga).
  async promedioDe(veterinarioId: string): Promise<number | null> {
    const resultado = await this.prisma.calificacion.aggregate({
      where: { veterinarioId },
      _avg: { estrellas: true },
    });
    return resultado._avg.estrellas;
  }

  async puntosAcumulados(veterinarioId: string): Promise<number> {
    const resultado = await this.prisma.puntoPremio.aggregate({
      where: { veterinarioId },
      _sum: { puntos: true },
    });
    return resultado._sum.puntos ?? 0;
  }
}

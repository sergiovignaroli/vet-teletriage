import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import {
  ESTRELLAS_PARA_PUNTO_PREMIO,
  PISO_CALIDAD_ESTRELLAS,
  PUNTOS_POR_CALIFICACION_PERFECTA,
} from "@vet-teletriage/types";

@Injectable()
export class CalificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Sección 10: el botón de confirmación del cliente es NO PUNITIVO — solo
  // alimenta este sistema de calificaciones, nunca dispara un reembolso por
  // sí mismo (eso vive exclusivamente en disputas.service).
  async registrar(clienteId: string, veterinarioId: string, casoId: string, estrellas: number, comentario?: string) {
    if (estrellas < 1 || estrellas > 5) {
      throw new BadRequestException("estrellas debe estar entre 1 y 5");
    }

    // El modelo Calificacion no guarda clienteId — la única forma de
    // verificar que quien califica es quien realmente tuvo la sesión es
    // yendo al Caso. Sin esto, cualquier cliente logueado podía calificar
    // (y sumarle puntos-premio a) un veterinario que nunca lo atendió.
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) {
      throw new ForbiddenException("No podés calificar un caso que no es tuyo");
    }
    if (caso.veterinarioId !== veterinarioId) {
      throw new BadRequestException("Ese veterinario no atendió este caso");
    }
    // Situación probable (encontrada 2026-09-29, no pedida puntualmente): el
    // frontend solo ofrece calificar un caso CERRADO, pero nada acá lo
    // exigía — con la URL de un caso propio todavía ASIGNADO o EN_SESION
    // (el veterinarioId ya está seteado en ambos) se podía calificar una
    // consulta que ni siquiera terminó, ensuciando el promedio real del
    // veterinario y sus puntos-premio.
    if (caso.estado !== "CERRADO") {
      throw new BadRequestException("Todavía no se puede calificar — la consulta no terminó");
    }

    const calificacion = await this.prisma.calificacion.create({
      data: { veterinarioId, casoId, estrellas, comentario },
    });

    // Sección 12, decisión de negocio de Sergio (2026-09-28): solo la
    // calificación perfecta (5 estrellas) otorga puntos-premio — 4 estrellas
    // ya no suma. Constantes centralizadas en @vet-teletriage/types para no
    // repetir el número mágico acá y en el gate de calidad.
    if (estrellas === ESTRELLAS_PARA_PUNTO_PREMIO) {
      await this.prisma.puntoPremio.create({
        data: {
          veterinarioId,
          puntos: PUNTOS_POR_CALIFICACION_PERFECTA,
          motivo: "Calificación perfecta (5 estrellas)",
        },
      });
    }

    return calificacion;
  }

  // Sección 11, decisión de negocio de Sergio (2026-09-28): el piso de
  // calidad es 3 estrellas de promedio — por debajo, el veterinario debería
  // quedar fuera del gate de elegibilidad del motor de matching. Ese motor
  // (score compuesto, Fase 2 del roadmap) todavía no está implementado — en
  // la Fase 1 la asignación es manual (dispatcher humano) — así que este
  // método queda listo para que veterinarios.service lo consuma el día que
  // se construya el gate real; no se auto-suspende a nadie todavía.
  async estaPorDebajoDelPisoDeCalidad(veterinarioId: string): Promise<boolean> {
    const promedio = await this.promedioDe(veterinarioId);
    if (promedio === null) return false; // sin calificaciones todavía, no se penaliza
    return promedio < PISO_CALIDAD_ESTRELLAS;
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

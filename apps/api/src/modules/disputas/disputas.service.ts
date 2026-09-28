import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PagosService } from "../pagos/pagos.service";

// Sección 10 del contrato: dos circuitos separados, con efectos distintos
// y deliberadamente sin cruce entre uno y otro.
//   - Identidad → afecta la HABILITACIÓN del veterinario, nunca el pago.
//   - Calidad   → afecta, como máximo, el CARGO DE PLATAFORMA, nunca la
//                 habilitación del veterinario ni su honorario ya liquidado.
@Injectable()
export class DisputasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagos: PagosService,
  ) {}

  async abrirDisputaIdentidad(veterinarioId: string, motivo: string) {
    const disputa = await this.prisma.disputaIdentidad.create({
      data: { veterinarioId, motivo },
    });

    // Suspensión cautelar inmediata — Sección 10: "pueden derivar en
    // suspensión cautelar de cuenta pendiente de revisión". Se aplica al
    // abrir la disputa, no al resolverla: es preventiva, no punitiva final.
    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: { estado: "SUSPENDIDO_DISPUTA_IDENTIDAD", disponible: false },
    });

    return disputa;
  }

  async resolverDisputaIdentidad(
    disputaId: string,
    resolucion: string,
    restituirHabilitacion: boolean,
  ) {
    const disputa = await this.prisma.disputaIdentidad.update({
      where: { id: disputaId },
      data: { estado: "RESUELTA", resolucion, resueltaEl: new Date() },
    });

    if (restituirHabilitacion) {
      // Restituir a HABILITADO sin volver a chequear matrícula/seguro sería
      // un agujero: si vencieron durante la suspensión, no hay que
      // reactivar la disponibilidad igual. Se deja explícito acá para que
      // no se pierda de vista al integrar con veterinarios.service.
      const vet = await this.prisma.veterinario.findUniqueOrThrow({
        where: { id: disputa.veterinarioId },
      });
      const hoy = new Date();
      const matriculaVigente = vet.matriculaVenceEl > hoy;
      const seguroVigente = vet.seguroVenceEl > hoy;

      await this.prisma.veterinario.update({
        where: { id: disputa.veterinarioId },
        data:
          matriculaVigente && seguroVigente
            ? { estado: "HABILITADO", disponible: true }
            : {
                estado: matriculaVigente ? "SUSPENDIDO_SEGURO_VENCIDO" : "SUSPENDIDO_MATRICULA_VENCIDA",
                disponible: false,
              },
      });
    }

    return disputa;
  }

  async abrirDisputaCalidad(casoId: string, motivo: string) {
    return this.prisma.disputaCalidad.create({ data: { casoId, motivo } });
  }

  async resolverDisputaCalidad(disputaId: string, resolucion: string, hacerLugar: boolean) {
    const disputa = await this.prisma.disputaCalidad.update({
      where: { id: disputaId },
      data: { estado: "RESUELTA", resolucion, resueltaEl: new Date() },
    });

    if (hacerLugar) {
      // El único efecto posible: reembolso del cargo de plataforma. Nunca
      // se toca el honorario del veterinario desde este flujo — si alguien
      // intenta hacerlo, tiene que ser un método nuevo y explícito, no una
      // extensión silenciosa de este.
      await this.pagos.reembolsarCargoPlataforma(disputa.casoId);
    }

    return disputa;
  }
}

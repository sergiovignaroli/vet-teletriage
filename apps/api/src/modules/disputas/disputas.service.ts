import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
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

  // adminId es null cuando la abre el propio sistema (ej. identidad.service
  // ante un resultado inconsistente de Truora) — es una decisión automática,
  // no de un humano, y el registro de auditoría debe reflejar eso, no
  // inventarle un admin responsable que no actuó.
  async abrirDisputaIdentidad(veterinarioId: string, motivo: string, adminId: string | null) {
    // Defensivo (encontrado 2026-09-29 al conectar el path manual del admin
    // — ver abrirDisputaIdentidadPorEmail): sin este chequeo, un veterinarioId
    // inexistente rompía en un error crudo de FK de Prisma al crear la
    // disputa, en vez de un mensaje que un admin pueda entender.
    const veterinario = await this.prisma.veterinario.findUnique({ where: { id: veterinarioId } });
    if (!veterinario) throw new BadRequestException("Veterinario no encontrado");

    const disputa = await this.prisma.disputaIdentidad.create({
      data: { veterinarioId, motivo, abiertaPorAdminId: adminId },
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

  // Situación probable (encontrada 2026-09-29, no pedida puntualmente):
  // POST /disputas/identidad ya existía para ADMIN, pero pedía un
  // veterinarioId — algo que ningún admin humano tiene a mano sin abrir la
  // base a mano. El panel admin no tiene ningún directorio/búsqueda de
  // veterinarios (a propósito: el panel solo muestra excepciones, no un
  // listado completo), así que el punto de entrada natural para abrir una
  // disputa manual (sospecha externa, sin que Truora la haya disparado) es
  // el email del veterinario, no su id interno.
  async abrirDisputaIdentidadPorEmail(email: string, motivo: string, adminId: string) {
    const veterinario = await this.prisma.veterinario.findUnique({ where: { email } });
    if (!veterinario) throw new BadRequestException("No encontramos ningún veterinario con ese email");
    return this.abrirDisputaIdentidad(veterinario.id, motivo, adminId);
  }

  async resolverDisputaIdentidad(
    disputaId: string,
    resolucion: string,
    restituirHabilitacion: boolean,
    adminId: string,
  ) {
    const disputa = await this.prisma.disputaIdentidad.update({
      where: { id: disputaId },
      data: { estado: "RESUELTA", resolucion, resueltaEl: new Date(), resueltaPorAdminId: adminId },
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

  // Colas del panel admin (Sergio, 2026-09-29) — sin esto no hay forma de
  // ver qué está pendiente sin pegarle a la base a mano.
  async listarIdentidadAbiertas() {
    return this.prisma.disputaIdentidad.findMany({
      where: { estado: "ABIERTA" },
      include: { veterinario: { select: { id: true, nombre: true, apellido: true, email: true } } },
      orderBy: { abiertaEl: "asc" },
    });
  }

  async listarCalidadAbiertas() {
    return this.prisma.disputaCalidad.findMany({
      where: { estado: "ABIERTA" },
      include: {
        caso: {
          select: {
            id: true,
            clienteId: true,
            veterinarioId: true,
            intake: true,
          },
        },
      },
      orderBy: { abiertaEl: "asc" },
    });
  }

  async abrirDisputaCalidad(clienteId: string, casoId: string, motivo: string) {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    // Sin esto, cualquier cliente autenticado podía abrir una disputa de
    // calidad sobre un caso ajeno.
    if (caso.clienteId !== clienteId) {
      throw new ForbiddenException("No podés abrir una disputa sobre un caso que no es tuyo");
    }
    // Situación probable (encontrada 2026-09-29, no pedida puntualmente): el
    // frontend solo muestra el link de "reportar un problema" para un caso
    // CERRADO, pero nada acá lo exigía — cualquier cliente que adivinara o
    // guardara la URL con el casoId de una consulta todavía en INTAKE,
    // ASIGNADO o EN_SESION podía abrir una disputa sobre algo que ni
    // siquiera terminó. Además, resolverDisputaCalidad() con hacerLugar
    // asume un Pago ya capturado para reembolsar — un caso que nunca llegó
    // a CERRADO puede no tener Pago todavía.
    if (caso.estado !== "CERRADO") {
      throw new BadRequestException("Todavía no se puede reportar un problema — la consulta no terminó");
    }

    return this.prisma.disputaCalidad.create({ data: { casoId, motivo } });
  }

  async resolverDisputaCalidad(disputaId: string, resolucion: string, hacerLugar: boolean, adminId: string) {
    const disputa = await this.prisma.disputaCalidad.update({
      where: { id: disputaId },
      data: { estado: "RESUELTA", resolucion, resueltaEl: new Date(), resueltaPorAdminId: adminId },
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

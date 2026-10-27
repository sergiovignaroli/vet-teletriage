import { BadRequestException, ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  BanderasRojasIntake,
  hayBanderaRoja,
  listarBanderasRojas,
  SOLICITUD_SEGUNDOS_EN_CONSULTA,
  SOLICITUD_SEGUNDOS_LIBRE,
  VERSION_TERMINOS,
} from "@vet-teletriage/types";
import type { SolicitudParaCliente, SolicitudParaVeterinario } from "@vet-teletriage/types";
import { PrismaService } from "../../prisma.service";
import { CasosService } from "../casos/casos.service";
import { tieneSenalVigente } from "../../common/presencia";
import { EventosService } from "./eventos.service";
import { NotificacionesService } from "../notificaciones/notificaciones.service";

// Después de tantas solicitudes seguidas sin respuesta, el veterinario pasa
// solo a Stand by (Sergio aprobó la regla el 2026-10-27).
const VENCIDAS_SEGUIDAS_PARA_STAND_BY = 3;
const REVISION_VENCIDAS_MS = 5_000;
// Si a los 20 s el veterinario no abrió el panel (sin canal en vivo), se suman
// WhatsApp y correo al aviso push. Si el cliente dejó de mirar la pantalla de
// espera hace más de 10 s cuando le aceptan, se le avisa por WhatsApp.
const ESCALADA_OTROS_CANALES_MS = 20_000;
const CLIENTE_AUSENTE_MS = 10_000;

@Injectable()
export class SolicitudesService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SolicitudesService.name);
  private temporizador?: NodeJS.Timeout;
  // Última vez que la pantalla de espera del cliente consultó cada solicitud.
  private readonly ultimaConsultaCliente = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly casos: CasosService,
    private readonly eventos: EventosService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  onModuleInit() {
    // Cierra las solicitudes vencidas aunque nadie pregunte (y avisa). Las
    // lecturas además vencen lo vencido por su cuenta: si este temporizador se
    // atrasara, el estado que ve cada persona sigue siendo el correcto.
    this.temporizador = setInterval(() => {
      this.vencerPendientes().catch((e) => this.log.error(`No se pudieron vencer solicitudes: ${e}`));
    }, REVISION_VENCIDAS_MS);
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  // -------------------------------------------------------------------------
  // Cliente
  // -------------------------------------------------------------------------

  async crear(params: {
    casoId: string;
    clienteId: string;
    veterinarioId: string;
    aceptoTerminos: boolean;
    ip?: string;
  }): Promise<SolicitudParaCliente> {
    // Sergio, 2026-10-27: el cliente acepta los Términos y Condiciones al
    // elegir, y esa aceptación queda registrada (versión, fecha e IP).
    if (params.aceptoTerminos !== true) {
      throw new BadRequestException("Para continuar tenés que aceptar los Términos y Condiciones");
    }

    const caso = await this.prisma.caso.findUnique({ where: { id: params.casoId } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== params.clienteId) throw new ForbiddenException("Este caso no te pertenece");
    if (caso.veterinarioId) throw new BadRequestException("Este caso ya tiene un veterinario asignado");
    if (caso.estado !== "INTAKE" && caso.estado !== "BANDERA_ROJA_MOSTRADA") {
      throw new BadRequestException("Este caso ya no admite elegir veterinario");
    }

    await this.vencerPendientes();

    const veterinario = await this.prisma.veterinario.findUnique({
      where: { id: params.veterinarioId },
      include: {
        casos: { where: { estado: { in: ["ASIGNADO", "EN_SESION"] } }, select: { estado: true } },
        solicitudes: { where: { estado: "PENDIENTE" }, select: { id: true } },
        pushSuscripciones: { select: { id: true }, take: 1 },
      },
    });
    const elegible =
      veterinario &&
      veterinario.estado === "HABILITADO" &&
      veterinario.presencia !== "DESCONECTADO" &&
      tieneSenalVigente(veterinario.ultimaSenal, veterinario.pushSuscripciones.length > 0);
    if (!veterinario || !elegible) {
      throw new BadRequestException("Ese veterinario ya no está disponible — elegí otro de la lista");
    }
    // Una sola solicitud pendiente por veterinario, y nadie con un cliente ya
    // asignado esperando que arranque.
    if (veterinario.solicitudes.length > 0 || veterinario.casos.some((c) => c.estado === "ASIGNADO")) {
      throw new BadRequestException("Ese veterinario está atendiendo otra solicitud — elegí otro de la lista");
    }

    const enConsulta = veterinario.casos.some((c) => c.estado === "EN_SESION");
    const segundos = enConsulta ? SOLICITUD_SEGUNDOS_EN_CONSULTA : SOLICITUD_SEGUNDOS_LIBRE;
    const ahora = new Date();

    // Una sola solicitud viva por caso: si el cliente elige a otro, la anterior se cancela.
    const solicitud = await this.prisma.$transaction(async (tx) => {
      await tx.solicitudAtencion.updateMany({
        where: { casoId: caso.id, estado: "PENDIENTE" },
        data: { estado: "CANCELADA_POR_CLIENTE", respondidaEl: ahora },
      });
      return tx.solicitudAtencion.create({
        data: {
          casoId: caso.id,
          veterinarioId: veterinario.id,
          vetEnConsulta: enConsulta,
          venceEl: new Date(ahora.getTime() + segundos * 1000),
          terminosVersion: VERSION_TERMINOS,
          terminosAceptadosEl: ahora,
          terminosIp: params.ip ?? null,
        },
        include: { veterinario: { select: { id: true, nombre: true, apellido: true } } },
      });
    });

    // Avisar a las solicitudes anteriores del mismo caso (si cambió de veterinario).
    const anteriores = await this.prisma.solicitudAtencion.findMany({
      where: { casoId: caso.id, estado: "CANCELADA_POR_CLIENTE", respondidaEl: ahora },
      select: { id: true, veterinarioId: true },
    });
    anteriores.forEach((a) => this.eventos.emitir(a.veterinarioId, { tipo: "solicitud-cerrada", solicitudId: a.id }));

    this.eventos.emitir(veterinario.id, { tipo: "solicitud-nueva", solicitudId: solicitud.id });
    // Además del canal en vivo: aviso push para quien tiene la pestaña cerrada
    // o el celular bloqueado. No se espera: un fallo de push no frena la solicitud.
    this.notificaciones.avisarSolicitudNueva(veterinario.id, segundos).catch(() => {});
    this.ultimaConsultaCliente.set(solicitud.id, Date.now());
    this.programarEscalada(solicitud.id, veterinario.id);
    return this.paraCliente(solicitud);
  }

  // Estado de la solicitud viva (o la última) de un caso, para la pantalla de espera.
  async actualDelCaso(casoId: string, clienteId: string): Promise<SolicitudParaCliente | null> {
    const caso = await this.prisma.caso.findUnique({ where: { id: casoId }, select: { clienteId: true } });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) throw new ForbiddenException("Este caso no te pertenece");
    await this.vencerPendientes();
    const solicitud = await this.prisma.solicitudAtencion.findFirst({
      where: { casoId },
      orderBy: { creadaEl: "desc" },
      include: { veterinario: { select: { id: true, nombre: true, apellido: true } } },
    });
    if (solicitud) this.ultimaConsultaCliente.set(solicitud.id, Date.now());
    return solicitud ? this.paraCliente(solicitud) : null;
  }

  private programarEscalada(solicitudId: string, veterinarioId: string) {
    const t = setTimeout(async () => {
      try {
        const sigue = await this.prisma.solicitudAtencion.findFirst({
          where: { id: solicitudId, estado: "PENDIENTE" },
          select: { id: true },
        });
        if (!sigue || this.eventos.tieneCanalAbierto(veterinarioId)) return;
        await this.notificaciones.avisarSolicitudPorOtrosCanales(veterinarioId);
      } catch (e) {
        this.log.warn(`Escalada de avisos falló: ${e}`);
      }
    }, ESCALADA_OTROS_CANALES_MS);
    t.unref();
  }

  async cancelarPorCliente(solicitudId: string, clienteId: string) {
    const solicitud = await this.prisma.solicitudAtencion.findUnique({
      where: { id: solicitudId },
      include: { caso: { select: { clienteId: true } } },
    });
    if (!solicitud) throw new BadRequestException("Solicitud no encontrada");
    if (solicitud.caso.clienteId !== clienteId) throw new ForbiddenException("Esta solicitud no te pertenece");
    const r = await this.prisma.solicitudAtencion.updateMany({
      where: { id: solicitudId, estado: "PENDIENTE" },
      data: { estado: "CANCELADA_POR_CLIENTE", respondidaEl: new Date() },
    });
    if (r.count > 0) this.eventos.emitir(solicitud.veterinarioId, { tipo: "solicitud-cerrada", solicitudId });
    return { cancelada: r.count > 0 };
  }

  // -------------------------------------------------------------------------
  // Veterinario
  // -------------------------------------------------------------------------

  async pendienteDelVeterinario(veterinarioId: string): Promise<SolicitudParaVeterinario | null> {
    await this.vencerPendientes();
    const solicitud = await this.prisma.solicitudAtencion.findFirst({
      where: { veterinarioId, estado: "PENDIENTE" },
      orderBy: { creadaEl: "desc" },
      include: { caso: { include: { intake: true } } },
    });
    const intake = solicitud?.caso.intake;
    if (!solicitud || !intake) return null;
    return this.paraVeterinario(solicitud, intake);
  }

  async aceptar(solicitudId: string, veterinarioId: string) {
    const solicitud = await this.propiaPendiente(solicitudId, veterinarioId);
    // Toma atómica: solo pasa a ACEPTADA si sigue pendiente y no venció.
    const ahora = new Date();
    const tomada = await this.prisma.solicitudAtencion.updateMany({
      where: { id: solicitud.id, estado: "PENDIENTE", venceEl: { gt: ahora } },
      data: { estado: "ACEPTADA", respondidaEl: ahora },
    });
    if (tomada.count === 0) {
      throw new BadRequestException("La solicitud ya no está disponible: venció o la canceló el cliente");
    }
    try {
      const caso = await this.casos.asignarPorAceptacion(solicitud.casoId, veterinarioId);
      void this.avisarAlClienteSiNoMira(solicitud.id, caso.clienteId);
      return { aceptada: true, casoId: caso.id };
    } catch (e) {
      // Si no se pudo asignar (por ejemplo, el caso ya tenía veterinario), se
      // deshace: la solicitud no puede quedar aceptada sin caso asignado.
      await this.prisma.solicitudAtencion.update({
        where: { id: solicitud.id },
        data: { estado: "CANCELADA_POR_CLIENTE", respondidaEl: new Date() },
      });
      throw e;
    }
  }

  private async avisarAlClienteSiNoMira(solicitudId: string, clienteId: string) {
    const ultima = this.ultimaConsultaCliente.get(solicitudId) ?? 0;
    this.ultimaConsultaCliente.delete(solicitudId);
    if (Date.now() - ultima <= CLIENTE_AUSENTE_MS) return;
    const cliente = await this.prisma.cliente.findUnique({ where: { id: clienteId }, select: { telefono: true } });
    if (cliente) await this.notificaciones.avisarClienteConsultaAceptada(cliente.telefono);
  }

  async rechazar(solicitudId: string, veterinarioId: string, motivo?: string) {
    const solicitud = await this.propiaPendiente(solicitudId, veterinarioId);
    const r = await this.prisma.solicitudAtencion.updateMany({
      where: { id: solicitud.id, estado: "PENDIENTE" },
      data: { estado: "RECHAZADA", respondidaEl: new Date(), motivoRechazo: motivo?.slice(0, 300) || null },
    });
    if (r.count === 0) throw new BadRequestException("La solicitud ya no está disponible");
    return { rechazada: true };
  }

  // -------------------------------------------------------------------------
  // Vencimiento
  // -------------------------------------------------------------------------

  async vencerPendientes() {
    const ahora = new Date();
    // Limpieza del registro de consultas del cliente (nada vive más de 10 min).
    for (const [id, t] of this.ultimaConsultaCliente) {
      if (ahora.getTime() - t > 10 * 60 * 1000) this.ultimaConsultaCliente.delete(id);
    }
    const vencidas = await this.prisma.solicitudAtencion.findMany({
      where: { estado: "PENDIENTE", venceEl: { lte: ahora } },
      select: { id: true, veterinarioId: true },
    });
    for (const v of vencidas) {
      const r = await this.prisma.solicitudAtencion.updateMany({
        where: { id: v.id, estado: "PENDIENTE" },
        data: { estado: "VENCIDA", respondidaEl: ahora },
      });
      if (r.count === 0) continue;
      this.eventos.emitir(v.veterinarioId, { tipo: "solicitud-cerrada", solicitudId: v.id });
      await this.bajarAStandBySiCorresponde(v.veterinarioId);
    }
  }

  // Tres vencidas seguidas (sin ninguna respondida en el medio) -> Stand by.
  private async bajarAStandBySiCorresponde(veterinarioId: string) {
    const ultimas = await this.prisma.solicitudAtencion.findMany({
      where: { veterinarioId, estado: { not: "PENDIENTE" } },
      orderBy: { creadaEl: "desc" },
      take: VENCIDAS_SEGUIDAS_PARA_STAND_BY,
      select: { estado: true },
    });
    const todasVencidas =
      ultimas.length === VENCIDAS_SEGUIDAS_PARA_STAND_BY && ultimas.every((s) => s.estado === "VENCIDA");
    if (!todasVencidas) return;
    await this.prisma.veterinario.updateMany({
      where: { id: veterinarioId, presencia: "CONECTADO" },
      data: { presencia: "STAND_BY", disponible: false },
    });
  }

  // -------------------------------------------------------------------------

  private async propiaPendiente(solicitudId: string, veterinarioId: string) {
    await this.vencerPendientes();
    const solicitud = await this.prisma.solicitudAtencion.findUnique({ where: { id: solicitudId } });
    if (!solicitud) throw new BadRequestException("Solicitud no encontrada");
    if (solicitud.veterinarioId !== veterinarioId) throw new ForbiddenException("Esta solicitud no es tuya");
    if (solicitud.estado !== "PENDIENTE") {
      throw new BadRequestException("La solicitud ya no está disponible: venció o la canceló el cliente");
    }
    return solicitud;
  }

  private paraCliente(s: {
    id: string;
    casoId: string;
    estado: string;
    venceEl: Date;
    vetEnConsulta: boolean;
    veterinario: { id: string; nombre: string; apellido: string };
  }): SolicitudParaCliente {
    return {
      id: s.id,
      casoId: s.casoId,
      estado: s.estado as SolicitudParaCliente["estado"],
      venceEl: s.venceEl.toISOString(),
      vetEnConsulta: s.vetEnConsulta,
      veterinario: { id: s.veterinario.id, nombre: s.veterinario.nombre, apellido: s.veterinario.apellido },
    };
  }

  // Solo contexto clínico: nunca teléfono ni datos de contacto del cliente.
  private paraVeterinario(
    s: { id: string; casoId: string; estado: string; venceEl: Date; creadaEl: Date; vetEnConsulta: boolean },
    intake: {
      especie: string;
      raza: string | null;
      edadAproximada: string | null;
      pesoAproximadoKg: number | null;
      motivoConsulta: string;
    } & BanderasRojasIntake,
  ): SolicitudParaVeterinario {
    return {
      id: s.id,
      casoId: s.casoId,
      estado: s.estado as SolicitudParaVeterinario["estado"],
      venceEl: s.venceEl.toISOString(),
      creadaEl: s.creadaEl.toISOString(),
      vetEnConsulta: s.vetEnConsulta,
      hayBanderaRoja: hayBanderaRoja(intake),
      banderasRojas: listarBanderasRojas(intake),
      especie: intake.especie,
      raza: intake.raza,
      edadAproximada: intake.edadAproximada,
      pesoAproximadoKg: intake.pesoAproximadoKg,
      motivoConsulta: intake.motivoConsulta,
    };
  }
}

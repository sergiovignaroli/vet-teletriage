import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CIERRES_SIN_REEMBOLSO } from "@vet-teletriage/types";
import {
  construirUrlAutorizacionMercadoPago,
  intercambiarCodigoPorToken,
  verificarYExtraerState,
} from "../../common/mercadopago-oauth.util";

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  // Sección 8 del contrato, codificada: la única fuente de verdad sobre si
  // corresponde reembolso es la clasificación de cierre del caso — nunca la
  // insatisfacción del cliente por sí sola (eso es un dato de calificación,
  // no de pago; ver Sección 10).
  //
  // - RESUELTO_POR_ORIENTACION / DERIVADO_A_EMERGENCIA → servicio cumplido,
  //   se captura el 100% (honorario + cargo de plataforma), CERO reembolso.
  // - NO_COMPLETADO → habilita reembolso, pero SOLO del cargo de plataforma;
  //   si la sesión no se prestó, el veterinario no devengó honorario, así
  //   que no hay nada que reembolsarle a él.
  async liquidarSegunCierre(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      include: { cierre: true, pago: true },
    });
    if (!caso || !caso.cierre || !caso.pago) {
      throw new BadRequestException("El caso no tiene cierre o pago registrado todavía");
    }
    // Sin este chequeo, cualquier veterinario autenticado podía liquidar
    // (y por lo tanto capturar el pago de) un caso ajeno.
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }

    const sinDerechoAReembolso = CIERRES_SIN_REEMBOLSO.includes(caso.cierre.clasificacion);

    if (sinDerechoAReembolso) {
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "CAPTURADO", capturadoEl: new Date() },
      });
    }

    // NO_COMPLETADO: reembolsar únicamente el cargo de plataforma.
    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_PARCIAL",
        reembolsadoEl: new Date(),
        montoReembolsado: caso.pago.montoCargoPlataforma,
      },
    });
  }

  // Sección 10 del contrato: una disputa de CALIDAD puede, como máximo,
  // reembolsar el cargo de servicio de la plataforma — nunca el honorario
  // ya liquidado al veterinario. Lo llama disputas.service al resolver una
  // DisputaCalidad a favor del cliente; nunca se llama a partir de una
  // DisputaIdentidad (esas no tocan el pago, tocan la habilitación del vet).
  async reembolsarCargoPlataforma(casoId: string) {
    const pago = await this.prisma.pago.findUnique({ where: { casoId } });
    if (!pago) throw new BadRequestException("El caso no tiene pago registrado");
    if (pago.estado === "REEMBOLSADO_PARCIAL") return pago; // idempotente

    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_PARCIAL",
        reembolsadoEl: new Date(),
        montoReembolsado: pago.montoCargoPlataforma,
      },
    });
  }

  // Stub del webhook de Mercado Pago (split 1:1, ver documento de
  // proveedores) — Mercado Pago notifica acá cuando el pago autorizado
  // (hold) se puede capturar. La lógica real de firma/verificación del
  // webhook y el llamado a la API de Mercado Pago quedan para la
  // implementación; esto documenta el contrato de datos esperado.
  async manejarWebhookMercadoPago(payload: { casoId: string; mercadoPagoPaymentId: string }) {
    return this.prisma.pago.update({
      where: { casoId: payload.casoId },
      data: { mercadoPagoPaymentId: payload.mercadoPagoPaymentId, estado: "AUTORIZADO" },
    });
  }

  // -------------------------------------------------------------------------
  // OAuth de Mercado Pago (Split de Pagos 1:1) — el veterinario conecta su
  // propia cuenta antes de poder cobrar. Sin esto, no hay collector_id ni
  // access_token propios para armar el split en el checkout (esa parte —
  // crear la preferencia de pago con marketplace_fee — todavía no está
  // escrita: depende de tener primero al menos un veterinario conectado
  // para probarla contra la API real).
  // -------------------------------------------------------------------------
  iniciarOAuthMercadoPago(veterinarioId: string): { url: string } {
    return { url: construirUrlAutorizacionMercadoPago(veterinarioId) };
  }

  async manejarCallbackOAuthMercadoPago(code: string, state: string) {
    const veterinarioId = verificarYExtraerState(state); // lanza si el state fue manipulado
    const token = await intercambiarCodigoPorToken(code);

    await this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: {
        mercadoPagoOAuthId: String(token.user_id),
        mercadoPagoAccessToken: token.access_token,
        mercadoPagoRefreshToken: token.refresh_token,
        mercadoPagoTokenVenceEl: new Date(Date.now() + token.expires_in * 1000),
        medioDeCobro: "MERCADO_PAGO",
      },
    });

    return { veterinarioId, conectado: true };
  }
}

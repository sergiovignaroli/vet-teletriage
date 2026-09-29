import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { CARGO_NO_COMPLETADO, CIERRES_SIN_REEMBOLSO } from "@vet-teletriage/types";
import {
  construirUrlAutorizacionMercadoPago,
  intercambiarCodigoPorToken,
  refrescarTokenMercadoPago,
  verificarYExtraerState,
} from "../../common/mercadopago-oauth.util";
import {
  crearPreferenciaDePago,
  obtenerPagoMercadoPago,
  reembolsarPagoMercadoPago,
  requerirEnvMercadoPago,
} from "../../common/mercadopago-checkout.util";

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Checkout (situación probable, encontrada 2026-09-29, no pedida
  // puntualmente): ni un solo lugar de todo apps/api creaba nunca un
  // registro Pago — liquidarSegunCierre(), el webhook y el reembolso de
  // disputas de calidad asumían uno existente que ninguna pantalla llegaba a
  // crear. De punta a punta, un cliente nunca pagaba nada. Esto es lo que
  // faltaba: se llama apenas el cliente elige veterinario (asignar() ya dejó
  // el caso en ASIGNADO con honorarioDeclarado fijo), crea la preferencia de
  // Mercado Pago con el access_token DEL VETERINARIO (split automático,
  // marketplace_fee = cargo de plataforma) y devuelve la URL de checkout
  // para que el navegador del cliente redirija ahí.
  //
  // Cobro inmediato, no hold (Sergio, 2026-09-29, confirmado después de
  // verificar que Checkout Pro no soporta captura diferida — ver
  // mercadopago-checkout.util.ts): el tutor paga el total ACÁ, antes de que
  // exista ninguna videollamada. Lo que corresponda se reembolsa después,
  // según cómo cierre el caso (ver liquidarSegunCierre más abajo).
  async crearCheckout(casoId: string, clienteId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      include: { pago: true, veterinario: true },
    });
    if (!caso) throw new BadRequestException("Caso no encontrado");
    if (caso.clienteId !== clienteId) throw new ForbiddenException("Este caso no te pertenece");
    if (caso.estado !== "ASIGNADO" || !caso.veterinarioId || !caso.veterinario) {
      throw new BadRequestException("Este caso todavía no tiene un veterinario asignado");
    }
    if (caso.honorarioDeclarado == null) {
      // No debería pasar nunca — asignar() siempre lo completa. Defensivo.
      throw new BadRequestException("Este caso todavía no tiene un honorario calculado");
    }
    if (caso.pago) {
      // Ya se generó una preferencia antes (el cliente volvió atrás, por
      // ejemplo) — nunca crear una segunda, Pago.casoId es único.
      throw new BadRequestException("Ya se inició un cobro para este caso");
    }

    const veterinario = await this.asegurarTokenMercadoPagoVigente(caso.veterinarioId);
    if (!veterinario.mercadoPagoAccessToken) {
      throw new BadRequestException(
        "El veterinario elegido todavía no conectó su cuenta de Mercado Pago — elegí otro de la lista",
      );
    }

    const montoHonorarioVet = Number(caso.honorarioDeclarado);
    const montoCargoPlataforma = Number(caso.cargoPlataforma);
    const montoTotal = montoHonorarioVet + montoCargoPlataforma;

    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    const apiUrl = process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3001";

    const preferencia = await crearPreferenciaDePago({
      accessTokenVendedor: veterinario.mercadoPagoAccessToken,
      casoId,
      montoTotal,
      cargoPlataforma: montoCargoPlataforma,
      urlExito: `${webAppUrl}/panel`,
      urlPendiente: `${webAppUrl}/panel`,
      urlFallo: `${webAppUrl}/panel`,
      urlNotificacion: `${apiUrl}/pagos/webhooks/mercado-pago`,
    });

    await this.prisma.pago.create({
      data: {
        casoId,
        medioDeCobro: "MERCADO_PAGO",
        montoTotal,
        montoHonorarioVet,
        montoCargoPlataforma,
        estado: "PENDIENTE",
        mercadoPagoPreferenciaId: preferencia.id,
      },
    });

    return { initPoint: preferencia.init_point };
  }

  private async asegurarTokenMercadoPagoVigente(veterinarioId: string) {
    const veterinario = await this.prisma.veterinario.findUniqueOrThrow({ where: { id: veterinarioId } });
    if (!veterinario.mercadoPagoRefreshToken || !veterinario.mercadoPagoTokenVenceEl) return veterinario;
    // Margen de 5 minutos para no arrancar un checkout con un token que
    // vence en el medio del armado de la preferencia.
    const porVencer = veterinario.mercadoPagoTokenVenceEl.getTime() - Date.now() < 5 * 60 * 1000;
    if (!porVencer) return veterinario;

    const token = await refrescarTokenMercadoPago(veterinario.mercadoPagoRefreshToken);
    return this.prisma.veterinario.update({
      where: { id: veterinarioId },
      data: {
        mercadoPagoAccessToken: token.access_token,
        mercadoPagoRefreshToken: token.refresh_token,
        mercadoPagoTokenVenceEl: new Date(Date.now() + token.expires_in * 1000),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Webhook real de Mercado Pago (reemplaza el stub anterior, que asumía un
  // body {casoId, mercadoPagoPaymentId} — Mercado Pago nunca manda eso: solo
  // manda {type, data:{id}}, y hay que pedirle el detalle del pago aparte).
  // -------------------------------------------------------------------------
  async manejarWebhookMercadoPago(tipo: string, paymentId: string) {
    if (tipo !== "payment") return { ignorado: true }; // ej. merchant_order — no nos interesa acá

    const accessTokenPlataforma = requerirEnvMercadoPago("MERCADOPAGO_ACCESS_TOKEN");
    const pagoMp = await obtenerPagoMercadoPago(paymentId, accessTokenPlataforma);
    if (!pagoMp.external_reference) return { ignorado: true };

    const pago = await this.prisma.pago.findUnique({ where: { casoId: pagoMp.external_reference } });
    if (!pago) return { ignorado: true }; // notificación de un pago que no es nuestro, o duplicada

    if (pagoMp.status === "approved") {
      // Idempotente: un reintento del mismo webhook no debe pisar pagadoEl.
      if (pago.estado === "PENDIENTE") {
        return this.prisma.pago.update({
          where: { casoId: pago.casoId },
          data: { estado: "AUTORIZADO", mercadoPagoPaymentId: String(pagoMp.id), pagadoEl: new Date() },
        });
      }
      return pago;
    }

    if (pagoMp.status === "rejected" || pagoMp.status === "cancelled") {
      return this.prisma.pago.update({
        where: { casoId: pago.casoId },
        data: { estado: "CANCELADO", mercadoPagoPaymentId: String(pagoMp.id) },
      });
    }

    // "pending", "in_process", etc. — todavía no hay nada que resolver.
    return pago;
  }

  // Sección 8 del contrato, adaptado a cobro inmediato (Sergio, 2026-09-29):
  // la plata YA se cobró y se repartió al pagar (ver crearCheckout) — acá ya
  // no hay nada que "capturar", solo decidir si corresponde reembolso según
  // la clasificación de cierre.
  //
  // - RESUELTO_POR_ORIENTACION / DERIVADO_A_EMERGENCIA → servicio cumplido,
  //   no hay reembolso — se marca CAPTURADO como bookkeeping nomás.
  // - NO_COMPLETADO → reembolso TOTAL al tutor (honorario del veterinario
  //   incluido) MENOS CARGO_NO_COMPLETADO, que se lo queda la plataforma.
  //   Dos llamadas a la API de reembolsos de Mercado Pago: una contra la
  //   cuenta del veterinario (le retira el honorario que ya había cobrado),
  //   otra contra la cuenta de la plataforma (le devuelve al tutor su parte
  //   del cargo de plataforma, menos la penalidad).
  async liquidarSegunCierre(casoId: string, veterinarioId: string) {
    const caso = await this.prisma.caso.findUnique({
      where: { id: casoId },
      include: { cierre: true, pago: true, veterinario: true },
    });
    if (!caso || !caso.cierre || !caso.pago || !caso.veterinario) {
      throw new BadRequestException("El caso no tiene cierre o pago registrado todavía");
    }
    // Sin este chequeo, cualquier veterinario autenticado podía liquidar
    // (y por lo tanto capturar el pago de) un caso ajeno.
    if (caso.veterinarioId !== veterinarioId) {
      throw new ForbiddenException("No sos el veterinario asignado a este caso");
    }
    if (caso.pago.estado !== "AUTORIZADO") {
      // Todavía no llegó el webhook confirmando el pago, o ya se liquidó
      // antes — no hay nada consistente que hacer acá.
      throw new BadRequestException("El pago de este caso todavía no está confirmado");
    }

    const sinDerechoAReembolso = CIERRES_SIN_REEMBOLSO.includes(caso.cierre.clasificacion);

    if (sinDerechoAReembolso) {
      return this.prisma.pago.update({
        where: { casoId },
        data: { estado: "CAPTURADO", capturadoEl: new Date() },
      });
    }

    // NO_COMPLETADO — ver nota [Probable] en mercadopago-checkout.util.ts:
    // esto todavía no se probó contra un pago real de Mercado Pago.
    if (!caso.pago.mercadoPagoPaymentId) {
      throw new BadRequestException("Falta el id de pago de Mercado Pago — no se puede reembolsar");
    }
    const montoHonorarioVet = Number(caso.pago.montoHonorarioVet);
    const montoCargoPlataforma = Number(caso.pago.montoCargoPlataforma);
    // Clamp: CARGO_NO_COMPLETADO es un valor que Sergio puede subir con el
    // tiempo — nunca debería hacer que intentemos retener más de lo que
    // efectivamente se cobró como cargo de plataforma en ESTE caso puntual.
    const montoRetenidoPlataforma = Math.min(CARGO_NO_COMPLETADO, montoCargoPlataforma);
    const montoAReembolsarPlataforma = montoCargoPlataforma - montoRetenidoPlataforma;

    const veterinario = await this.asegurarTokenMercadoPagoVigente(caso.veterinarioId!);
    if (montoHonorarioVet > 0 && veterinario.mercadoPagoAccessToken) {
      await reembolsarPagoMercadoPago(
        caso.pago.mercadoPagoPaymentId,
        veterinario.mercadoPagoAccessToken,
        montoHonorarioVet,
      );
    }
    if (montoAReembolsarPlataforma > 0) {
      const accessTokenPlataforma = requerirEnvMercadoPago("MERCADOPAGO_ACCESS_TOKEN");
      await reembolsarPagoMercadoPago(
        caso.pago.mercadoPagoPaymentId,
        accessTokenPlataforma,
        montoAReembolsarPlataforma,
      );
    }

    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_PARCIAL",
        reembolsadoEl: new Date(),
        montoReembolsado: montoHonorarioVet + montoAReembolsarPlataforma,
      },
    });
  }

  // Sección 10 del contrato: una disputa de CALIDAD puede, como máximo,
  // reembolsar el cargo de servicio de la plataforma — nunca el honorario
  // ya liquidado al veterinario (eso solo pasa por NO_COMPLETADO, arriba).
  // Lo llama disputas.service al resolver una DisputaCalidad a favor del
  // cliente; nunca se llama a partir de una DisputaIdentidad (esas no tocan
  // el pago, tocan la habilitación del vet).
  async reembolsarCargoPlataforma(casoId: string) {
    const pago = await this.prisma.pago.findUnique({ where: { casoId } });
    if (!pago) throw new BadRequestException("El caso no tiene pago registrado");
    if (pago.estado === "REEMBOLSADO_PARCIAL") return pago; // idempotente
    if (!pago.mercadoPagoPaymentId) {
      throw new BadRequestException("Falta el id de pago de Mercado Pago — no se puede reembolsar");
    }

    const accessTokenPlataforma = requerirEnvMercadoPago("MERCADOPAGO_ACCESS_TOKEN");
    const monto = Number(pago.montoCargoPlataforma);
    if (monto > 0) {
      await reembolsarPagoMercadoPago(pago.mercadoPagoPaymentId, accessTokenPlataforma, monto);
    }

    return this.prisma.pago.update({
      where: { casoId },
      data: {
        estado: "REEMBOLSADO_PARCIAL",
        reembolsadoEl: new Date(),
        montoReembolsado: monto,
      },
    });
  }

  // -------------------------------------------------------------------------
  // OAuth de Mercado Pago (Split de Pagos) — el veterinario conecta su
  // propia cuenta antes de poder cobrar. Sin esto, no hay access_token
  // propio para armar la preferencia con split en crearCheckout().
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

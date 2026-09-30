import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { PagosService } from "./pagos.service";
import { verificarFirmaMercadoPago } from "../../common/mercadopago-webhook.util";
import { verificarFirmaWebhookPayPal } from "../../common/paypal.util";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("pagos")
export class PagosController {
  private readonly logger = new Logger(PagosController.name);

  constructor(private readonly pagos: PagosService) {}

  // Cuerpo real que manda Mercado Pago: {type, data:{id}} — nunca
  // {casoId, mercadoPagoPaymentId} (eso era un stub viejo). El casoId sale
  // recién de pedirle el detalle del pago a la API con ese id, adentro del
  // service (ver nota [Probable] en mercadopago-checkout.util.ts).
  @Post("webhooks/mercado-pago")
  webhookMercadoPago(
    @Headers("x-signature") xSignature: string,
    @Headers("x-request-id") xRequestId: string,
    @Query("data.id") dataId: string,
    @Body() body: { type?: string; action?: string; data?: { id?: string } },
  ) {
    const firmaValida = verificarFirmaMercadoPago({
      xSignatureHeader: xSignature,
      xRequestId,
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
    });
    if (!firmaValida) {
      // Rechazar sin procesar nada: un webhook con firma inválida no es de
      // Mercado Pago, y no hay que confiar en su payload.
      throw new UnauthorizedException("Firma de webhook inválida");
    }
    const tipo = body.type ?? "";
    const paymentId = dataId || body.data?.id || "";
    if (!paymentId) throw new BadRequestException("Falta data.id en la notificación");
    return this.pagos.manejarWebhookMercadoPago(tipo, paymentId);
  }

  // El cliente ya eligió veterinario (asignar() dejó el caso ASIGNADO) —
  // acá se crea la preferencia de Mercado Pago y se le devuelve la URL de
  // checkout para redirigir su navegador.
  // medioPago en el body, opcional (default Mercado Pago — el medio
  // principal, Sergio 2026-09-30, "el medio principal es mercado pago
  // siempre"). PayPal es la alternativa, no el default.
  @Post(":casoId/checkout")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  crearCheckout(
    @Param("casoId") casoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body("medioPago") medioPago?: "MERCADO_PAGO" | "PAYPAL",
  ) {
    return this.pagos.crearCheckout(casoId, usuario.id, medioPago ?? "MERCADO_PAGO");
  }

  @Post(":casoId/liquidar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  liquidar(@Param("casoId") casoId: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagos.liquidarSegunCierre(casoId, usuario.id);
  }

  // Botón "Reconciliar pagos pendientes" en /admin — reintenta la
  // liquidación de todo caso CERRADO cuyo pago haya quedado colgado en
  // AUTORIZADO (ver comentario en PagosService.reconciliarPagosPendientes
  // sobre por qué esto es un botón manual y no un cron in-process).
  @Post("reconciliar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  reconciliar() {
    return this.pagos.reconciliarPagosPendientes();
  }

  // Lista de pagos con un monto pendiente de acción manual (NO_COMPLETADO o
  // disputa de calidad con lugar) — ver comentarios en
  // PagosService.liquidarSegunCierre / reembolsarCargoPlataforma.
  @Get("accion-manual-pendiente")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  accionManualPendiente() {
    return this.pagos.listarConAccionManualPendiente();
  }

  // El propio veterinario inicia la conexión de su cuenta de Mercado Pago
  // (Split 1:1) — requiere estar logueado, nunca un state adivinable.
  @Get("mercadopago/oauth/iniciar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  iniciarOAuth(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagos.iniciarOAuthMercadoPago(usuario.id);
  }

  // Público: Mercado Pago redirige acá el navegador del veterinario, no
  // puede mandar un Bearer token — la seguridad la da el "state" firmado,
  // no un guard de sesión.
  @Get("mercadopago/oauth/callback")
  async callbackOAuth(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) throw new BadRequestException("Faltan code o state");
    await this.pagos.manejarCallbackOAuthMercadoPago(code, state);

    const destino = process.env.WEB_APP_URL ?? "http://localhost:3000";
    res.redirect(`${destino}/veterinario/cobros?mercadopago=conectado`);
  }

  // Público — acá es donde PayPal redirige el navegador del cliente
  // después de que aprueba el pago (return_url armada en
  // PagosService.crearCheckoutPayPal). La captura efectiva de la plata es
  // ESTA llamada de servidor (no algo que ya haya pasado antes) — recién
  // confirmada acá se redirige a /pago/exito o /pago/fallo, para que esa
  // pantalla (que ya sabía leer Pago.estado en vivo) no necesite ningún
  // cambio.
  @Get("paypal/capturar")
  async capturarPayPal(@Query("token") token: string, @Query("casoId") casoId: string, @Res() res: Response) {
    const destino = process.env.WEB_APP_URL ?? "http://localhost:3000";
    if (!token || !casoId) {
      return res.redirect(`${destino}/pago/fallo?casoId=${casoId ?? ""}`);
    }
    try {
      const pago = await this.pagos.capturarPagoPayPal(casoId, token);
      const exito = pago.estado === "AUTORIZADO" || pago.estado === "CAPTURADO";
      res.redirect(`${destino}/pago/${exito ? "exito" : "fallo"}?casoId=${casoId}`);
    } catch (e) {
      this.logger.error(`No se pudo capturar el pago de PayPal del caso ${casoId}: ${e instanceof Error ? e.message : e}`);
      res.redirect(`${destino}/pago/fallo?casoId=${casoId}`);
    }
  }

  // Webhook de PayPal — respaldo de reconciliación (ver comentario en
  // PagosService.manejarWebhookPayPal). Verificación de firma vía la API
  // oficial de PayPal (no un HMAC calculado local), así que no hace falta
  // configurar acceso al body crudo en Nest — se le manda a PayPal el body
  // ya parseado por @Body(), tal cual la documentación oficial permite.
  @Post("webhooks/paypal")
  async webhookPayPal(
    @Headers("paypal-transmission-id") transmissionId: string,
    @Headers("paypal-transmission-time") transmissionTime: string,
    @Headers("paypal-cert-url") certUrl: string,
    @Headers("paypal-auth-algo") authAlgo: string,
    @Headers("paypal-transmission-sig") transmissionSig: string,
    @Body() body: { event_type?: string; resource?: { id?: string; custom_id?: string } },
  ) {
    const firmaValida = await verificarFirmaWebhookPayPal(
      {
        "paypal-transmission-id": transmissionId,
        "paypal-transmission-time": transmissionTime,
        "paypal-cert-url": certUrl,
        "paypal-auth-algo": authAlgo,
        "paypal-transmission-sig": transmissionSig,
      },
      body,
      process.env.PAYPAL_WEBHOOK_ID ?? "",
    );
    if (!firmaValida) {
      throw new UnauthorizedException("Firma de webhook de PayPal inválida");
    }
    return this.pagos.manejarWebhookPayPal(body);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("pagos")
export class PagosController {
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
  @Post(":casoId/checkout")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  crearCheckout(@Param("casoId") casoId: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagos.crearCheckout(casoId, usuario.id);
  }

  @Post(":casoId/liquidar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  liquidar(@Param("casoId") casoId: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagos.liquidarSegunCierre(casoId, usuario.id);
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
}

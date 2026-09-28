import { Body, Controller, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { PagosService } from "./pagos.service";
import { verificarFirmaMercadoPago } from "../../common/mercadopago-webhook.util";

@Controller("pagos")
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post("webhooks/mercado-pago")
  webhookMercadoPago(
    @Headers("x-signature") xSignature: string,
    @Headers("x-request-id") xRequestId: string,
    @Query("data.id") dataId: string,
    @Body() body: { casoId: string; mercadoPagoPaymentId: string },
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
    return this.pagos.manejarWebhookMercadoPago(body);
  }

  @Post(":casoId/liquidar")
  liquidar(@Param("casoId") casoId: string) {
    return this.pagos.liquidarSegunCierre(casoId);
  }
}

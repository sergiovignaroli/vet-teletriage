import { Body, Controller, Param, Post } from "@nestjs/common";
import { PagosService } from "./pagos.service";

@Controller("pagos")
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post("webhooks/mercado-pago")
  webhookMercadoPago(@Body() body: { casoId: string; mercadoPagoPaymentId: string }) {
    // TODO antes de producción: verificar la firma del webhook de Mercado
    // Pago (x-signature) antes de procesar nada — este stub confía en el
    // payload tal cual llega, que alcanza para desarrollo local pero no
    // para producción.
    return this.pagos.manejarWebhookMercadoPago(body);
  }

  @Post(":casoId/liquidar")
  liquidar(@Param("casoId") casoId: string) {
    return this.pagos.liquidarSegunCierre(casoId);
  }
}

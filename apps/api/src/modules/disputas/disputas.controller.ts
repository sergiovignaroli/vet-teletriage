import { Body, Controller, Param, Patch, Post } from "@nestjs/common";
import { DisputasService } from "./disputas.service";

@Controller("disputas")
export class DisputasController {
  constructor(private readonly disputas: DisputasService) {}

  @Post("identidad")
  abrirIdentidad(@Body() body: { veterinarioId: string; motivo: string }) {
    return this.disputas.abrirDisputaIdentidad(body.veterinarioId, body.motivo);
  }

  @Patch("identidad/:id/resolver")
  resolverIdentidad(
    @Param("id") id: string,
    @Body() body: { resolucion: string; restituirHabilitacion: boolean },
  ) {
    return this.disputas.resolverDisputaIdentidad(id, body.resolucion, body.restituirHabilitacion);
  }

  @Post("calidad")
  abrirCalidad(@Body() body: { casoId: string; motivo: string }) {
    return this.disputas.abrirDisputaCalidad(body.casoId, body.motivo);
  }

  @Patch("calidad/:id/resolver")
  resolverCalidad(@Param("id") id: string, @Body() body: { resolucion: string; hacerLugar: boolean }) {
    return this.disputas.resolverDisputaCalidad(id, body.resolucion, body.hacerLugar);
  }
}

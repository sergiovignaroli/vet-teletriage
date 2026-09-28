import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { DisputasService } from "./disputas.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";
import { AdminKeyGuard } from "../auth/admin-key.guard";

@Controller("disputas")
export class DisputasController {
  constructor(private readonly disputas: DisputasService) {}

  // Abrir una disputa de IDENTIDAD suspende cautelarmente al veterinario de
  // inmediato (ver disputas.service) — blast radius alto, así que esto NO
  // queda en manos de un cliente cualquiera con un motivo en texto libre.
  // Hasta que exista un rol de staff/compliance propio, la abre quien tenga
  // la clave de administración (ver admin-key.guard.ts).
  @Post("identidad")
  @UseGuards(AdminKeyGuard)
  abrirIdentidad(@Body() body: { veterinarioId: string; motivo: string }) {
    return this.disputas.abrirDisputaIdentidad(body.veterinarioId, body.motivo);
  }

  @Patch("identidad/:id/resolver")
  @UseGuards(AdminKeyGuard)
  resolverIdentidad(
    @Param("id") id: string,
    @Body() body: { resolucion: string; restituirHabilitacion: boolean },
  ) {
    return this.disputas.resolverDisputaIdentidad(id, body.resolucion, body.restituirHabilitacion);
  }

  // Una disputa de CALIDAD, en cambio, es exactamente lo que un cliente
  // debe poder iniciar sobre SU PROPIO caso — como mucho reembolsa el cargo
  // de plataforma (nunca el honorario), así que el blast radius es bajo.
  @Post("calidad")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  abrirCalidad(@CurrentUser() usuario: UsuarioAutenticado, @Body() body: { casoId: string; motivo: string }) {
    return this.disputas.abrirDisputaCalidad(usuario.id, body.casoId, body.motivo);
  }

  // Resolver sí o sí es una decisión de la plataforma, nunca del propio
  // cliente ni del propio veterinario.
  @Patch("calidad/:id/resolver")
  @UseGuards(AdminKeyGuard)
  resolverCalidad(@Param("id") id: string, @Body() body: { resolucion: string; hacerLugar: boolean }) {
    return this.disputas.resolverDisputaCalidad(id, body.resolucion, body.hacerLugar);
  }
}

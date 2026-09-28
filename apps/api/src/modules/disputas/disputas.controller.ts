import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { DisputasService } from "./disputas.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("disputas")
export class DisputasController {
  constructor(private readonly disputas: DisputasService) {}

  // Abrir una disputa de IDENTIDAD suspende cautelarmente al veterinario de
  // inmediato (ver disputas.service) — blast radius alto, así que esto NO
  // queda en manos de un cliente cualquiera con un motivo en texto libre:
  // solo staff (rol ADMIN), y queda firmado con su id, no con una clave
  // compartida.
  @Post("identidad")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  abrirIdentidad(@CurrentUser() admin: UsuarioAutenticado, @Body() body: { veterinarioId: string; motivo: string }) {
    return this.disputas.abrirDisputaIdentidad(body.veterinarioId, body.motivo, admin.id);
  }

  @Patch("identidad/:id/resolver")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  resolverIdentidad(
    @Param("id") id: string,
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() body: { resolucion: string; restituirHabilitacion: boolean },
  ) {
    return this.disputas.resolverDisputaIdentidad(id, body.resolucion, body.restituirHabilitacion, admin.id);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  resolverCalidad(
    @Param("id") id: string,
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() body: { resolucion: string; hacerLugar: boolean },
  ) {
    return this.disputas.resolverDisputaCalidad(id, body.resolucion, body.hacerLugar, admin.id);
  }
}

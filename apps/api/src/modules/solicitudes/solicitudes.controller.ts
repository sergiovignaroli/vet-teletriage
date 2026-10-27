import { Body, Controller, Get, Param, Post, Req, Sse, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { SolicitudesService } from "./solicitudes.service";
import { EventosService } from "./eventos.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("solicitudes")
export class SolicitudesController {
  constructor(
    private readonly solicitudes: SolicitudesService,
    private readonly eventos: EventosService,
  ) {}

  // ---- Cliente: el id sale siempre del JWT ----

  @Post("caso/:casoId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  crear(
    @Param("casoId") casoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: { veterinarioId: string; aceptoTerminos: boolean },
    @Req() req: Request,
  ) {
    return this.solicitudes.crear({
      casoId,
      clienteId: usuario.id,
      veterinarioId: body.veterinarioId,
      aceptoTerminos: body.aceptoTerminos,
      ip: req.ip,
    });
  }

  @Get("caso/:casoId/actual")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  actualDelCaso(@Param("casoId") casoId: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudes.actualDelCaso(casoId, usuario.id);
  }

  @Post(":id/cancelar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  cancelar(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudes.cancelarPorCliente(id, usuario.id);
  }

  // ---- Veterinario ----

  @Get("pendiente")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  pendiente(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudes.pendienteDelVeterinario(usuario.id);
  }

  // Canal en tiempo real (SSE). Se abre con fetch y el token en el header.
  @Sse("eventos")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  canal(@CurrentUser() usuario: UsuarioAutenticado): Observable<MessageEvent> {
    return this.eventos.suscribir(usuario.id);
  }

  @Post(":id/aceptar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  aceptar(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudes.aceptar(id, usuario.id);
  }

  @Post(":id/rechazar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  rechazar(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado, @Body("motivo") motivo?: string) {
    return this.solicitudes.rechazar(id, usuario.id, motivo);
  }
}

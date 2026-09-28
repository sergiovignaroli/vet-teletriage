import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CalificacionesService } from "./calificaciones.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("calificaciones")
export class CalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  registrar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: { veterinarioId: string; casoId: string; estrellas: number; comentario?: string },
  ) {
    return this.calificaciones.registrar(usuario.id, body.veterinarioId, body.casoId, body.estrellas, body.comentario);
  }

  // Público — el promedio y el ranking de un veterinario son información
  // que se muestra en el directorio antes de que el cliente se loguee.
  @Get("veterinario/:id/promedio")
  promedio(@Param("id") id: string) {
    return this.calificaciones.promedioDe(id);
  }

  @Get("veterinario/:id/puntos")
  puntos(@Param("id") id: string) {
    return this.calificaciones.puntosAcumulados(id);
  }
}

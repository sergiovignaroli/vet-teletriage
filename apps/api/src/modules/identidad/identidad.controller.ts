import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IdentidadService } from "./identidad.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("identidad")
export class IdentidadController {
  constructor(private readonly identidad: IdentidadService) {}

  @Post("iniciar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  iniciar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.identidad.iniciarVerificacion(usuario.id);
  }

  @Get(":id/estado")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  estado(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.identidad.consultarEstado(id, usuario.id);
  }
}

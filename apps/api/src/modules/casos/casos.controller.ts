import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CasosService } from "./casos.service";
import type { ClasificacionCierre } from "@vet-teletriage/types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("casos")
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  // El clienteId sale del JWT, nunca del body — si viniera del body,
  // cualquier cliente logueado podría abrir un caso "a nombre de" otro.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  crear(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: Omit<Parameters<CasosService["crear"]>[0], "clienteId">,
  ) {
    return this.casos.crear({ ...body, clienteId: usuario.id });
  }

  // Igual criterio: el veterinarioId que toma el caso es el que está
  // autenticado, no uno que el cliente (u otro vet) elija por él en el body.
  @Patch(":id/iniciar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  iniciar(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.casos.iniciarSesion(id, usuario.id);
  }

  @Patch(":id/cerrar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  cerrar(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body("clasificacion") clasificacion: ClasificacionCierre,
    @Body("notas") notas?: string,
  ) {
    return this.casos.cerrar(id, usuario.id, clasificacion, notas);
  }
}

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
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

  // Veterinarios conectados con el precio YA calculado para este caso
  // puntual (base del caso × margen de cada uno) y su rating — lo que el
  // CLIENTE ve para elegir, con costo total conocido antes de contratar.
  // El clienteId sale del JWT, no de un param, para que no pueda pedir la
  // lista de un caso ajeno.
  @Get(":id/para-elegir")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  paraElegir(@Param("id") id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.casos.paraElegir(id, usuario.id);
  }

  // El cliente elige — acá se congela el precio y se asigna el caso.
  @Patch(":id/asignar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE")
  asignar(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body("veterinarioId") veterinarioId: string,
  ) {
    return this.casos.asignar(id, usuario.id, veterinarioId);
  }

  // Casos de ESTE veterinario — el id sale del JWT, nunca de un query
  // param, para que no pueda pedir la lista de otro veterinario.
  @Get("mios")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  misCasos(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.casos.misCasos(usuario.id);
  }

  // El veterinario confirma el inicio de un caso que el cliente ya le
  // asignó — el veterinarioId sale del JWT, nunca del body.
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

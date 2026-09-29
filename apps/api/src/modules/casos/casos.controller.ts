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

  // Casos sin veterinario asignado — lo que un veterinario ve al entrar a
  // buscar trabajo (Fase 1: dispatch manual, no hay matching automático).
  @Get("disponibles")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  disponibles(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.casos.disponibles(usuario.id);
  }

  // Casos de ESTE veterinario — el id sale del JWT, nunca de un query
  // param, para que no pueda pedir la lista de otro veterinario.
  @Get("mios")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  misCasos(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.casos.misCasos(usuario.id);
  }

  // Igual criterio: el veterinarioId que toma el caso es el que está
  // autenticado, no uno que el cliente (u otro vet) elija por él en el body.
  // honorarioDeclarado lo declara el veterinario acá mismo, al tomar el
  // caso (Sección 4: "lo fija el veterinario, libremente").
  @Patch(":id/iniciar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  iniciar(
    @Param("id") id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body("honorarioDeclarado") honorarioDeclarado: number,
  ) {
    return this.casos.iniciarSesion(id, usuario.id, honorarioDeclarado);
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

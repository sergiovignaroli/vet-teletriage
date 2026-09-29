import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { VeterinariosService } from "./veterinarios.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

@Controller("veterinarios")
export class VeterinariosController {
  constructor(private readonly veterinarios: VeterinariosService) {}

  @Get("disponibles")
  buscarDisponibles(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("radioKm") radioKm = "15",
  ) {
    return this.veterinarios.buscarDisponibles({
      lat: Number(lat),
      lng: Number(lng),
      radioKm: Number(radioKm),
    });
  }

  // El id sale del JWT, nunca del body — mismo criterio que el resto de la
  // app: un veterinario solo puede conectar/desconectar su propia cuenta.
  @Patch("conectar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  conectar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.veterinarios.conectar(usuario.id);
  }

  @Patch("desconectar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  desconectar(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.veterinarios.desconectar(usuario.id);
  }

  // Cola de excepciones del panel admin — veterinarios que NO se
  // auto-habilitaron al aprobar Truora (ver identidad.service.ts).
  @Get("pendientes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  pendientes() {
    return this.veterinarios.listarPendientes();
  }

  // Blast radius alto (deja conectar y tomar casos reales) — solo ADMIN,
  // nunca el propio veterinario. El id va por param, no por JWT, porque
  // acá quien actúa (el admin) no es el mismo que el afectado.
  @Patch(":id/habilitar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  habilitar(@Param("id") id: string) {
    return this.veterinarios.habilitarManualmente(id);
  }

  @Patch("margen")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  ajustarMargen(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body("margenPorcentaje") margenPorcentaje: number,
  ) {
    return this.veterinarios.ajustarMargen(usuario.id, margenPorcentaje);
  }
}

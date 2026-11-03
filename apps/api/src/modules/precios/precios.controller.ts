import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import type { ClaveTarifa, TarifaCelda } from "@vet-teletriage/types";
import { PreciosService } from "./precios.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

// Precios propios del veterinario y panel de precios del dueño (Sergio,
// 2026-11-03). Todas las rutas exigen sesión; el id de quien opera sale del
// JWT, nunca del body.
@Controller("precios")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreciosController {
  constructor(private readonly precios: PreciosService) {}

  // --- Veterinario ---------------------------------------------------------
  @Get("mis-precios")
  @Roles("VETERINARIO")
  misPrecios(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.precios.misPrecios(usuario.id);
  }

  @Post("mis-precios/aviso")
  @Roles("VETERINARIO")
  aceptarAviso(@CurrentUser() usuario: UsuarioAutenticado, @Body("version") version: string) {
    return this.precios.aceptarAviso(usuario.id, version);
  }

  @Put("mis-precios")
  @Roles("VETERINARIO")
  guardarMisPrecios(@CurrentUser() usuario: UsuarioAutenticado, @Body() cuerpo: Partial<Record<ClaveTarifa, number | null>>) {
    return this.precios.guardarMisPrecios(usuario.id, cuerpo ?? {});
  }

  // --- Dueño ---------------------------------------------------------------
  @Get("admin")
  @Roles("ADMIN")
  panel(@Query("pais") pais = "AR") {
    return this.precios.panel(pais);
  }

  @Put("admin/tarifas")
  @Roles("ADMIN")
  guardarTarifas(
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() cuerpo: { pais: string; tarifas: Partial<Record<ClaveTarifa, TarifaCelda>> },
  ) {
    return this.precios.guardarTarifas(admin.id, cuerpo.pais, cuerpo.tarifas ?? {});
  }

  @Post("admin/ajuste")
  @Roles("ADMIN")
  ajuste(
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() cuerpo: { pais: string; porcentaje: number; claves?: ClaveTarifa[]; aplicar?: boolean },
  ) {
    return this.precios.ajustePorcentual(admin.id, cuerpo.pais, cuerpo.porcentaje, cuerpo.claves, cuerpo.aplicar === true);
  }

  @Put("admin/comision")
  @Roles("ADMIN")
  comision(
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() cuerpo: { porcentajePlataforma?: number; cargoMinimoDiurno?: number; cargoMinimoNocturno?: number },
  ) {
    return this.precios.guardarComision(admin.id, cuerpo);
  }

  @Put("admin/regla")
  @Roles("ADMIN")
  regla(
    @CurrentUser() admin: UsuarioAutenticado,
    @Body() cuerpo: { pais: string; inicioDiurno?: string; finDiurno?: string; domingoNocturno?: boolean; feriadoNocturno?: boolean },
  ) {
    return this.precios.guardarRegla(admin.id, cuerpo.pais, cuerpo);
  }

  @Post("admin/feriados")
  @Roles("ADMIN")
  agregarFeriado(@CurrentUser() admin: UsuarioAutenticado, @Body() cuerpo: { pais: string; fecha: string; nombre: string }) {
    return this.precios.agregarFeriado(admin.id, cuerpo.pais, cuerpo.fecha, cuerpo.nombre);
  }

  @Delete("admin/feriados/:id")
  @Roles("ADMIN")
  quitarFeriado(@CurrentUser() admin: UsuarioAutenticado, @Param("id") id: string) {
    return this.precios.quitarFeriado(admin.id, id);
  }

  @Get("admin/historial")
  @Roles("ADMIN")
  historial() {
    return this.precios.historial();
  }
}

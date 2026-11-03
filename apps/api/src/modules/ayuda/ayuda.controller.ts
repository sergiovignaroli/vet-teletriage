import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";
import { AyudaService } from "./ayuda.service";

// Centro de ayuda: las guías son texto fijo en la web; acá solo viven las
// preguntas nuevas. Quien pregunta es siempre el usuario autenticado (nunca un
// id que venga en el body) y solo ve las suyas.
@Controller("ayuda")
export class AyudaController {
  constructor(private readonly ayuda: AyudaService) {}

  @Post("preguntas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE", "VETERINARIO")
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  crear(@CurrentUser() u: UsuarioAutenticado, @Body() body: { texto?: string }) {
    return this.ayuda.crear(u.rol as "CLIENTE" | "VETERINARIO", u.id, body?.texto);
  }

  @Get("preguntas/mias")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE", "VETERINARIO")
  mias(@CurrentUser() u: UsuarioAutenticado) {
    return this.ayuda.mias(u.id);
  }

  @Get("preguntas")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  listar() {
    return this.ayuda.listarParaAdmin();
  }

  @Patch("preguntas/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  responder(@Param("id") id: string, @CurrentUser() admin: UsuarioAutenticado, @Body() body: { respuesta?: string }) {
    return this.ayuda.responder(id, admin.id, body?.respuesta);
  }
}

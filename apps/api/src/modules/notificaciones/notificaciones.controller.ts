import { BadRequestException, Body, Controller, Get, Headers, Patch, Post, UseGuards } from "@nestjs/common";
import { NotificacionesService } from "./notificaciones.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "../auth/current-user.decorator";

interface SuscripcionPush {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Controller("notificaciones")
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  // La clave pública no es secreta: el navegador la necesita para suscribirse.
  @Get("push/clave")
  clave() {
    return { clavePublica: this.notificaciones.obtenerClavePublica() };
  }

  @Get("push/estado")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  async estado(@CurrentUser() usuario: UsuarioAutenticado) {
    return { dispositivos: await this.notificaciones.cantidadDeDispositivos(usuario.id) };
  }

  @Post("push/suscribir")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  suscribir(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: SuscripcionPush,
    @Headers("user-agent") userAgent?: string,
  ) {
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      throw new BadRequestException("Suscripción inválida");
    }
    return this.notificaciones.suscribir(usuario.id, body, userAgent);
  }

  @Post("push/desuscribir")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  desuscribir(@CurrentUser() usuario: UsuarioAutenticado, @Body("endpoint") endpoint: string) {
    if (!endpoint) throw new BadRequestException("Falta el dispositivo");
    return this.notificaciones.desuscribir(usuario.id, endpoint);
  }

  @Post("push/probar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  async probar(@CurrentUser() usuario: UsuarioAutenticado) {
    const enviados = await this.notificaciones.avisar(usuario.id, {
      titulo: "Aviso de prueba",
      cuerpo: "Así vas a recibir las consultas nuevas en este dispositivo.",
      url: "/panel-veterinario",
      etiqueta: "prueba",
      vigenciaSegundos: 60,
    });
    return { enviados };
  }

  @Get("preferencias")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  preferencias(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.notificaciones.obtenerPreferencias(usuario.id);
  }

  @Patch("preferencias")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  guardarPreferencias(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() body: { avisarPorWhatsapp?: boolean; avisarPorEmail?: boolean; telefono?: string },
  ) {
    return this.notificaciones.guardarPreferencias(usuario.id, body ?? {});
  }
}

import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ConfiguracionService, CambiosConfiguracion } from "./configuracion.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("configuracion")
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  // Pública a propósito (sin guard): la usan el footer/contacto de
  // apps/web (email, redes) y — potencialmente — cualquier pantalla que
  // necesite un precio ya calculado por el backend. No expone nada que no
  // pudiera verse igual usando el producto (Sergio, 2026-09-30: lo que no
  // quiere es que el precio aparezca DESTACADO en la landing, no que sea
  // un secreto — de hecho tiene que estar en los Términos y Condiciones).
  @Get()
  obtener() {
    return this.configuracion.obtener();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  actualizar(@Body() cambios: CambiosConfiguracion) {
    return this.configuracion.actualizar(cambios);
  }
}

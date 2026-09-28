import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "./current-user.decorator";
import { AdminKeyGuard } from "./admin-key.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("veterinario/registrar")
  registrarVeterinario(@Body() body: Parameters<AuthService["registrarVeterinario"]>[0]) {
    return this.auth.registrarVeterinario(body);
  }

  @Post("veterinario/login")
  loginVeterinario(@Body() body: { email: string; password: string }) {
    return this.auth.loginVeterinario(body.email, body.password);
  }

  @Post("veterinario/revocar-sesiones")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  revocarSesionesVeterinario(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.auth.revocarSesionesVeterinario(usuario.id);
  }

  @Post("cliente/otp/solicitar")
  solicitarOtp(@Body("telefono") telefono: string) {
    return this.auth.solicitarOtpCliente(telefono);
  }

  @Post("cliente/otp/verificar")
  verificarOtp(@Body() body: { telefono: string; codigo: string }) {
    return this.auth.verificarOtpCliente(body.telefono, body.codigo);
  }

  // Sin alta pública — solo quien tenga ADMIN_API_KEY puede crear la primera
  // (y siguientes) cuentas de staff. Una vez creada, entra por login normal.
  @Post("admin/registrar")
  @UseGuards(AdminKeyGuard)
  registrarAdmin(@Body() body: { nombre: string; email: string; password: string }) {
    return this.auth.registrarAdmin(body.nombre, body.email, body.password);
  }

  @Post("admin/login")
  loginAdmin(@Body() body: { email: string; password: string }) {
    return this.auth.loginAdmin(body.email, body.password);
  }
}

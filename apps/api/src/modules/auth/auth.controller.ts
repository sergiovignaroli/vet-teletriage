import { Body, Controller, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { CurrentUser, UsuarioAutenticado } from "./current-user.decorator";
import { AdminKeyGuard } from "./admin-key.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Anti spam de altas: 5 registros por hora por IP.
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post("veterinario/registrar")
  registrarVeterinario(@Body() body: Parameters<AuthService["registrarVeterinario"]>[0]) {
    return this.auth.registrarVeterinario(body);
  }

  // Anti fuerza bruta: 10 intentos por minuto por IP.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("veterinario/login")
  loginVeterinario(@Body() body: { email: string; password: string }) {
    return this.auth.loginVeterinario(body.email, body.password);
  }

  // Públicos: el que sirve de credencial es el propio token de renovación.
  // Renovación de sesión: 30 por minuto por IP.
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("veterinario/renovar")
  renovarVeterinario(@Body("refreshToken") refreshToken: string) {
    return this.auth.renovarSesionVeterinario(refreshToken);
  }

  @Post("veterinario/cerrar-sesion")
  cerrarSesionVeterinario(@Body("refreshToken") refreshToken: string) {
    return this.auth.cerrarSesionVeterinario(refreshToken);
  }

  @Post("veterinario/revocar-sesiones")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("VETERINARIO")
  revocarSesionesVeterinario(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.auth.revocarSesionesVeterinario(usuario.id);
  }

  // Cada código cuesta un mensaje de WhatsApp: 5 pedidos cada 10 min por IP (anti abuso de costos).
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  @Post("cliente/otp/solicitar")
  solicitarOtp(@Body("telefono") telefono: string) {
    return this.auth.solicitarOtpCliente(telefono);
  }

  // Anti adivinanza del código: 15 intentos cada 10 min por IP.
  @Throttle({ default: { limit: 15, ttl: 600000 } })
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

  // Admin: 5 intentos por minuto por IP.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("admin/login")
  loginAdmin(@Body() body: { email: string; password: string }) {
    return this.auth.loginAdmin(body.email, body.password);
  }

  // Se llama al terminar (o saltar) el onboarding de 3 pantallas dentro de
  // la app. El rol sale del JWT — nunca del body — así que un cliente no
  // puede marcar el onboarding de otro ni tocar el de un veterinario.
  @Patch("onboarding-completado")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENTE", "VETERINARIO")
  marcarOnboardingCompletado(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.auth.marcarOnboardingCompletado(usuario);
  }
}

import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

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

  @Post("cliente/otp/solicitar")
  solicitarOtp(@Body("telefono") telefono: string) {
    return this.auth.solicitarOtpCliente(telefono);
  }

  @Post("cliente/otp/verificar")
  verificarOtp(@Body() body: { telefono: string; codigo: string }) {
    return this.auth.verificarOtpCliente(body.telefono, body.codigo);
  }
}

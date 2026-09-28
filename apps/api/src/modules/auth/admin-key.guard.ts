import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";

// Ya NO protege el día a día de disputas — eso ahora es JWT + rol ADMIN
// (cuentas de staff individuales, con auditoría de quién resolvió qué; ver
// Admin en schema.prisma y disputas.controller.ts). Lo único que queda
// detrás de esta clave compartida es AuthController.registrarAdmin: cómo se
// crea la PRIMERA cuenta de staff sin exponer un alta pública de admins.
// Requiere el header `x-admin-key` con el valor de ADMIN_API_KEY (.env).
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const claveConfigurada = process.env.ADMIN_API_KEY;
    if (!claveConfigurada) {
      // Fail-closed: sin clave configurada, nadie entra — nunca "abierto por defecto".
      throw new UnauthorizedException("ADMIN_API_KEY no configurada");
    }

    const request = context.switchToHttp().getRequest();
    const claveRecibida: string | undefined = request.headers["x-admin-key"];
    if (!claveRecibida) throw new UnauthorizedException("Falta el header x-admin-key");

    const bufEsperado = Buffer.from(claveConfigurada);
    const bufRecibido = Buffer.from(claveRecibida);
    const esValida =
      bufEsperado.length === bufRecibido.length && timingSafeEqual(bufEsperado, bufRecibido);

    if (!esValida) throw new UnauthorizedException("x-admin-key inválida");
    return true;
  }
}

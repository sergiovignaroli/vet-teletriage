import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "crypto";

// STOPGAP, no un sistema de roles de staff: no existe todavía un modelo
// "Admin" con su propio login (eso es un desarrollo aparte, con su propia
// superficie de auditoría). Mientras tanto, esto es lo mínimo para que
// resolver una disputa de identidad o de calidad NO quede abierto a
// cualquier veterinario o cliente autenticado — que es exactamente el
// agujero que había antes de este cambio: un veterinario podía, en teoría,
// "resolver" su propia disputa de identidad y reincorporarse solo.
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

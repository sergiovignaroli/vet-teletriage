import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, Rol } from "./roles.decorator";

// Se ejecuta SIEMPRE después de JwtAuthGuard (@UseGuards(JwtAuthGuard, RolesGuard))
// — depende de que request.user ya exista.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !rolesRequeridos.includes(user.rol)) {
      throw new ForbiddenException("Tu rol no tiene permiso para esta acción");
    }
    return true;
  }
}

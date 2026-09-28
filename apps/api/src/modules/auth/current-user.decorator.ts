import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Rol } from "./roles.decorator";

export interface UsuarioAutenticado {
  id: string;
  rol: Rol;
}

// Extrae el usuario ya autenticado por JwtStrategy — nunca leer el id del
// caller desde el body/query en un endpoint protegido (esa era exactamente
// la falla que dejaba abierto crear casos o calificar en nombre de otro).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

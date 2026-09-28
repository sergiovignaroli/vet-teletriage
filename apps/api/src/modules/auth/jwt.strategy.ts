import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsuarioAutenticado } from "./current-user.decorator";

interface JwtPayload {
  sub: string;
  rol: "VETERINARIO" | "CLIENTE";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Fallar al arrancar, no en el primer request — un JWT_SECRET vacío
      // significa que cualquier token (incluso uno inventado) validaría.
      throw new Error("JWT_SECRET no configurado en .env");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): UsuarioAutenticado {
    if (!payload?.sub || !payload?.rol) {
      throw new UnauthorizedException("Token inválido");
    }
    return { id: payload.sub, rol: payload.rol };
  }
}

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma.service";
import { UsuarioAutenticado } from "./current-user.decorator";

interface JwtPayload {
  sub: string;
  rol: "VETERINARIO" | "CLIENTE" | "ADMIN";
  tv: number; // tokenVersion al momento de firmar
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
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

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    if (!payload?.sub || !payload?.rol) {
      throw new UnauthorizedException("Token inválido");
    }

    // Revocación sin blacklist: si tokenVersion en la base ya avanzó (logout
    // forzado, password rotada), un token viejo con "tv" desactualizado deja
    // de servir aunque no haya expirado — ver AuthService.revocarSesiones*.
    const tokenVersionActual = await this.obtenerTokenVersion(payload.sub, payload.rol);
    if (tokenVersionActual === null) {
      throw new UnauthorizedException("Usuario no encontrado");
    }
    if (tokenVersionActual !== payload.tv) {
      throw new UnauthorizedException("Sesión revocada — volvé a loguearte");
    }

    return { id: payload.sub, rol: payload.rol };
  }

  private async obtenerTokenVersion(id: string, rol: JwtPayload["rol"]): Promise<number | null> {
    switch (rol) {
      case "VETERINARIO": {
        const v = await this.prisma.veterinario.findUnique({ where: { id }, select: { tokenVersion: true } });
        return v?.tokenVersion ?? null;
      }
      case "CLIENTE": {
        const c = await this.prisma.cliente.findUnique({ where: { id }, select: { tokenVersion: true } });
        return c?.tokenVersion ?? null;
      }
      case "ADMIN": {
        const a = await this.prisma.admin.findUnique({ where: { id }, select: { tokenVersion: true } });
        return a?.tokenVersion ?? null;
      }
      default:
        return null;
    }
  }
}

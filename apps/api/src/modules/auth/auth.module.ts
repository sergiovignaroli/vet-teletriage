import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaService } from "../../prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // 12h para veterinarios en jornada, igual de válido para el token de
      // cliente de una sesión de teletriage puntual — no hay refresh token
      // todavía; re-loguear cada 12h es una fricción aceptable para el MVP.
      signOptions: { expiresIn: "12h" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
  exports: [RolesGuard],
})
export class AuthModule {}

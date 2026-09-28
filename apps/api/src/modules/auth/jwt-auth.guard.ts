import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Un solo guard reusado en toda la app — si mañana cambia el mecanismo
// (ej. rotación de tokens, blacklist de logout), se toca acá una sola vez.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}

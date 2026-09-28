import { SetMetadata } from "@nestjs/common";

export type Rol = "VETERINARIO" | "CLIENTE" | "ADMIN";

export const ROLES_KEY = "roles";

// Marca qué rol(es) puede llamar un endpoint. Se combina siempre con
// JwtAuthGuard (primero autentica, después RolesGuard chequea el rol) —
// nunca se usa RolesGuard solo, porque sin JwtAuthGuard no hay request.user.
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

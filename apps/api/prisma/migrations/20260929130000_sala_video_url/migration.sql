-- Sala de video del caso (Sergio, 2026-09-29). Nullable: sigue null hasta
-- que haya un proveedor real conectado (ver módulo `video`) — no es un
-- dato pendiente de cargar, es el estado honesto mientras no hay proveedor.

-- AlterTable
ALTER TABLE "Caso" ADD COLUMN "salaVideoUrl" TEXT;

-- Presencia de 3 estados y sesión larga del veterinario (Sergio, 2026-10-27).
-- Ver comentarios en schema.prisma. No borra ni cambia nada existente:
-- `disponible` se conserva y sigue siendo lo que lee la lista del cliente.

-- CreateEnum
CREATE TYPE "PresenciaVeterinario" AS ENUM ('CONECTADO', 'STAND_BY', 'DESCONECTADO');

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN "presencia" "PresenciaVeterinario" NOT NULL DEFAULT 'DESCONECTADO',
ADD COLUMN "ultimaSenal" TIMESTAMP(3);

-- Los que ya estaban conectados pasan a CONECTADO. `ultimaSenal` queda en
-- null a propósito: no se listan hasta que su panel mande el primer latido.
UPDATE "Veterinario" SET "presencia" = 'CONECTADO' WHERE "disponible" = true;

-- CreateTable
CREATE TABLE "SesionVeterinario" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEl" TIMESTAMP(3) NOT NULL,
    "ultimoUsoEl" TIMESTAMP(3),
    "revocadaEl" TIMESTAMP(3),

    CONSTRAINT "SesionVeterinario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SesionVeterinario_tokenHash_key" ON "SesionVeterinario"("tokenHash");

-- CreateIndex
CREATE INDEX "SesionVeterinario_veterinarioId_idx" ON "SesionVeterinario"("veterinarioId");

-- AddForeignKey
ALTER TABLE "SesionVeterinario" ADD CONSTRAINT "SesionVeterinario_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

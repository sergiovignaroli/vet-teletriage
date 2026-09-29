-- Precio calculado por la plataforma (cliente elige veterinario con costo
-- total conocido de antemano) en vez de honorario libre declarado por el
-- veterinario al tomar el caso. Ver comentarios en schema.prisma.

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN "margenPorcentaje" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Caso" ADD COLUMN "honorarioBase" DECIMAL(10,2);

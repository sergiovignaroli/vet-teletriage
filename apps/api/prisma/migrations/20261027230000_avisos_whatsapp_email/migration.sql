-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN "avisarPorWhatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "avisarPorEmail" BOOLEAN NOT NULL DEFAULT true;

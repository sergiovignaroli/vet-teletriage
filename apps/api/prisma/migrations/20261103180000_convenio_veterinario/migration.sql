-- Aceptación del convenio de adhesión del veterinario (versión, fecha e IP).
ALTER TABLE "Veterinario" ADD COLUMN "convenioVersion" TEXT;
ALTER TABLE "Veterinario" ADD COLUMN "convenioAceptadoEl" TIMESTAMP(3);
ALTER TABLE "Veterinario" ADD COLUMN "convenioIp" TEXT;

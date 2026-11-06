-- Seguro opcional
ALTER TABLE "Veterinario" ALTER COLUMN "seguroAseguradora" DROP NOT NULL;
ALTER TABLE "Veterinario" ALTER COLUMN "seguroPoliza" DROP NOT NULL;
ALTER TABLE "Veterinario" ALTER COLUMN "seguroVenceEl" DROP NOT NULL;

-- Documentación del veterinario
CREATE TYPE "TipoDocumentoVeterinario" AS ENUM ('DOCUMENTO_FRENTE', 'DOCUMENTO_DORSO', 'TITULO', 'HABILITACION');

CREATE TABLE "DocumentoVeterinario" (
    "id" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "tipo" "TipoDocumentoVeterinario" NOT NULL,
    "datos" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentoVeterinario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentoVeterinario_veterinarioId_tipo_key" ON "DocumentoVeterinario"("veterinarioId", "tipo");

ALTER TABLE "DocumentoVeterinario" ADD CONSTRAINT "DocumentoVeterinario_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

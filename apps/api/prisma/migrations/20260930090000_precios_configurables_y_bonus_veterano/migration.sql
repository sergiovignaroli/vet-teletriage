-- Precios editables desde el panel de administración (Sergio, 2026-09-30) en
-- vez de constantes fijas en el código, más el contador de sesiones que
-- alimenta el premio por volumen. Ver comentarios en schema.prisma.

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN "sesionesCompletadas" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ConfiguracionPlataforma" (
    "id" TEXT NOT NULL,
    "cargoPlataformaDiurna" DECIMAL(10,2) NOT NULL,
    "cargoPlataformaNocturna" DECIMAL(10,2) NOT NULL,
    "honorarioBaseNormal" DECIMAL(10,2) NOT NULL,
    "honorarioBaseUrgencia" DECIMAL(10,2) NOT NULL,
    "umbralSesionesVeterano" INTEGER NOT NULL,
    "bonusVeteranoPorcentaje" DECIMAL(5,2) NOT NULL,
    "emailContacto" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "actualizadoEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionPlataforma_pkey" PRIMARY KEY ("id")
);

-- Fila única, sembrada acá mismo con los valores que definió Sergio el
-- 2026-09-30 (ver el chat) — así producción arranca con precios reales
-- desde el primer deploy, nunca con un $0 o un null que cobre de más/menos
-- por accidente. ConfiguracionService.obtener() también sabe recrearla con
-- estos mismos valores si por algún motivo esta fila no existiera — pero no
-- debería hacer falta, ya queda creada acá.
INSERT INTO "ConfiguracionPlataforma" (
    "id",
    "cargoPlataformaDiurna",
    "cargoPlataformaNocturna",
    "honorarioBaseNormal",
    "honorarioBaseUrgencia",
    "umbralSesionesVeterano",
    "bonusVeteranoPorcentaje",
    "actualizadoEl"
) VALUES (
    'global',
    2200,
    3200,
    20000,
    35000,
    50,
    10,
    CURRENT_TIMESTAMP
);

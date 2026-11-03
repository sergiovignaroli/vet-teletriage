-- Precios propios del veterinario, por país (Sergio, 2026-11-03).
-- Todo es aditivo: columnas nuevas con valor por defecto o NULL y tablas
-- nuevas. No se borra ni se cambia nada de lo que ya existe.

-- CreateEnum
CREATE TYPE "TipoConsulta" AS ENUM ('NORMAL', 'URGENCIA');

-- AlterTable
ALTER TABLE "ConfiguracionPlataforma" ADD COLUMN "porcentajePlataforma" DECIMAL(5,2) NOT NULL DEFAULT 11;

-- AlterTable
ALTER TABLE "Veterinario"
  ADD COLUMN "pais" TEXT NOT NULL DEFAULT 'AR',
  ADD COLUMN "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  ADD COLUMN "precioNormalDiurno" DECIMAL(12,2),
  ADD COLUMN "precioNormalNocturno" DECIMAL(12,2),
  ADD COLUMN "precioUrgenciaDiurno" DECIMAL(12,2),
  ADD COLUMN "precioUrgenciaNocturno" DECIMAL(12,2),
  ADD COLUMN "avisoPreciosVersion" TEXT,
  ADD COLUMN "avisoPreciosAceptadoEl" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SolicitudAtencion"
  ADD COLUMN "honorarioOfrecido" DECIMAL(10,2),
  ADD COLUMN "cargoOfrecido" DECIMAL(10,2),
  ADD COLUMN "franjaOfrecida" "FranjaHoraria";

-- CreateTable
CREATE TABLE "TarifaPais" (
    "id" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "tipo" "TipoConsulta" NOT NULL,
    "franja" "FranjaHoraria" NOT NULL,
    "piso" DECIMAL(12,2) NOT NULL,
    "aconsejado" DECIMAL(12,2) NOT NULL,
    "techo" DECIMAL(12,2) NOT NULL,
    "actualizadaEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifaPais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglaPais" (
    "pais" TEXT NOT NULL,
    "zonaHoraria" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "inicioDiurno" TEXT NOT NULL,
    "finDiurno" TEXT NOT NULL,
    "domingoNocturno" BOOLEAN NOT NULL DEFAULT true,
    "feriadoNocturno" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ReglaPais_pkey" PRIMARY KEY ("pais")
);

-- CreateTable
CREATE TABLE "Feriado" (
    "id" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CambioPrecios" (
    "id" TEXT NOT NULL,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "antes" JSONB NOT NULL,
    "despues" JSONB NOT NULL,

    CONSTRAINT "CambioPrecios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TarifaPais_pais_tipo_franja_key" ON "TarifaPais"("pais", "tipo", "franja");

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_pais_fecha_key" ON "Feriado"("pais", "fecha");

-- Datos de arranque (Argentina). Ventana diurna 08:30-20:00 como estaba escrita
-- en el código; domingo y feriados nocturnos (Sergio, 2026-11-03).
INSERT INTO "ReglaPais" ("pais", "zonaHoraria", "moneda", "inicioDiurno", "finDiurno", "domingoNocturno", "feriadoNocturno")
VALUES ('AR', 'America/Argentina/Buenos_Aires', 'ARS', '08:30', '20:00', true, true);

-- Feriados nacionales de fin de 2026 verificados (La Nación, 30/04/2026).
-- Los de 2027 los carga el dueño desde el panel cuando se publiquen.
INSERT INTO "Feriado" ("id", "pais", "fecha", "nombre") VALUES
  ('feriado-ar-2026-11-23', 'AR', '2026-11-23', 'Día de la Soberanía Nacional'),
  ('feriado-ar-2026-12-08', 'AR', '2026-12-08', 'Inmaculada Concepción de María'),
  ('feriado-ar-2026-12-25', 'AR', '2026-12-25', 'Navidad');

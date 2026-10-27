-- Solicitudes de atención (Sergio, 2026-10-27). Ver comentarios en schema.prisma.
-- Agrega un tipo y una tabla; no cambia ni borra nada existente.

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CANCELADA_POR_CLIENTE');

-- CreateTable
CREATE TABLE "SolicitudAtencion" (
    "id" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "veterinarioId" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "vetEnConsulta" BOOLEAN NOT NULL DEFAULT false,
    "creadaEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEl" TIMESTAMP(3) NOT NULL,
    "respondidaEl" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "terminosVersion" TEXT NOT NULL,
    "terminosAceptadosEl" TIMESTAMP(3) NOT NULL,
    "terminosIp" TEXT,

    CONSTRAINT "SolicitudAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudAtencion_casoId_estado_idx" ON "SolicitudAtencion"("casoId", "estado");

-- CreateIndex
CREATE INDEX "SolicitudAtencion_veterinarioId_estado_idx" ON "SolicitudAtencion"("veterinarioId", "estado");

-- AddForeignKey
ALTER TABLE "SolicitudAtencion" ADD CONSTRAINT "SolicitudAtencion_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAtencion" ADD CONSTRAINT "SolicitudAtencion_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

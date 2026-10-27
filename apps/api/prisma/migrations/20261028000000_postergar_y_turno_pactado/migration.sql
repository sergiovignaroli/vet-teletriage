-- AlterEnum
ALTER TYPE "EstadoSolicitud" ADD VALUE 'POSTERGADA';
ALTER TYPE "EstadoSolicitud" ADD VALUE 'PACTADA';

-- AlterTable
ALTER TABLE "SolicitudAtencion" ADD COLUMN "propuestaPara" TIMESTAMP(3);

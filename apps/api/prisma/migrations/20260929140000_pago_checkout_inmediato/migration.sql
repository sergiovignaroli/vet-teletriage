-- Cobro inmediato vía Checkout Pro (Sergio, 2026-09-29): hasta ahora nada en
-- todo apps/api creaba nunca un registro Pago — liquidar()/webhook/reembolso
-- de disputa de calidad asumían uno existente que ninguna pantalla llegaba a
-- crear. Se agrega PENDIENTE (preferencia creada, cliente todavía no pagó) y
-- se renombra autorizadoEl -> creadoEl (ya no es "se autorizó un hold": el
-- registro se crea antes de que exista ningún pago real) + se suma pagadoEl
-- (cuando el webhook confirma el pago aprobado).

-- AlterEnum
ALTER TYPE "EstadoPago" ADD VALUE 'PENDIENTE';

-- AlterTable
ALTER TABLE "Pago" RENAME COLUMN "autorizadoEl" TO "creadoEl";
ALTER TABLE "Pago" ADD COLUMN "pagadoEl" TIMESTAMP(3);
ALTER TABLE "Pago" ADD COLUMN "mercadoPagoPreferenciaId" TEXT;
ALTER TABLE "Pago" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

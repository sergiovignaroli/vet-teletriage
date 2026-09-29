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

-- El "SET DEFAULT 'PENDIENTE'" se movió a la migración siguiente
-- (20260929140001_pago_default_pendiente): Postgres no permite usar un
-- valor de enum recién agregado (ALTER TYPE ... ADD VALUE, arriba) dentro
-- de la MISMA transacción que lo agrega — error real de Postgres "unsafe
-- use of new value of enum type", no una suposición. Cada migration.sql de
-- Prisma corre en su propia transacción, así que el DEFAULT tiene que ir en
-- una migración aparte que corra después de que ésta ya haya confirmado
-- (commit) el nuevo valor del enum. Esto fue lo que hizo fallar el deploy a
-- producción del 2026-09-29 (ver README).

-- Segunda mitad de 20260929140000_pago_checkout_inmediato (Sergio,
-- 2026-09-29): el DEFAULT solo puede fijarse acá porque para este momento
-- la migración anterior ya confirmó (commit) el nuevo valor 'PENDIENTE'
-- del enum EstadoPago — recién ahí Postgres permite usarlo. Ver el
-- comentario en esa migración para el detalle del error que esto evita.

-- AlterTable
ALTER TABLE "Pago" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

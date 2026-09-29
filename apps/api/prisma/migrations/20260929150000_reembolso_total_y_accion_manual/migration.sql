-- Corrección (Sergio, 2026-09-29): un reembolso de un pago con split se
-- reparte PROPORCIONALMENTE entre vendedor y marketplace (verificado contra
-- la documentación oficial) — no hay forma de que Mercado Pago le devuelva
-- el 100% al vendedor y solo una parte a la plataforma en una sola llamada,
-- y dos llamadas independientes contra dos access_token no se pudo
-- verificar. Se separa: NO_COMPLETADO pasa a reembolso TOTAL (100%,
-- operación simple y segura, ejecutada automático) + el monto que la
-- plataforma retiene queda anotado para ejecución manual, no automatizado.

-- AlterEnum
ALTER TYPE "EstadoPago" ADD VALUE 'REEMBOLSADO_TOTAL';

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN "montoPendienteAccionManual" DECIMAL(10,2);
ALTER TABLE "Pago" ADD COLUMN "notaAccionManual" TEXT;

-- PayPal como medio de pago/cobro alternativo (Sergio, 2026-09-30) — arma
-- "PayPal Payouts, dos pasos": el cliente le paga el total a la cuenta
-- PROPIA de la plataforma vía PayPal Orders v2 (Pago.paypalOrderId /
-- paypalCaptureId, ya existía el primero, se agrega el segundo) y la
-- plataforma le manda, aparte, el honorario al veterinario vía PayPal
-- Payouts (Veterinario.paypalEmail) recién al cerrar el caso con éxito.
-- Ver comentarios en schema.prisma y en pagos.service.ts.
--
-- PayPal no soporta ARS (verificado contra developer.paypal.com/reports/
-- reference/supported-currencies) — de ahí Pago.moneda y el precio fijo en
-- USD en ConfiguracionPlataforma, independiente del precio en pesos de
-- Mercado Pago.

-- CreateEnum
CREATE TYPE "MonedaPago" AS ENUM ('ARS', 'USD');

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN "paypalEmail" TEXT;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN "paypalCaptureId" TEXT;
ALTER TABLE "Pago" ADD COLUMN "moneda" "MonedaPago" NOT NULL DEFAULT 'ARS';

-- AlterTable: se agregan NOT NULL sin default fijo en el schema porque
-- Sergio tiene que definir estos tres precios — se completan acá mismo con
-- valores de arranque razonables (mismo criterio que la migración de
-- 2026-09-30 anterior con los precios en ARS) para que el Blueprint no
-- rompa en el primer deploy; quedan editables desde /admin/precios como
-- cualquier otro precio.
ALTER TABLE "ConfiguracionPlataforma" ADD COLUMN "honorarioPaypalNormalUsd" DECIMAL(10,2) NOT NULL DEFAULT 25;
ALTER TABLE "ConfiguracionPlataforma" ADD COLUMN "honorarioPaypalUrgenciaUsd" DECIMAL(10,2) NOT NULL DEFAULT 40;
ALTER TABLE "ConfiguracionPlataforma" ADD COLUMN "cargoPlataformaPaypalUsd" DECIMAL(10,2) NOT NULL DEFAULT 5;

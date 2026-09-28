-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DisputaCalidad" ADD COLUMN     "resueltaPorAdminId" TEXT;

-- AlterTable
ALTER TABLE "DisputaIdentidad" ADD COLUMN     "abiertaPorAdminId" TEXT,
ADD COLUMN     "resueltaPorAdminId" TEXT;

-- AlterTable
ALTER TABLE "Veterinario" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "creadoEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
